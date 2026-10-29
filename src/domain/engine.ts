import type {NewLine,WarehouseCommand,WarehouseState,MovementType,Product} from './types';
import {available,freeInBin,forWarehouse,reserved,reservedInBin,shelfBins,stockIn,stored} from './selectors';

const fail=(m:string):never=>{throw new Error(m);};
const text=(s:string,label:string)=>s.trim()||fail(`${label} is required.`);
const integer=(n:number,label:string,min=0)=>Number.isSafeInteger(n)&&n>=min||fail(`${label} must be a whole number of at least ${min}.`);
const id=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const getProduct=(s:WarehouseState,pid:string):Product=>s.products.find(p=>p.id===pid)||fail('Product not found.');
const getWarehouse=(s:WarehouseState,wid:string)=>s.warehouses.find(w=>w.id===wid)||fail('Warehouse not found.');
const assertShelf=(s:WarehouseState,bin:string)=>s.shelves.find(x=>x.code===bin)||fail(`Shelf ${bin} does not exist in this warehouse.`);
function stockChange(s:WarehouseState,pid:string,bin:string,delta:number){
 const row=s.stock.find(x=>x.productId===pid&&x.bin===bin);
 const next=(row?.quantity??0)+delta;
 if(!Number.isSafeInteger(next)||next<0)fail(`Not enough stock at ${bin}.`);
 const shelf=s.shelves.find(x=>x.code===bin);
 if(shelf?.capacity!=null){const occupied=s.stock.filter(x=>x.bin===bin).reduce((a,b)=>a+b.quantity,0);if(occupied+delta>shelf.capacity)fail(`Shelf ${bin} has a capacity of ${shelf.capacity} units. Available space: ${shelf.capacity-occupied}.`);}
 if(row)row.quantity=next;else if(next)s.stock.push({warehouseId:s.warehouses[0].id,productId:pid,bin,quantity:next});
 s.stock=s.stock.filter(x=>x.quantity>0);
}
function move(s:WarehouseState,type:MovementType,pid:string,quantity:number,reference:string,note:string,fromBin?:string,toBin?:string){
 s.movements.unshift({warehouseId:s.warehouses[0].id,id:id(),type,productId:pid,quantity,reference,note,fromBin,toBin,at:now()});
}
function lines(s:WarehouseState,rows:NewLine[]){if(!rows.length)fail('Add at least one product.');const map=new Map<string,number>();for(const r of rows){getProduct(s,r.productId);integer(r.quantity,'Quantity',1);map.set(r.productId,(map.get(r.productId)||0)+r.quantity);}return [...map].map(([productId,quantity])=>({productId,quantity}));}
function warehouseStockChange(s:WarehouseState,wid:string,pid:string,bin:string,delta:number){
 const scope=structuredClone(forWarehouse(s,wid));
 const oldQty=stockIn(scope,pid,bin);
 stockChange({...scope,warehouses:[getWarehouse(s,wid)]},pid,bin,delta);
 // Validate against a deep clone. An in-memory row must be debited exactly once.
 const newQty=oldQty+delta;
 s.stock=s.stock.filter(r=>!(r.warehouseId===wid&&r.productId===pid&&r.bin===bin));
 if(newQty>0)s.stock.push({warehouseId:wid,productId:pid,bin,quantity:newQty});
}
function globalMovement(s:WarehouseState,wid:string,type:MovementType,pid:string,qty:number,ref:string,note:string,from?:string,to?:string){s.movements.unshift({warehouseId:wid,id:id(),type,productId:pid,quantity:qty,reference:ref,note,fromBin:from,toBin:to,at:now()});}

