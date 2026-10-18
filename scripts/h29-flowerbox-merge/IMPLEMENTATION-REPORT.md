# H29 — implementace + aktivační balíček (lokálně)

**Produkce:** migrace / deploy / sloučení **nespuštěny**. H29 datově neuzavřeno.

## Schválená podoba cíle IMP-NEJ-083

- Název: `Sada 2 okrúhlych flowerboxov so šnúrkou`
- id / sku / slug / cena / balení / sklad beze změny
- 16 URL (0–9 zachovány; 10–13 z 082; 14–15 z 071)
- Mapa: Bordová [4,5,6], Biela [7,8,9], Svetloružová [1,2,3], Hnedá [10,13,11,12], Krémová [14,15]
- Shared = pouze images[0]; unavailable = []

## Migrace

`supabase/migrations/20261018_products_archive_redirect.sql`

- `archived_at`, `redirect_to_product_id` (FK `ON DELETE NO ACTION`)
- CHECK: redirect ⇒ archived; no self-redirect
- TRIGGER: target existující, nearchivovaný, bez řetězce; nelze archivovat redirect target

## App změny

| Oblast | Soubory |
| --- | --- |
| Typy / mapování | `database.types.ts`, `products.ts` |
| Filtr veřejných cest + legacy fallback před migrací | `products-server.ts` (list, index, by-ids, related, auth slides, category) |
| PDP dočasný redirect (307 via `redirect()`) | `produkt/[slug]/page.tsx`, `resolveStorefrontProductBySlug` |
| Order reject archivovaného id | `actions/orders.ts` |
| Cart/favorites reconcile (i stale katalog) | `ensure-catalog-products.ts`, `cart.ts`, `favorites.ts`, `product-catalog.ts` |
| Admin delete nemaže sdílené fotky cíle | `products-admin-server.ts` |
| Fallback podmínka | `product-archive-schema.ts` |

## Aktivace / revert

`scripts/h29-flowerbox-merge/`

- `approved-manifest.json`, `expected-pre.json`, `backup-pre.json`
- `activate.sql` — jedna transakce, lock 3 řádků, full rollback při guard miss
- Před activate: `check-guards-against-expected.mjs` (rozdíl = STOP, bez auto-rewrite)
- Po activate: `capture-post-state.mjs` → `backup-post.json` + `revert-from-backup.sql`
- `revert.sql` — přesná obnova z backup-pre; post guard na celé images/shared/map + `post_*_updated_at`

## Ověření (2026-10-18)

| Test | Výsledek |
| --- | --- |
| `run-sql-isolated.mjs` (14) | **PASS** — aktivace, exact read-back, revert ze zálohy, later-edit refuse, guard STOP |
| `verify-isolated.mjs` + fallback (8) | **PASS** — UNIT gallery order; SIMULATION archive/cart/order |
| `run-app-isolated.mjs` | **BLOCKED** — izolovaný Next/PostgREST neběžel |
| `tsc` / `npm run build` | neopakováno v tomto kole (nezměněn app kód oproti předchozí H29 etapě) |

**HTTP 307 Location:** ověřit až po deploy + migraci proti běžícímu serveru.

## Nasazení (budoucí)

1. Migrace 20261018  
2. Deploy kódu  
3. `check-guards-against-expected.mjs` → při OK `activate.sql`  
4. `capture-post-state.mjs` (záloha post + konkrétní revert)  
5. Smoke (včetně `curl -I` 307)  
6. Po potvrzení: přepnout na `permanentRedirect` (308)
