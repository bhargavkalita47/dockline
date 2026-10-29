# Multi-Warehouse Edition — changes from Shelves Edition

- Warehouse network page: create, rename, and conditionally remove warehouses; view organization-wide inventory distribution by SKU.
- Active warehouse selector in the top bar; all operational screens are warehouse-specific.
- Dynamic shelves: add, edit code/zone/label/capacity, reorder within zone, remove empty shelves.
- Inter-warehouse transfer workflow: dispatch → in transit → receive, or cancel to return source units.
- Reserved-stock and shelf-capacity enforcement across within-site and cross-site moves.
- Entry points to inter-warehouse transfers from Inventory product details and individual shelf products.
- v1 browser-storage migration to v2 warehouse-scoped persistence; old key retained as backup.
- Continued Cloudflare Workers/Pages SPA support without `public/_redirects`.
- Industrial graphite/red/yellow visual identity retained across new screens.

**Deployment:** Replace the previous source files in the GitHub repository. Deleting old tracked files from GitHub matters; uploading a ZIP does not remove them.
