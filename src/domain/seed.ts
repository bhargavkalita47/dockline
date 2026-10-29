import { STORAGE_BINS } from './types';
import type { Product, WarehouseState, Stock, Receipt, Order, Movement, ProductCategory, StockBin } from './types';

const daysAgo = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600_000).toISOString();
type SeedProduct = [string, string, ProductCategory, string, number, StockBin];
const catalog: SeedProduct[] = [
  ['FL-101', 'Insulated trail flask · 750 ml', 'Equipment', 'pcs', 20, 'A-01'],
  ['BT-102', 'Wide-mouth bottle · 1 L', 'Equipment', 'pcs', 18, 'A-02'],
  ['BG-103', 'Daypack · 18 L', 'Equipment', 'pcs', 12, 'A-03'],
  ['AP-104', 'Thermal fleece pullover', 'Apparel', 'pcs', 24, 'B-01'],
  ['AP-105', 'Merino trail socks · 2 pack', 'Apparel', 'packs', 25, 'B-02'],
  ['EQ-106', 'Rechargeable camp lantern', 'Equipment', 'pcs', 12, 'A-03'],
  ['AC-107', 'Enamel camp mug', 'Accessories', 'pcs', 15, 'C-01'],
  ['AC-108', 'Quick-dry travel towel', 'Accessories', 'pcs', 20, 'C-02'],
  ['AC-109', 'Canvas utility pouch', 'Accessories', 'pcs', 15, 'C-03'],
  ['EQ-110', 'Carabiner set · 4 pack', 'Equipment', 'sets', 25, 'A-01'],
  ['AC-111', 'Travel cable organizer', 'Accessories', 'pcs', 15, 'C-02'],
  ['EQ-112', 'Roll-top dry bag · 10 L', 'Equipment', 'pcs', 12, 'A-02'],
  ['SP-113', 'Utility webbing straps', 'Supplies', 'sets', 20, 'C-01'],
  ['AP-114', 'Rib-knit merino beanie', 'Apparel', 'pcs', 18, 'B-03'],
  ['SP-115', 'Field repair kit', 'Supplies', 'kits', 10, 'C-03'],
];
const ids = (s: string) => catalog.findIndex(p => p[0] === s) + 1;
const products: Product[] = catalog.map(([sku, name, category, unit, reorderPoint, preferredBin], i) => ({ id: `prd-${i + 1}`, sku, name, category, unit, reorderPoint, preferredBin, createdAt: daysAgo(90) }));
const stockRows: [string, StockBin, number][] = [
  ['FL-101', 'A-01', 62], ['FL-101', 'A-02', 15],
  ['BT-102', 'A-02', 47], ['BG-103', 'A-03', 25],
  ['AP-104', 'B-01', 16], ['AP-104', 'RECEIVING', 24],
  ['AP-105', 'B-02', 65], ['AP-105', 'B-03', 14],
  ['EQ-106', 'A-03', 39], ['EQ-106', 'PACKING', 2],
  ['AC-107', 'C-01', 53], ['AC-108', 'C-02', 31],
  ['AC-109', 'C-03', 17], ['AC-109', 'PACKING', 3],
  ['EQ-110', 'A-01', 86], ['AC-111', 'C-02', 22],
  ['EQ-112', 'A-02', 8], ['SP-113', 'C-01', 33],
  ['AP-114', 'B-03', 11], ['AP-114', 'RECEIVING', 24],
  ['SP-115', 'C-03', 24], ['FL-101', 'PACKING', 4]
];
const stock: Stock[] = [...stockRows.map(([sku, bin, quantity]) => ({ warehouseId:'wh-01', productId: `prd-${ids(sku)}`, bin, quantity })), ...([['FL-101','A-01',18],['BT-102','A-02',24],['AP-105','B-01',32],['AC-107','C-01',16],['EQ-110','B-02',14],['AP-114','C-02',8]] as [string,StockBin,number][]).map(([sku,bin,quantity])=>({warehouseId:'wh-02',productId:`prd-${ids(sku)}`,bin,quantity}))];
const receipts: Receipt[] = [
  { warehouseId:'wh-01', id: 'rcpt-1046', reference: 'RCV-1046', supplier: 'Summit Textile Works', createdAt: daysAgo(0, 2), lines: [
    { id: 'rl-1046-1', productId: `prd-${ids('AP-104')}`, quantity: 42, putAway: 18 },
    { id: 'rl-1046-2', productId: `prd-${ids('AP-114')}`, quantity: 24, putAway: 0 }
  ]},
  { warehouseId:'wh-01', id: 'rcpt-1045', reference: 'RCV-1045', supplier: 'Alpine Goods Co.', createdAt: daysAgo(1), lines: [
    { id: 'rl-1045-1', productId: `prd-${ids('EQ-106')}`, quantity: 30, putAway: 30 },
    { id: 'rl-1045-2', productId: `prd-${ids('BT-102')}`, quantity: 40, putAway: 40 }
  ]},
  { warehouseId:'wh-01', id: 'rcpt-1044', reference: 'RCV-1044', supplier: 'Trail Parts Supply', createdAt: daysAgo(3), lines: [
    { id: 'rl-1044-1', productId: `prd-${ids('EQ-110')}`, quantity: 65, putAway: 65 }
  ]},
];
const orders: Order[] = [
  { warehouseId:'wh-01', id: 'ord-2089', reference: 'ORD-2089', customer: 'Westwind Retail', createdAt: daysAgo(0, 1), status: 'to_pick', lines: [
    { id: 'ol-2089-1', productId: `prd-${ids('AP-105')}`, quantity: 12 },
    { id: 'ol-2089-2', productId: `prd-${ids('BT-102')}`, quantity: 6 }
  ]},
  { warehouseId:'wh-01', id: 'ord-2088', reference: 'ORD-2088', customer: 'Ridge & Road', createdAt: daysAgo(0, 3), status: 'to_pick', lines: [
    { id: 'ol-2088-1', productId: `prd-${ids('EQ-110')}`, quantity: 8 },
    { id: 'ol-2088-2', productId: `prd-${ids('FL-101')}`, quantity: 6 }
  ]},
  { warehouseId:'wh-01', id: 'ord-2087', reference: 'ORD-2087', customer: 'The Trek Company', createdAt: daysAgo(0, 5), status: 'to_pack', lines: [
    { id: 'ol-2087-1', productId: `prd-${ids('AC-109')}`, quantity: 3 }
  ]},
  { warehouseId:'wh-01', id: 'ord-2086', reference: 'ORD-2086', customer: 'Mountain Market', createdAt: daysAgo(1), status: 'to_ship', lines: [
    { id: 'ol-2086-1', productId: `prd-${ids('EQ-106')}`, quantity: 2 },
    { id: 'ol-2086-2', productId: `prd-${ids('FL-101')}`, quantity: 4 }
  ]},
  { warehouseId:'wh-01', id: 'ord-2085', reference: 'ORD-2085', customer: 'Northern Goods', createdAt: daysAgo(2), shippedAt: daysAgo(1), status: 'shipped', lines: [
    { id: 'ol-2085-1', productId: `prd-${ids('EQ-112')}`, quantity: 4 }
  ]}
];
const movementSeeds: [string, Movement['type'], string, number, StockBin | undefined, StockBin | undefined, string, string, number][] = [
  ['seed-1', 'received', 'AP-104', 42, undefined, 'RECEIVING', 'RCV-1046', 'From Summit Textile Works', 2],
  ['seed-2', 'received', 'AP-114', 24, undefined, 'RECEIVING', 'RCV-1046', 'From Summit Textile Works', 2],
  ['seed-3', 'putaway', 'AP-104', 18, 'RECEIVING', 'B-01', 'RCV-1046', 'Stored on Shelf B-01', 1],
  ['seed-4', 'picked', 'AC-109', 3, 'C-03', 'PACKING', 'ORD-2087', 'Picked for The Trek Company', 5],
  ['seed-5', 'received', 'EQ-106', 30, undefined, 'RECEIVING', 'RCV-1045', 'From Alpine Goods Co.', 24],
  ['seed-6', 'putaway', 'EQ-106', 30, 'RECEIVING', 'A-03', 'RCV-1045', 'Stored on Shelf A-03', 22],
  ['seed-7', 'picked', 'EQ-106', 2, 'A-03', 'PACKING', 'ORD-2086', 'Picked for Mountain Market', 27],
  ['seed-8', 'picked', 'FL-101', 4, 'A-01', 'PACKING', 'ORD-2086', 'Picked for Mountain Market', 27],
  ['seed-9', 'shipped', 'EQ-112', 4, 'PACKING', undefined, 'ORD-2085', 'Dispatched to Northern Goods', 30]
];
const movements: Movement[] = movementSeeds.map(([id, type, sku, quantity, fromBin, toBin, reference, note, hours]) => ({ warehouseId:'wh-01', id, type, productId: `prd-${ids(sku)}`, quantity, fromBin, toBin, reference, note, at: daysAgo(0, hours) })).sort((a, b) => b.at.localeCompare(a.at));

