# Dockline / Industrial Signal Design System

Dockline uses a distinct **industrial operations** identity. It is intentionally not a forest-green, ivory, or generic SaaS analytics dashboard.

## Core palette

| Token | Value | Purpose |
| --- | --- | --- |
| `--deep` | `#12161B` | Graphite left navigation and command surfaces |
| `--signal-red` | `#ED1C2E` | Primary actions, exceptions, brand mark, task links |
| `--industrial-yellow` | `#FFCC00` | Active navigation, receiving attention, safety cues |
| `--canvas` | `#F2F4F6` | Cool concrete-like working background |
| `--ink` | `#191D22` | High-legibility text |
| `--steel` | `#67717C` | Secondary controls, warehouse schematics |
| `--line` | `#E1E5E9` | Crisp panel / table separation |

Green is used exclusively as a *status semantic* for completed or healthy events; it is not a brand color.

## Typography and shape

- **DM Sans** for all UI text, headings, buttons, numbers.
- **IBM Plex Mono** for SKUs, reference codes, section kickers, status counts and bin labels.
- Small radii (4–10px), explicit fine borders, low visual depth, high contrast.
- Brand mark: three red industrial slashes.

## Core UX

1. Overview begins with task queues, and uses actual inventory totals and bin stocks.
2. **Receive stock** and **Create order** are immediately visible.
3. Incoming stock flows into **Receiving**; completed putaway increases sellable shelf stock.
4. Outbound orders are staged as **To pick → To pack → To ship → Shipped** in Orders.
5. Products, stock corrections, shelf transfers and the audit trail remain accessible within five navigation destinations.
6. Important statuses always include text, not color alone. Tabs and forms preserve keyboard-visible focus states.
7. Responsive breakpoints collapse panels and support a mobile slide-out menu.

## Files

- `src/styles.css`: baseline screen and workflow component styles, normalized from the older palette.
- `src/industrial-theme.css`: authoritative industrial design layer; new components should use these tokens.
- `src/components/Overview.tsx`: task-first industrial operations dashboard.
- `docs/design-preview.html`: static, non-interactive inspection fixture using the same CSS classes. It is **not** the React app or a deployed demo.

The screenshot supplied with the ZIP is a CSS layout preview rendered from this static fixture. Product/workflow screens and dialogs are implemented in the React source.
