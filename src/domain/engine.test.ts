import {describe,it,expect} from 'vitest';
import {makeSeed} from './seed';
import {applyCommand} from './engine';
import {available,forWarehouse,freeInBin,receiptRemaining,stockIn,shelfBins,reserved} from './selectors';
const main='wh-01',east='wh-02';const scoped=(s:ReturnType<typeof makeSeed>,id=main)=>forWarehouse(s,id);
const sku=(s:ReturnType<typeof makeSeed>,code:string)=>s.products.find(p=>p.sku===code)!;

describe('warehouse transaction invariants',()=>{
 it('receiving and putaway keep warehouse stock balanced',()=>{
  let s=makeSeed();const p=sku(s,'FL-101'),before=available(scoped(s),p.id);const dock=stockIn(scoped(s),p.id,'RECEIVING');
  s=applyCommand(s,{type:'receipt.create',warehouseId:main,supplier:'Trail Works',lines:[{productId:p.id,quantity:12}]});
  expect(stockIn(scoped(s),p.id,'RECEIVING')).toBe(dock+12);expect(available(scoped(s),p.id)).toBe(before);
  const receipt=s.receipts.find(r=>r.supplier==='Trail Works')!;
  s=applyCommand(s,{type:'receipt.putaway',warehouseId:main,receiptId:receipt.id,receiptLineId:receipt.lines[0].id,quantity:12,bin:'A-01'});
  expect(stockIn(scoped(s),p.id,'RECEIVING')).toBe(dock);expect(available(scoped(s),p.id)).toBe(before+12);expect(receiptRemaining(s.receipts.find(r=>r.id===receipt.id)!)).toBe(0);
 });
 it('reserves, picks, packs, ships and cannot ship twice',()=>{
  let s=makeSeed();const p=sku(s,'FL-101'),before=available(scoped(s),p.id);
  s=applyCommand(s,{type:'order.create',warehouseId:main,customer:'Trail Club',lines:[{productId:p.id,quantity:5}]});
  expect(available(scoped(s),p.id)).toBe(before-5);const o=s.orders.find(r=>r.customer==='Trail Club')!;
  s=applyCommand(s,{type:'order.pick',warehouseId:main,orderId:o.id});expect(s.orders.find(r=>r.id===o.id)?.status).toBe('to_pack');
  s=applyCommand(s,{type:'order.pack',warehouseId:main,orderId:o.id});
  s=applyCommand(s,{type:'order.ship',warehouseId:main,orderId:o.id});
  expect(s.orders.find(r=>r.id===o.id)?.status).toBe('shipped');expect(available(scoped(s),p.id)).toBe(before-5);
  expect(()=>applyCommand(s,{type:'order.ship',warehouseId:main,orderId:o.id})).toThrow();
 });
 it('cancels picked orders and restores warehouse stock',()=>{
  let s=makeSeed();const p=sku(s,'FL-101'),before=available(scoped(s),p.id);const packing=stockIn(scoped(s),p.id,'PACKING');
  s=applyCommand(s,{type:'order.create',warehouseId:main,customer:'Cancelled',lines:[{productId:p.id,quantity:3}]});const o=s.orders.find(o=>o.customer==='Cancelled')!;
  s=applyCommand(s,{type:'order.pick',warehouseId:main,orderId:o.id});s=applyCommand(s,{type:'order.cancel',warehouseId:main,orderId:o.id});
  expect(available(scoped(s),p.id)).toBe(before);expect(stockIn(scoped(s),p.id,'PACKING')).toBe(packing);
 });
 it('rejects orders and shelf counts that violate reservations',()=>{
  const s=makeSeed(),p=sku(s,'BT-102');expect(()=>applyCommand(s,{type:'order.create',warehouseId:main,customer:'Nope',lines:[{productId:p.id,quantity:9999}]})).toThrow();
  expect(()=>applyCommand(s,{type:'stock.adjust',warehouseId:main,productId:p.id,bin:'A-02',quantity:0,reason:'Count'})).toThrow();
 });
 it('scopes reservations and stock to the selected warehouse',()=>{
  let s=makeSeed();const p=sku(s,'FL-101'),eastBefore=available(scoped(s,east),p.id);
  s=applyCommand(s,{type:'order.create',warehouseId:main,customer:'Main only',lines:[{productId:p.id,quantity:2}]});
  expect(available(scoped(s,east),p.id)).toBe(eastBefore);
 });
 it('moves between shelves and protects reserved units',()=>{
  let s=makeSeed();const p=sku(s,'FL-101');const before=available(scoped(s),p.id);
  s=applyCommand(s,{type:'stock.transfer',warehouseId:main,productId:p.id,fromBin:'A-01',toBin:'C-03',quantity:4});
  expect(available(scoped(s),p.id)).toBe(before);expect(s.movements[0].type).toBe('transferred');
  const reservedProduct=sku(s,'BT-102');expect(()=>applyCommand(s,{type:'stock.transfer',warehouseId:main,productId:reservedProduct.id,fromBin:'A-02',toBin:'A-01',quantity:45})).toThrow();
 });
 it('rejects duplicate SKUs across warehouses',()=>{const s=makeSeed();expect(()=>applyCommand(s,{type:'product.add',warehouseId:east,name:'Duplicate',sku:'FL-101',category:'Equipment',unit:'pcs',reorderPoint:5,preferredBin:'A-01'})).toThrow();});
});

