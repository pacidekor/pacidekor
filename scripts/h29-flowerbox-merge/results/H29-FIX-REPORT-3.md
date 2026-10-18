# H29 — dokončení (refs úplnost + build + izolovaný smoke) — 2026-10-18

**Produkce:** beze změn (žádný push / deploy / migrace / aktivace).

**Baseline commit (app diff):** `d8cf59315d3fefa152882bca43a7a10faadec665`  
**Kořen projektu:** `C:\Users\tomas\Desktop\projekty\pacidekor\pacidekornavrh1`  
**Izolovaný H29 worktree:** `C:\Users\tomas\Desktop\projekty\pacidekor\pacidekor-h29-verify`

## 1. Úplnost referencí při deleteProductAdmin

- Stránkování: `order("id", { ascending: true })` + `{ count: "exact" }`.
- `collectReferencedImageUrls`: kratší stránka **nesmí** sama dokázat konec, pokud `collectedRows < total` (možný serverový limit) → fail-closed, mazání odmítnuto.
- Chybějící `total` (null / Content-Range) → refuse.
- Cílené unit testy bez Storage: `missing total on short page`, `short page while total says more remain`.

## 2. Build / TypeScript

| Příkaz | Kde | Exit | Poznámka |
| --- | --- | --- | --- |
| `npx next build --webpack` (1. pokus) | `pacidekor-h29-verify` | **1** | TS **Finished TypeScript in 41s**; pád ve fázi *Collecting page data* — chybělo `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`) |
| `npx next build --webpack` (2. pokus, izolované `.env.local` → `127.0.0.1:3002`) | `pacidekor-h29-verify` | **0** | `ELAPSED_MS=104839`; logy v `results/build-diag-h29wt-next-webpack2-*.log` |

Srovnání (dříve doložené): H29-only worktree `tsc`/TS fáze OK (~14–41s); plný WIP strom může hangovat — hang **není** způsoben H29 diffem (doloženo izolovaným H29 checkoutem).

## 3. Izolovaný stack + aplikace

Adresy ověřeny na izolaci: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3002` (proxy → PostgREST → PG `54329`).

| Kontrola | Verdikt | Detail |
| --- | --- | --- |
| 082 → 083 (307) | **PASS** | `/produkt/sada-2-okruhlych-flowerboxov-kraft-so-snurkou` → mix-farieb |
| 071 → 083 (307) | **PASS** | `/produkt/sada-okruhlych-flowerboxov-so-snurkou-kremova` → mix-farieb |
| 083 PDP barvy/mapy/fotky | **PASS** | 5 barev; mapy `hneda:[10,13,11,12]`, `kremova:[14,15]`; obrázky 83/82/71 |
| list (`/api/products/list?q=flowerbox`) | **PASS** | `total:1`, jen 083; archivované ID nepřítomny |
| by-ids (082+071+083) | **PASS** | jen 083 |
| `createOrderAction` archivované ID | **PASS** | `… kraft … už nie je v ponuke.` (probe `shippingMethod:pickup`) |
| browser: PDP + barva + zoom | **PASS** | `browser-smoke.json` — Bordová→Biela; dialog zoom |

## 4. Unit testy

`node --test product-image-refs.test.mjs activation-artifacts.test.mjs` → **15/15 PASS** (včetně nových completeness cases).

## Verdikt

| Oblast | Stav |
| --- | --- |
| Refs pagination / úplnost | **PASS** |
| Build (H29-only `next build --webpack`) | **PASS** (exit 0) |
| Izolovaný app smoke | **PASS** |
| Celkově H29 toto kolo | **PASS** |

**Zbývající bloker pro produkci:** žádný technický bloker z tohoto kola — záměrně **neprovedeno** prod migrace / push / deploy / aktivace (dle zadání).

## Balíček

`scripts/h29-flowerbox-merge/h29-fix-pack-20261018-3.zip` — app diff vs `d8cf593`, skripty, results (build logy, smoke, HTTP), report.