/** Returns a complete immutable next snapshot or throws; never alters `previous`. */
export function applyCommand(previous:WarehouseState,cmd:WarehouseCommand):WarehouseState{
 const global=structuredClone(previous);
 switch(cmd.type){
  case 'warehouse.add':{
   const name=text(cmd.name,'Warehouse name');const code=text(cmd.code,'Warehouse code').toUpperCase();const location=text(cmd.location,'Location');
   if(global.warehouses.some(w=>w.code.toUpperCase()===code))fail('Warehouse code already exists.');
   const wid=id();global.warehouses.push({id:wid,name,code,location,createdAt:now()});
   global.shelves.push({id:id(),warehouseId:wid,code:'A-01',zone:'A',label:'First rack',capacity:null,position:1});return global;
  }
  case 'warehouse.update':{
   const w=getWarehouse(global,cmd.warehouseId);w.name=text(cmd.name,'Warehouse name');w.location=text(cmd.location,'Location');return global;
  }
  case 'warehouse.remove':{
   getWarehouse(global,cmd.warehouseId);
   if(global.warehouses.length===1)fail('Keep at least one warehouse in the organisation.');
   if(global.stock.some(x=>x.warehouseId===cmd.warehouseId)||global.orders.some(x=>x.warehouseId===cmd.warehouseId)||global.movements.some(x=>x.warehouseId===cmd.warehouseId)||global.receipts.some(x=>x.warehouseId===cmd.warehouseId)||global.transfers.some(x=>x.fromWarehouseId===cmd.warehouseId||x.toWarehouseId===cmd.warehouseId))fail('A warehouse with stock, documents, or transfer history cannot be removed. Create a new empty warehouse if you need a fresh location.');
   global.warehouses=global.warehouses.filter(w=>w.id!==cmd.warehouseId);global.shelves=global.shelves.filter(x=>x.warehouseId!==cmd.warehouseId);return global;
  }
  case 'shelf.add':{
   getWarehouse(global,cmd.warehouseId);const code=text(cmd.code,'Shelf code').toUpperCase();const zone=text(cmd.zone,'Zone').toUpperCase();
   if(global.shelves.some(x=>x.warehouseId===cmd.warehouseId&&x.code===code))fail('That shelf code already exists at this warehouse.');
   if(cmd.capacity!==null)integer(cmd.capacity,'Capacity',1);
   global.shelves.push({id:id(),warehouseId:cmd.warehouseId,code,zone,label:text(cmd.label,'Shelf description'),capacity:cmd.capacity,position:Math.max(0,...global.shelves.filter(x=>x.warehouseId===cmd.warehouseId&&x.zone===zone).map(x=>x.position))+1});return global;
  }
  case 'shelf.update':{
   const shelf=global.shelves.find(x=>x.id===cmd.shelfId&&x.warehouseId===cmd.warehouseId)||fail('Shelf not found.');
   const code=text(cmd.code,'Shelf code').toUpperCase();const zone=text(cmd.zone,'Zone').toUpperCase();
   if(global.shelves.some(x=>x.id!==shelf.id&&x.warehouseId===cmd.warehouseId&&x.code===code))fail('This shelf code already exists.');
   if(cmd.capacity!==null){integer(cmd.capacity,'Capacity',1);const stocked=global.stock.filter(x=>x.warehouseId===cmd.warehouseId&&x.bin===shelf.code).reduce((a,b)=>a+b.quantity,0);if(stocked>cmd.capacity)fail(`Shelf contains ${stocked} units; capacity cannot be lower.`);}
   if(code!==shelf.code){if(global.transfers.some(t=>t.status==='in_transit'&&((t.fromWarehouseId===cmd.warehouseId&&t.fromBin===shelf.code)||(t.toWarehouseId===cmd.warehouseId&&t.toBin===shelf.code))))fail('Complete in-transit transfers involving this shelf before changing its code.');
     for(const row of global.stock)if(row.warehouseId===cmd.warehouseId&&row.bin===shelf.code)row.bin=code;
     // Transfer and movement historical labels stay unchanged, preserving their original receipt evidence.
     if(cmd.warehouseId===global.warehouses[0].id)for(const p of global.products)if(p.preferredBin===shelf.code)p.preferredBin=code;
   }
   shelf.code=code;shelf.zone=zone;shelf.label=text(cmd.label,'Shelf description');shelf.capacity=cmd.capacity;return global;
  }
  case 'shelf.reorder':{
   const current=global.shelves.find(x=>x.id===cmd.shelfId&&x.warehouseId===cmd.warehouseId)||fail('Shelf not found.');
   const group=global.shelves.filter(x=>x.warehouseId===cmd.warehouseId&&x.zone===current.zone).sort((a,b)=>a.position-b.position||a.code.localeCompare(b.code));
   const index=group.findIndex(x=>x.id===current.id),targetIndex=index+(cmd.direction==='up'?-1:1);
   if(targetIndex<0||targetIndex>=group.length)fail('Shelf is already at the end of this zone.');
   const reordered=[...group];[reordered[index],reordered[targetIndex]]=[reordered[targetIndex],reordered[index]];
   reordered.forEach((shelf,i)=>shelf.position=i+1);return global;
  }
  case 'shelf.remove':{
   const target=global.shelves.find(x=>x.id===cmd.shelfId&&x.warehouseId===cmd.warehouseId)||fail('Shelf not found.');
   if(global.shelves.filter(x=>x.warehouseId===cmd.warehouseId).length===1)fail('Keep at least one shelf in a warehouse.');
   if(global.stock.some(x=>x.warehouseId===cmd.warehouseId&&x.bin===target.code&&x.quantity>0))fail('Move all stock off this shelf before removing it.');
   if(global.transfers.some(x=>x.status==='in_transit'&&x.toWarehouseId===cmd.warehouseId&&x.toBin===target.code))fail('This shelf has incoming stock in transit. Receive or cancel the transfer first.');
   if(global.transfers.some(x=>x.status==='in_transit'&&x.fromWarehouseId===cmd.warehouseId&&x.fromBin===target.code))fail('This shelf has outgoing stock in transit. Receive or cancel the transfer first.');
   global.shelves=global.shelves.filter(x=>x.id!==target.id);return global;
  }
  case 'transfer.dispatch':{
   if(cmd.fromWarehouseId===cmd.toWarehouseId)fail('Choose two different warehouses.');
   getWarehouse(global,cmd.fromWarehouseId);getWarehouse(global,cmd.toWarehouseId);getProduct(global,cmd.productId);integer(cmd.quantity,'Transfer quantity',1);
   const origin=forWarehouse(global,cmd.fromWarehouseId),destination=forWarehouse(global,cmd.toWarehouseId);
   assertShelf(origin,cmd.fromBin);assertShelf(destination,cmd.toBin);
   if(freeInBin(origin,cmd.productId,cmd.fromBin)<cmd.quantity)fail('Not enough unreserved units on the source shelf.');
   // Dispatched quantities leave available stock immediately; destination only receives them upon receipt.
   warehouseStockChange(global,cmd.fromWarehouseId,cmd.productId,cmd.fromBin,-cmd.quantity);
   const reference=`TRF-${global.nextTransfer++}`;
   global.transfers.unshift({id:id(),reference,fromWarehouseId:cmd.fromWarehouseId,toWarehouseId:cmd.toWarehouseId,fromBin:cmd.fromBin,toBin:cmd.toBin,productId:cmd.productId,quantity:cmd.quantity,status:'in_transit',note:cmd.note.trim(),dispatchedAt:now()});
   globalMovement(global,cmd.fromWarehouseId,'inter_dispatch',cmd.productId,cmd.quantity,reference,`Dispatched to ${getWarehouse(global,cmd.toWarehouseId).code}`,cmd.fromBin);return global;
  }
  case 'transfer.receive':{
   const transfer=global.transfers.find(x=>x.id===cmd.transferId)||fail('Transfer not found.');
   if(transfer.status!=='in_transit')fail('This transfer has already been completed.');
   assertShelf(forWarehouse(global,transfer.toWarehouseId),transfer.toBin);
   warehouseStockChange(global,transfer.toWarehouseId,transfer.productId,transfer.toBin,transfer.quantity);
   transfer.status='received';transfer.receivedAt=now();globalMovement(global,transfer.toWarehouseId,'inter_receive',transfer.productId,transfer.quantity,transfer.reference,`Received from ${getWarehouse(global,transfer.fromWarehouseId).code}`,undefined,transfer.toBin);return global;
  }
  case 'transfer.cancel':{
   const transfer=global.transfers.find(x=>x.id===cmd.transferId)||fail('Transfer not found.');
   if(transfer.status!=='in_transit')fail('Only transfers in transit can be cancelled.');
   assertShelf(forWarehouse(global,transfer.fromWarehouseId),transfer.fromBin);
   warehouseStockChange(global,transfer.fromWarehouseId,transfer.productId,transfer.fromBin,transfer.quantity);
   transfer.status='cancelled';transfer.cancelledAt=now();globalMovement(global,transfer.fromWarehouseId,'inter_return',transfer.productId,transfer.quantity,transfer.reference,'Cancelled transfer; returned to origin shelf',undefined,transfer.fromBin);return global;
  }
 }
 // Legacy warehouse-level transactions execute against a single warehouse-scoped snapshot.
 const warehouseId='warehouseId'in cmd&&cmd.warehouseId?cmd.warehouseId:global.warehouses[0].id;
 getWarehouse(global,warehouseId);
 const s={...forWarehouse(global,warehouseId),warehouses:[getWarehouse(global,warehouseId)]};
 const shelf=(bin:string)=>assertShelf(s,bin);
 const finish=()=>{
  global.products=s.products;global.nextReceipt=s.nextReceipt;global.nextOrder=s.nextOrder;
  global.stock=[...global.stock.filter(r=>r.warehouseId!==warehouseId),...s.stock.map(r=>({...r,warehouseId}))];
  global.receipts=[...s.receipts.map(r=>({...r,warehouseId})),...global.receipts.filter(r=>r.warehouseId!==warehouseId)];
  global.orders=[...s.orders.map(r=>({...r,warehouseId})),...global.orders.filter(r=>r.warehouseId!==warehouseId)];
  global.movements=[...s.movements.map(r=>({...r,warehouseId})),...global.movements.filter(r=>r.warehouseId!==warehouseId)].sort((a,b)=>b.at.localeCompare(a.at));
  return global;
 };
 switch(cmd.type){
  case 'product.add':{
   const name=text(cmd.name,'Product name'),sku=text(cmd.sku,'SKU').toUpperCase(),unit=text(cmd.unit,'Unit');integer(cmd.reorderPoint,'Reorder level');shelf(cmd.preferredBin);
   if(s.products.some(p=>p.sku.toLowerCase()===sku.toLowerCase()))fail('This SKU is already in use.');
   s.products.push({id:id(),sku,name,unit,category:cmd.category,reorderPoint:cmd.reorderPoint,preferredBin:cmd.preferredBin,createdAt:now()});return finish();
  }
  case 'receipt.create':{
   const supplier=text(cmd.supplier,'Supplier'),list=lines(s,cmd.lines),reference=`RCV-${s.nextReceipt++}`;
   s.receipts.unshift({warehouseId,id:id(),reference,supplier,createdAt:now(),lines:list.map(l=>({...l,id:id(),putAway:0}))});
   for(const line of list){stockChange(s,line.productId,'RECEIVING',line.quantity);move(s,'received',line.productId,line.quantity,reference,`From ${supplier}`,undefined,'RECEIVING');}return finish();
  }
  case 'receipt.putaway':{
   const receipt=s.receipts.find(r=>r.id===cmd.receiptId)||fail('Receipt not found in this warehouse.');const line=receipt.lines.find(l=>l.id===cmd.receiptLineId)||fail('Receipt line not found.');
   integer(cmd.quantity,'Putaway quantity',1);shelf(cmd.bin);if(cmd.quantity>line.quantity-line.putAway)fail('Quantity exceeds this receipt line remaining.');
   stockChange(s,line.productId,cmd.bin,cmd.quantity);stockChange(s,line.productId,'RECEIVING',-cmd.quantity);
   line.putAway+=cmd.quantity;move(s,'putaway',line.productId,cmd.quantity,receipt.reference,`Stored on Shelf ${cmd.bin}`,'RECEIVING',cmd.bin);return finish();
  }
  case 'order.create':{
   const customer=text(cmd.customer,'Customer'),list=lines(s,cmd.lines);for(const line of list)if(available(s,line.productId)<line.quantity)fail(`Not enough available stock for ${getProduct(s,line.productId).name}.`);
   const reference=`ORD-${s.nextOrder++}`;s.orders.unshift({warehouseId,id:id(),reference,customer,lines:list.map(l=>({...l,id:id()})),status:'to_pick',createdAt:now()});return finish();
  }
  case 'order.pick':{
   const order=s.orders.find(o=>o.id===cmd.orderId)||fail('Order not found in this warehouse.');if(order.status!=='to_pick')fail('Order is not awaiting picking.');
   for(const line of order.lines){if(stored(s,line.productId)<line.quantity)fail(`Insufficient shelf stock for ${getProduct(s,line.productId).name}.`);let left=line.quantity;
    for(const bin of shelfBins(s)){const qty=Math.min(left,stockIn(s,line.productId,bin));if(!qty)continue;stockChange(s,line.productId,bin,-qty);stockChange(s,line.productId,'PACKING',qty);move(s,'picked',line.productId,qty,order.reference,`Picked for ${order.customer}`,bin,'PACKING');left-=qty;if(!left)break;}
   }order.status='to_pack';return finish();
  }
  case 'order.pack':{const o=s.orders.find(x=>x.id===cmd.orderId)||fail('Order not found.');if(o.status!=='to_pack')fail('Pick this order first.');o.status='to_ship';return finish();}
  case 'order.ship':{const o=s.orders.find(x=>x.id===cmd.orderId)||fail('Order not found.');if(o.status!=='to_ship')fail('Pack this order first.');for(const l of o.lines){stockChange(s,l.productId,'PACKING',-l.quantity);move(s,'shipped',l.productId,l.quantity,o.reference,`Dispatched to ${o.customer}`,'PACKING');}o.status='shipped';o.shippedAt=now();return finish();}
  case 'order.cancel':{
   const o=s.orders.find(x=>x.id===cmd.orderId)||fail('Order not found.');if(o.status==='cancelled'||o.status==='shipped')fail('Order cannot be cancelled.');
   if(o.status==='to_pack'||o.status==='to_ship')for(const l of o.lines){const preferred=getProduct(s,l.productId).preferredBin;const target=s.shelves.find(x=>x.code===preferred)?.code||shelfBins(s)[0];stockChange(s,l.productId,target,l.quantity);stockChange(s,l.productId,'PACKING',-l.quantity);move(s,'restocked',l.productId,l.quantity,o.reference,'Order cancelled; returned to shelf','PACKING',target);}o.status='cancelled';return finish();
  }
  case 'stock.adjust':{
   getProduct(s,cmd.productId);shelf(cmd.bin);integer(cmd.quantity,'Counted quantity');const before=stockIn(s,cmd.productId,cmd.bin),delta=cmd.quantity-before;
   if(!delta)fail('The counted quantity matches the existing quantity.');if(cmd.quantity<reservedInBin(s,cmd.productId,cmd.bin)||stored(s,cmd.productId)+delta<reserved(s,cmd.productId))fail('Count would remove stock reserved for open orders.');
   const reason=text(cmd.reason,'Reason');stockChange(s,cmd.productId,cmd.bin,delta);move(s,'adjusted',cmd.productId,delta,'STOCK COUNT',reason,cmd.bin,cmd.bin);return finish();
  }
  case 'stock.transfer':{
   getProduct(s,cmd.productId);shelf(cmd.fromBin);shelf(cmd.toBin);integer(cmd.quantity,'Transfer quantity',1);
   if(cmd.fromBin===cmd.toBin)fail('Choose two different shelves.');if(freeInBin(s,cmd.productId,cmd.fromBin)<cmd.quantity)fail('Not enough unreserved stock on the source shelf.');
   stockChange(s,cmd.productId,cmd.toBin,cmd.quantity);stockChange(s,cmd.productId,cmd.fromBin,-cmd.quantity);move(s,'transferred',cmd.productId,cmd.quantity,'SHELF TRANSFER',`Moved from ${cmd.fromBin} to ${cmd.toBin}`,cmd.fromBin,cmd.toBin);return finish();
  }
 }
 return global;
}