describe('organisations and shelf management',()=>{
 it('adds, edits, and removes an empty warehouse with a starter shelf',()=>{
  let s=makeSeed();s=applyCommand(s,{type:'warehouse.add',name:'South Hub',code:'WH-03',location:'Silchar'});
  const w=s.warehouses.find(w=>w.code==='WH-03')!;expect(shelfBins(scoped(s,w.id))).toEqual(['A-01']);
  s=applyCommand(s,{type:'warehouse.update',warehouseId:w.id,name:'South Region Hub',location:'Silchar, Assam'});expect(s.warehouses.find(x=>x.id===w.id)?.name).toBe('South Region Hub');
  s=applyCommand(s,{type:'warehouse.remove',warehouseId:w.id});expect(s.warehouses.length).toBe(2);
 });
 it('does not delete a warehouse with stock or operational documents',()=>{const s=makeSeed();expect(()=>applyCommand(s,{type:'warehouse.remove',warehouseId:east})).toThrow();expect(()=>applyCommand(s,{type:'warehouse.remove',warehouseId:main})).toThrow();});
 it('creates and removes a new empty shelf',()=>{
  let s=makeSeed();s=applyCommand(s,{type:'shelf.add',warehouseId:main,code:'D-01',zone:'D',label:'Overflow',capacity:50});
  const sh=s.shelves.find(x=>x.warehouseId===main&&x.code==='D-01')!;expect(shelfBins(scoped(s)).includes('D-01')).toBe(true);
  s=applyCommand(s,{type:'shelf.remove',warehouseId:main,shelfId:sh.id});expect(s.shelves.some(x=>x.id===sh.id)).toBe(false);
 });
 it('renames shelf without changing stock or another site shelf with the same code',()=>{
  let s=makeSeed();const p=sku(s,'AP-104'),before=stockIn(scoped(s),p.id,'B-01');const sh=s.shelves.find(x=>x.warehouseId===main&&x.code==='B-01')!;
  s=applyCommand(s,{type:'shelf.update',warehouseId:main,shelfId:sh.id,code:'Z-01',zone:'Z',label:'New row',capacity:250});
  expect(stockIn(scoped(s),p.id,'Z-01')).toBe(before);expect(shelfBins(scoped(s,east)).includes('B-01')).toBe(true);
 });
 it('reorders shelves inside one zone only',()=>{
  let s=makeSeed();const sh=s.shelves.find(x=>x.warehouseId===main&&x.code==='A-02')!;
  s=applyCommand(s,{type:'shelf.reorder',warehouseId:main,shelfId:sh.id,direction:'up'});
  expect(shelfBins(scoped(s)).slice(0,2)).toEqual(['A-02','A-01']);
 });
 it('cannot remove a shelf with stock or a transfer in transit',()=>{
  const s=makeSeed();expect(()=>applyCommand(s,{type:'shelf.remove',warehouseId:main,shelfId:'shelf-main-A-01'})).toThrow();
  expect(()=>applyCommand(s,{type:'shelf.remove',warehouseId:east,shelfId:'shelf-east-A-02'})).toThrow();
 });
 it('enforces capacity for shelf transfers and stock counts',()=>{
  let s=makeSeed();s=applyCommand(s,{type:'shelf.add',warehouseId:main,code:'D-01',zone:'D',label:'Tiny',capacity:2});const p=sku(s,'FL-101');
  expect(()=>applyCommand(s,{type:'stock.transfer',warehouseId:main,productId:p.id,fromBin:'A-01',toBin:'D-01',quantity:3})).toThrow();
  expect(()=>applyCommand(s,{type:'stock.adjust',warehouseId:main,productId:p.id,bin:'D-01',quantity:3,reason:'Count'})).toThrow();
 });
});