export function makeSeed(): WarehouseState {
  return { schemaVersion: 2, warehouses: [
    {id:'wh-01',code:'WH-01',name:'Central Distribution Centre',location:'Guwahati, Assam',createdAt:daysAgo(90)},
    {id:'wh-02',code:'WH-02',name:'East Fulfilment Hub',location:'Jorhat, Assam',createdAt:daysAgo(60)}
  ], shelves: [
    ...STORAGE_BINS.map((code,i)=>({id:`shelf-main-${code}`,warehouseId:'wh-01',code,zone:code.split('-')[0],label:`Aisle ${code.split('-')[0]} · Rack ${code.split('-')[1]}`,position:i+1,capacity:240})),
    ...['A-01','A-02','B-01','B-02','C-01','C-02'].map((code,i)=>({id:`shelf-east-${code}`,warehouseId:'wh-02',code,zone:code.split('-')[0],label:`Rack ${code}`,position:i+1,capacity:140}))
  ],transfers:[
    {id:'transfer-demo',reference:'TRF-3001',fromWarehouseId:'wh-01',toWarehouseId:'wh-02',fromBin:'A-01',toBin:'A-02',productId:'prd-1',quantity:6,status:'in_transit' as const,note:'East hub replenishment',dispatchedAt:daysAgo(0,4)}
  ],nextTransfer:3002, products: structuredClone(products), stock: structuredClone(stock), receipts: structuredClone(receipts), orders: structuredClone(orders), movements: structuredClone(movements), nextReceipt: 1047, nextOrder: 2090 };
}
