# Dockline — Industrial Warehouse OS · Multi-warehouse Edition

[Live demo on Cloudflare Workers](https://dockline.bhargavkalita1327.workers.dev/)

Dockline is a React and TypeScript warehouse operations demo. Follow stock from receiving to shipping, manage shelf capacity and reservations, and move stock between warehouses. The interactive demo persists data in the current browser.

## Project timeline

| Phase | What changed |
| --- | --- |
| Concept | Model warehouse work from supplier arrival through shipping, with physical shelf locations and a record of stock movements. |
| October 2026 · Multi-warehouse edition | Expanded to separate warehouse inventories, a shared SKU catalogue, configurable shelves and a network-level stock view. |
| Transfer workflow | Added dispatch, in-transit tracking, receipt and cancellation, with capacity checks and migration for earlier browser datasets. |

**Today:** A browser-persisted operations demo covering receiving, shipping and inter-warehouse transfers.

## Engineering challenges and solutions

- **Warehouse isolation.** A shared SKU catalogue gives the network view a common vocabulary while stock, shelves, orders and reservations remain scoped to each warehouse.
- **Stock in transit.** Dispatch checks unreserved stock and removes it from the source. Receipt checks shelf capacity and adds the stock exactly once. Cancelling an in-transit transfer returns it to the source.
- **Older browser data.** The multi-warehouse version migrates earlier saved state so existing activity remains usable.

## Working workflows

**Warehouse network**
- A single organisation can manage multiple warehouses; the seed includes Central Distribution Centre (WH-01) and East Fulfilment Hub (WH-02).
- Create and edit warehouses with unique codes, names, and locations. An empty warehouse starts with a shelf. Only a warehouse without stock or operational history can be removed.
- Switch the active warehouse at the top of the application. Overview, Inventory, Shelves, Receiving, Orders, and Activity all reflect **that warehouse only**.
- The Warehouse Network page compares per-SKU available stock across every warehouse and displays network-level totals. Products/SKUs are shared; stock, reservations, receipts, orders, bins, and activity are warehouse-specific.

**Shelf management**
- Create any number of shelves, assign each to a zone, name it, and optionally enter a maximum capacity in units.
- Rename/reorganise a shelf or move its order earlier/later in its zone. Renaming preserves physical stock, without affecting other warehouses using the same shelf code.
- Select a shelf to see SKUs, on-hand units, reserved units, free-to-move units, and recent activity.
- Correct shelf counts, move stock between shelves, or send a product to the inter-warehouse transfer form. All operations use the same validated domain engine and activity ledger.
- Delete only **empty** shelves with no outstanding in-transit transfer references. The final shelf in a warehouse cannot be removed.

**Inter-warehouse transfers**
- Choose a source warehouse/shelf, destination warehouse/shelf, product, quantity, and note.
- **Dispatch** deducts only unreserved units from the source. A new transfer is recorded as **in transit**; these units are not yet counted at the destination.
- Switch to the destination warehouse and **Receive** the transfer to place stock on the destination shelf and enforce shelf capacity.
- **Cancel** an in-transit transfer from the source warehouse to return the units. A transfer cannot be received twice.
- Browse all transfers across the organization; the chosen warehouse determines which receipt/cancellation action is available.

**Existing receive-to-ship operations**
- Record supplier deliveries → put away from the dock to storage shelves → create orders (reserve stock) → pick from shelves → pack → ship.
- Stock at the receiving dock or packing station isn't available to create new orders.
- Reserved shelf units cannot be transferred or adjusted away. Every stock-changing action writes movement history.
- Browse an Inventory product's shelf list, adjust counts and move between shelves from either Inventory or Shelves.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

To test and create the production build:

```bash
npm test
npm run build
npm run preview
```

## Publish through GitHub and Cloudflare (free)

1. Extract this archive and upload **the project files** to your existing GitHub repository root (`package.json` should be at the repository root). Replace the previous versions of `src`, `README.md`, and `wrangler.jsonc` with these files. Commit the update.
2. If the old repository contains `public/_redirects`, **delete it from GitHub**. The old `/* /index.html 200` SPA rule caused Cloudflare Workers error 100324.
3. Keep the existing Cloudflare Git connection; a push to the configured production branch should trigger a new deployment.
4. For a **Cloudflare Pages** Git build use build command `npm run build`, output directory `dist`, root directory `/`.
5. For your existing **Cloudflare Workers** Git deployment use build command `npm run build` and deploy command `npx wrangler deploy`. The supplied `wrangler.jsonc` configures static assets from `dist` and SPA fallback without `_redirects`.

Cloudflare does not require paid hosting for this frontend. No server-side credentials are required in the current browser-local implementation.

## Existing browser data / migration

The local repository reads `dockline-warehouse-v2`, and if it is absent, automatically upgrades the old `dockline-warehouse-v1` state. Existing products, counts, receipts, orders, and movement history are assigned to the original warehouse, **WH-01**; the previously existing shelf codes are carried forward. Migration does **not** invent stock in a new warehouse or destroy the previous v1 localStorage key. New installations start with two populated sample warehouses and one sample transfer awaiting receipt.

**Important:** browser-local data is not shared across different users, computers, or browsers. Deploying to Cloudflare gives you a real public frontend, but **not** a real-time multi-user warehouse database. Before using Dockline for operational inventory, connect a server/database with authenticated users, organisation membership, warehouse permissions, row-level scoping, transaction-safe stock mutations, and concurrency controls. The command/domain/repository boundaries are deliberately separated to support that next step.

## Architecture

```text
src/
  App.tsx                     Navigation, active warehouse, dialogs
  components/
    Overview.tsx              Active warehouse operational overview
    Inventory.tsx             Active warehouse SKU inventory
    Shelves.tsx               Dynamic shelf map + CRUD + counts/transfers
    Network.tsx               Organisation warehouse management + comparison
    Transfers.tsx             In-transit network shipment lifecycle
    Receiving.tsx             Supplier arrivals + putaway
    Orders.tsx                Reservation, pick, pack, ship
    Activity.tsx              Warehouse-scoped movement ledger
    UI.tsx                    Shared accessible controls
  domain/
    types.ts                  Typed warehouse, shelf, transfer entities/commands
    selectors.ts              Scoped derived quantities and reservations
    engine.ts                 Pure atomic validated transactions
    seed.ts                   Two sample warehouse datasets
    engine.test.ts            Warehouse and cross-site regression tests
  services/repository.ts      LocalStorage repository; v1 → v2 migration
  hooks/useWarehouse.ts       Repository command coordination
  multiwarehouse.css          Network, transfers, management visual styles
  industrial-theme.css        Industrial red/yellow token system
  styles.css, shelves.css     Shared screens and shelf-specific styling
wrangler.jsonc                Cloudflare Workers static asset routing
```

### Operational invariants

- Warehouse A and Warehouse B stock never mix just because the shelf codes match.
- Orders reserve only inventory in their own warehouse.
- Physical stock corrections cannot reduce quantity below committed reservations.
- Inter-warehouse dispatch removes stock from source exactly once; receipt adds it to destination exactly once; cancel returns to source once.
- No destructive deletion of occupied shelves or warehouses with inventory or operational history.
- Receiving, adjustments, transfers and shipment history remain traceable per warehouse.
- Operations produce a complete new state or throw without changing the saved state.

## Verification

The domain logic was compiled with TypeScript and tested with the checked-in test cases through an offline Node test harness. The TS and TSX source files were also parsed and checked using local TypeScript tooling. An **actual Vite production build and browser-based UI test still need to run after dependencies are installed**; this environment could not download npm packages. Do not infer a live deployment from this source archive.