describe('inter-warehouse transfers',()=>{
 it('dispatches into transit then receives without duplicating stock',()=>{
  let s=makeSeed();const p=sku(s,'FL-101');const a=available(scoped(s),p.id),b=available(scoped(s,east),p.id);
  s=applyCommand(s,{type:'transfer.dispatch',fromWarehouseId:main,toWarehouseId:east,productId:p.id,fromBin:'A-01',toBin:'A-01',quantity:5,note:'Restock'});
  expect(available(scoped(s),p.id)).toBe(a-5);expect(available(scoped(s,east),p.id)).toBe(b);const transfer=s.transfers[0];
  s=applyCommand(s,{type:'transfer.receive',transferId:transfer.id});expect(available(scoped(s,east),p.id)).toBe(b+5);
  expect(()=>applyCommand(s,{type:'transfer.receive',transferId:transfer.id})).toThrow();
 });
 it('cancelled transit returns units to original shelf',()=>{
  let s=makeSeed();const p=sku(s,'FL-101');const before=stockIn(scoped(s),p.id,'A-01');
  s=applyCommand(s,{type:'transfer.dispatch',fromWarehouseId:main,toWarehouseId:east,productId:p.id,fromBin:'A-01',toBin:'A-02',quantity:3,note:''});const t=s.transfers[0];s=applyCommand(s,{type:'transfer.cancel',transferId:t.id});
  expect(stockIn(scoped(s),p.id,'A-01')).toBe(before);expect(s.transfers[0].status).toBe('cancelled');
 });
 it('cannot dispatch reserved units or receive into an overfull shelf',()=>{
  let s=makeSeed();const bt=sku(s,'BT-102');expect(()=>applyCommand(s,{type:'transfer.dispatch',fromWarehouseId:main,toWarehouseId:east,productId:bt.id,fromBin:'A-02',toBin:'A-02',quantity:45,note:''})).toThrow();
  const sh=s.shelves.find(x=>x.warehouseId===east&&x.code==='A-02')!;
  s=applyCommand(s,{type:'shelf.update',warehouseId:east,shelfId:sh.id,code:'A-02',zone:'A',label:'Full rack',capacity:24});
  expect(()=>applyCommand(s,{type:'transfer.receive',transferId:'transfer-demo'})).toThrow();
 });
 it('rejects cross-site order use and retains original state on failure',()=>{
  const s=makeSeed(),raw=JSON.stringify(s),p=sku(s,'AC-109');
  expect(()=>applyCommand(s,{type:'order.create',warehouseId:east,customer:'Invalid',lines:[{productId:p.id,quantity:1}]})).toThrow();
  expect(JSON.stringify(s)).toBe(raw);
 });
 it('preserves in-transit records and audit metadata',()=>{
  let s=makeSeed();const p=sku(s,'FL-101');s=applyCommand(s,{type:'transfer.dispatch',fromWarehouseId:main,toWarehouseId:east,productId:p.id,fromBin:'A-01',toBin:'A-01',quantity:3,note:'Hub top-up'});
  const t=s.transfers[0];expect(t.status).toBe('in_transit');expect(t.reference.startsWith('TRF-')).toBe(true);expect(s.movements[0].warehouseId).toBe(main);expect(s.movements[0].type).toBe('inter_dispatch');
  expect(freeInBin(scoped(s),p.id,'A-01')>=0).toBe(true);expect(reserved(scoped(s),p.id)).toBe(6);
 });
});
