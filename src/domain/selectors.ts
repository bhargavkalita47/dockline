import type {Product,WarehouseState,StockBin,Receipt,Order} from './types';
/** The scoped view has only one warehouse's stock, documents and shelves. */
export function forWarehouse(s:WarehouseState,warehouseId:string):WarehouseState {
 return {...s,stock:s.stock.filter(x=>x.warehouseId===warehouseId),receipts:s.receipts.filter(x=>x.warehouseId===warehouseId),orders:s.orders.filter(x=>x.warehouseId===warehouseId),movements:s.movements.filter(x=>x.warehouseId===warehouseId),shelves:s.shelves.filter(x=>x.warehouseId===warehouseId)};
}
export const shelfBins=(s:WarehouseState)=>[...s.shelves].sort((a,b)=>a.zone.localeCompare(b.zone)||a.position-b.position||a.code.localeCompare(b.code)).map(x=>x.code);
export const stockIn=(s:WarehouseState,productId:string,bin:StockBin)=>s.stock.find(x=>x.productId===productId&&x.bin===bin)?.quantity??0;
export const stored=(s:WarehouseState,productId:string)=>s.stock.filter(x=>x.productId===productId&&s.shelves.some(b=>b.code===x.bin)).reduce((a,b)=>a+b.quantity,0);
export const reserved=(s:WarehouseState,productId:string)=>s.orders.filter(o=>o.status==='to_pick').flatMap(o=>o.lines).filter(l=>l.productId===productId).reduce((a,b)=>a+b.quantity,0);
export const reservedInBin=(s:WarehouseState,productId:string,bin:StockBin):number=>{
 if(!shelfBins(s).includes(bin))return 0;
 let remaining=reserved(s,productId);
 for(const shelf of shelfBins(s)){const allocation=Math.min(remaining,stockIn(s,productId,shelf));if(shelf===bin)return allocation;remaining-=allocation;}return 0;
};
export const freeInBin=(s:WarehouseState,productId:string,bin:StockBin)=>stockIn(s,productId,bin)-reservedInBin(s,productId,bin);
export const available=(s:WarehouseState,productId:string)=>stored(s,productId)-reserved(s,productId);
export const onHand=(s:WarehouseState,productId:string)=>s.stock.filter(x=>x.productId===productId).reduce((a,b)=>a+b.quantity,0);
export const isLow=(s:WarehouseState,p:Product)=>available(s,p.id)<=p.reorderPoint;
export const receiptRemaining=(r:Receipt)=>r.lines.reduce((a,b)=>a+b.quantity-b.putAway,0);
export const receiptTotal=(r:Receipt)=>r.lines.reduce((a,b)=>a+b.quantity,0);
export const receiptIsDone=(r:Receipt)=>receiptRemaining(r)===0;
export const orderTotal=(o:Order)=>o.lines.reduce((a,b)=>a+b.quantity,0);
export const productById=(s:WarehouseState,id:string)=>s.products.find(p=>p.id===id);
export const binLabel=(b:StockBin)=>b==='RECEIVING'?'Receiving dock':b==='PACKING'?'Packing station':`Shelf ${b}`;
export const statusLabel:Record<Order['status'],string>={to_pick:'To pick',to_pack:'To pack',to_ship:'Ready to ship',shipped:'Shipped',cancelled:'Cancelled'};
export const movementLabel={received:'Stock received',putaway:'Put away',picked:'Order picked',shipped:'Dispatched',adjusted:'Stock adjusted',transferred:'Shelf transfer',restocked:'Returned to shelf',inter_dispatch:'Sent to another warehouse',inter_receive:'Received from warehouse',inter_return:'Transfer returned'} as const;
export const number=(n:number)=>new Intl.NumberFormat('en-US').format(n);
export const dateShort=(s:string)=>new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export const dateTime=(s:string)=>new Date(s).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
