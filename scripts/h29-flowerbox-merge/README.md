# H29 — flowerbox merge (IMP-NEJ-083 ← 082 + 071)

**Stav:** lokální implementace + aktivační balíček. Produkční migrace / deploy / sloučení **nespouštět** z této etapy.

## Pořadí budoucího nasazení

1. Aditivní migrace `supabase/migrations/20261018_products_archive_redirect.sql`
2. Deploy kompatibilního kódu (archivace, filtry, 307 redirect, order reject, cart reconcile)
3. `check-guards-against-expected.mjs` proti live — musí sedět s `expected-pre.json` (při rozdílu STOP, nikdy nepřepisovat očekávání)
4. Teprve potom `run-activate-capture.mjs` (spustí `activate.sql`, post-stav vezme **uvnitř transakce** před COMMIT)
5. Artefakty write-once do `activations/<id>/` (`backup-pre.json`, `backup-post.json`, `revert-from-backup.sql`) — existující nepřepisovat

## Soubory

| Soubor | Účel |
| --- | --- |
| `approved-manifest.json` | Schválená podoba cíle (16 URL, mapa barev) |
| `expected-pre.json` | Schválený pre-merge guard snapshot (neměnit kvůli green checku) |
| `backup-pre.json` | Kanonická neměnná záloha pre-stavů (kopíruje se do activation složky) |
| `activate.sql` | Atomická transakce + SELECT `h29_post_snapshot` před COMMIT |
| `run-activate-capture.mjs` | Aktivace + zápis write-once do `activations/<id>/` |
| `revert.sql` | Šablona: `post_*_updated_at` povinné; přesná obnova z backup-pre |
| `capture-post-state.mjs` | **Zakázáno** — pozdní DB čtení nepřepisuje očekávání |
| `build-revert-from-backup.mjs` | Validace post vs approved (bez fallbacku) → konkrétní revert |
| `h29-post-validate.mjs` | Společná validace identity + schváleného post-tvaru |
| `check-guards-against-expected.mjs` | Live vs expected-pre; rozdíl = STOP + výpis |
| `verify-isolated.mjs` | UNIT / SIMULATION (ne prohlížečový zoom) |
| `run-sql-isolated.mjs` | Skutečné SQL testy na izolovaném Postgresu |
| `run-app-isolated.mjs` | Skutečné HTTP testy (Next+PostgREST); FAIL → exit 1 |

## Revert vs H07

Revert obnoví **data** tří flowerboxů z `backup-pre.json`. Nemění aplikační kód ani sloupec `unavailable_color_ids` — H07 zůstává funkční.

## Redirect

První aktivace: dočasné přesměrování (`redirect()` → HTTP 307). Permanentní (308) až po potvrzení sloučení.
