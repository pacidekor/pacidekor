# Kompletní kontrola — 910produkty-ready

Datum: 2026-10-09

## Verdikt

**Struktura OK — 0 fatálních chyb.** Ready pack je připravený na další ladění barev a následný import.

| Kontrola | Výsledek |
|----------|----------|
| Počet složek | **273** / 273 |
| WebP | **954** (beze mezer 1…N) |
| `info.txt` | 273 / 273 kompletní |
| Neplatná kategorie | **0** |
| Prázdné Farby | **0** |
| Foto index mimo rozsah | **0** |
| Popis obsahuje barvu/počet | **0** |
| Video mismatch | **0** |
| Duplicitní názvy | **0** (opraveno 25×) |

## Co se opravilo při kontrole

1. **25 duplicitních názvů** → unikátní (`fixed-duplicate-names.json`)
2. **11 produktů** — přemapování farieb podle spot sheetů (`fixed-farby.json`)
3. **001** — ověřeno pixelově: `biela [1-3] | zelená [4-6]` (správně)
4. **25× em-dash** v názvech nahrazeno `-`

## Zbývá k lidské kontrole

### WARN — překrývající se barvy na fotce (~50 produktů)
Typicky **skupinová foto** (všechny varianty najednou) sdílená mezi barvami. Pro import to obvykle OK (overview shot).  
Priorita: multi-color s 6+ fotkami.

### REVIEW — multi-color mapování (~20)
Nejvíc pozornosti:
- `006`, `008`, `009`, `010`, `011` — kytice s více barvami
- `131`, `144`, `146` — keramika se skupinovou fotkou
- `160`, `176`, `241`, `250` — hodně variant

### INFO — subkategórie mimo pevný taxonomy list (49)
Volné labely typu `Náradie`, `Spreje`, `LED krby`, `Doplnková zeleň` — při importu buď namapovat aliasy, nebo nechat prázdné / Doplnky.

### Zelená u kvetov (8)
Někde je zelená **skutečná barevná varianta** (např. 001 šalvějová pivónie) — OK.  
Někde může být omylem listí jako „barva“ — projít list v `souhrn.md`.

## Video

Jen **159** — Dekoratívny LED krb  
`public/910produkty/NAHRATÉ 6.10.2026/Z 5.9.2026/5 + VIDEO`  
→ ready: `video-1.mp4`, `video-2.mp4`

## Soubory reportů

- `scripts/910produkty/validation-reports/souhrn.md`
- `scripts/910produkty/validation-reports/k-overeni.json`
- `scripts/910produkty/validation-reports/validation-full.json`
- `public/910produkty-ready/_reports/souhrn-validace.md`
- Spot sheets: `scripts/910produkty/validation-reports/spot/`

## Doporučený další krok

1. Projít `k-overeni.json` severity `warn` + multi-color review (~50–70 položek)
2. Až budeš spokojený → bulk import do Supabase
