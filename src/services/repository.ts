import type {WarehouseState} from '../domain/types';
import {makeSeed} from '../domain/seed';
import {STORAGE_BINS} from '../domain/types';
const KEY='dockline-warehouse-v2';const OLD_KEY='dockline-warehouse-v1';
/** Local adapter for a future transactional authenticated repository. Not synchronized across devices. */
export interface WarehouseRepository {load():Promise<WarehouseState>;save(next:WarehouseState):Promise<void>;reset():Promise<WarehouseState>}
function migrateV1(old:Record<string,unknown>):WarehouseState{
 const base=makeSeed(); const legacy=old as unknown as Omit<WarehouseState,'warehouses'|'shelves'|'transfers'|'nextTransfer'>;
 return {...base,products:legacy.products,stock:legacy.stock.map(x=>({...x,warehouseId:'wh-01'})),receipts:legacy.receipts.map(x=>({...x,warehouseId:'wh-01'})),orders:legacy.orders.map(x=>({...x,warehouseId:'wh-01'})),movements:legacy.movements.map(x=>({...x,warehouseId:'wh-01'})),transfers:[],nextTransfer:3001,warehouses:[base.warehouses[0]],shelves:STORAGE_BINS.map((code,i)=>({...base.shelves[i],code})),nextReceipt:legacy.nextReceipt,nextOrder:legacy.nextOrder};
}
export class BrowserRepository implements WarehouseRepository{
 async load(){try{const stored=localStorage.getItem(KEY);if(stored){const value:unknown=JSON.parse(stored);if(value&&typeof value==='object'&&'schemaVersion' in value&&value.schemaVersion===2&&'warehouses'in value&&'shelves'in value)return value as WarehouseState;throw new Error('Incompatible saved data');}
 const old=localStorage.getItem(OLD_KEY);const seed=old?migrateV1(JSON.parse(old) as Record<string,unknown>):makeSeed();await this.save(seed);return seed;
 }catch{throw new Error('Could not open saved warehouse data. Please restore the sample workspace.');}}
 async save(next:WarehouseState){try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Changes could not be saved to this browser. Check your storage settings.');}}
 async reset(){const next=makeSeed();await this.save(next);return next;}
}
export const repository:WarehouseRepository=new BrowserRepository();
