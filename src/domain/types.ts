/** Organisation-wide inventory contract. A warehouse ID scopes every stock and document row. */
export type StockBin = string;
export const STORAGE_BINS: StockBin[] = ['A-01','A-02','A-03','B-01','B-02','B-03','C-01','C-02','C-03'];
export type ProductCategory = 'Equipment' | 'Apparel' | 'Accessories' | 'Supplies';
export interface Warehouse { id:string; code:string; name:string; location:string; createdAt:string; }
export interface Shelf { id:string; warehouseId:string; code:string; zone:string; label:string; position:number; capacity:number|null; }
export interface Product { id:string; sku:string; name:string; category:ProductCategory; unit:string; reorderPoint:number; preferredBin:StockBin; createdAt:string; }
export interface Stock { warehouseId:string; productId:string; bin:StockBin; quantity:number; }
export interface ReceiptLine { id:string; productId:string; quantity:number; putAway:number; }
export interface Receipt { warehouseId:string; id:string; reference:string; supplier:string; lines:ReceiptLine[]; createdAt:string; }
export interface OrderLine { id:string; productId:string; quantity:number; }
export type OrderStatus = 'to_pick'|'to_pack'|'to_ship'|'shipped'|'cancelled';
export interface Order { warehouseId:string; id:string; reference:string; customer:string; lines:OrderLine[]; status:OrderStatus; createdAt:string; shippedAt?:string; }
export type MovementType = 'received'|'putaway'|'picked'|'shipped'|'adjusted'|'transferred'|'restocked'|'inter_dispatch'|'inter_receive'|'inter_return';
export interface Movement { warehouseId:string; id:string; type:MovementType; productId:string; quantity:number; fromBin?:StockBin; toBin?:StockBin; reference:string; note:string; at:string; }
export type TransferStatus = 'in_transit'|'received'|'cancelled';
export interface InterWarehouseTransfer { id:string; reference:string; fromWarehouseId:string; toWarehouseId:string; fromBin:string; toBin:string; productId:string; quantity:number; status:TransferStatus; note:string; dispatchedAt:string; receivedAt?:string; cancelledAt?:string; }
export interface WarehouseState { schemaVersion:2; warehouses:Warehouse[]; shelves:Shelf[]; transfers:InterWarehouseTransfer[]; nextTransfer:number; products:Product[]; stock:Stock[]; receipts:Receipt[]; orders:Order[]; movements:Movement[]; nextReceipt:number; nextOrder:number; }
export type NewLine = {productId:string;quantity:number};
/** All commands are pure transactions. Warehouse-scoped commands carry an optional warehouseId for backward compatibility. */
export type WarehouseCommand = (
  | {type:'product.add';name:string;sku:string;category:ProductCategory;unit:string;reorderPoint:number;preferredBin:StockBin}
  | {type:'receipt.create';supplier:string;lines:NewLine[]}
  | {type:'receipt.putaway';receiptId:string;receiptLineId:string;quantity:number;bin:StockBin}
  | {type:'order.create';customer:string;lines:NewLine[]}
  | {type:'order.pick'|'order.pack'|'order.ship'|'order.cancel';orderId:string}
  | {type:'stock.adjust';productId:string;bin:StockBin;quantity:number;reason:string}
  | {type:'stock.transfer';productId:string;fromBin:StockBin;toBin:StockBin;quantity:number}
  ) & {warehouseId?:string}
  | {type:'warehouse.add';name:string;code:string;location:string}
  | {type:'warehouse.update';warehouseId:string;name:string;location:string}
  | {type:'warehouse.remove';warehouseId:string}
  | {type:'shelf.add';warehouseId:string;code:string;zone:string;label:string;capacity:number|null}
  | {type:'shelf.update';warehouseId:string;shelfId:string;code:string;zone:string;label:string;capacity:number|null}
  | {type:'shelf.remove';warehouseId:string;shelfId:string}
  | {type:'shelf.reorder';warehouseId:string;shelfId:string;direction:'up'|'down'}
  | {type:'transfer.dispatch';fromWarehouseId:string;toWarehouseId:string;productId:string;fromBin:string;toBin:string;quantity:number;note:string}
  | {type:'transfer.receive'|'transfer.cancel';transferId:string};
