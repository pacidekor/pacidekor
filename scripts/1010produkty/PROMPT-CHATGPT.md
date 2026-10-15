# Úloha: kompletný vizuálny audit dávky PACIDEKOR 1010 (PREFOTENÉ)

Si senior vizuálny QA + catalog manager pre slovenský veľkoobchodný e-shop s umelými kvetmi a dekoráciami (PACIDEKOR).

## Kontext
- Dávka: **NAHRATÉ 10.10.2026 / PREFOTENÉ**
- Produktov: **32** (ešte **neboli importované**)
- Draft katalóg už existuje (názvy, Farby, kategórie) — tvoja úloha je ho **overiť a opraviť**
- Každý produkt: `products/{ID}/`
  - `info.txt` — aktuálny návrh metadát
  - `1.jpg … N.jpg` — galéria (čísla = 1-based indexy)
  - `_sheet.jpg` — prehľad všetkých fotiek s číslami
- `manifest.json` — zoznam + aktuálne Farby + draft poznámky

## Čo skontrolovať u KAŽDÉHO produktu
1. **1 produkt alebo split?** Rôzne modely/tvary omylom v jednej zložke → `no_split_needed` + návrh rozdelenia
2. **Zlúčenie:** či 2 zložky sú ten istý predajný model (najmä 002+003) → navrhni merge
3. **Farebné varianty:** koľko reálnych predajných farieb je na fotkách?
4. **Mapovanie Farby → fotky:** sedí riadok `Farby:`?
   - Formát: `biela [1-3] | zelená [4-6]` alebo `krémová [1,3,5]`
   - Čísla = 1-based (`1.jpg` = 1)
   - Každá fotka 1…N by mala patriť aspoň jednej farbe
   - Skupinová / overview fotka (viac farieb naraz) môže byť vo **viacerých** farbách
5. **„Zelená“ u kvetov:** skutočná farba kvetu, alebo len lístie?
6. **Názov / popis / kategória / subkategória / druh:** oprav len ak je zjavne zle (slovensky)
7. **Import ready?** `yes` / `yes_after_fix` / `no_split_needed` / `needs_human` / `merge_with`

## Defaults (ak nie je fotografický dôkaz inak)
- `single_sku` — jeden produkt bez rozmerových variantov
- Nepridávaj neoverené rozmery ani počet kusov
- Popis **nesmie** obsahovať farbu ani počet kusov (farby len do Farby)
- `mix` = kombinovaný vzhľad jedného vyhotovenia ALEBO mix balenie bez výberu farby — uveď ktoré
- `prírodná` = prírodný/neutrálny jednofarebný vzhľad bez farebného výberu

## Pravidlá textu
- Všetky návrhy **po slovensky**
- Bez em-dash (použi `-`)
- Farby krátke, malými: biela, krémová, ružová, staroružová, lososová, fialová, zelená, zelenožltá, šalviová, oranžová, žltá, modrá, béžová, hnedá, sivá, čierna, zlatá, strieborná, prírodná, mix, …
- Buď prísny, ale praktický — ak je OK, napíš to stručne
- Ak si nie si istý na >20 %, daj `needs_human`

## Špeciálne body na overenie v tejto dávke
- **002 + 003**: draft hovorí, že môžu byť rovnaký model — zlúčiť alebo nie?
- **010 vs 011**: dve hortenzie — sú to naozaj dva produkty?
- **001 vs 012**: dve kytice pivoniek — sú rôzne?
- **017 vs 022**: dve biele ruže — sú rôzne modely?
- Multi-color s mix/overview fotkou: 001, 004, 006, 009, 011, 025–027, 030, 032

## Povinný výstup
Jeden JSON objekt (+ môžeš pridať markdown prioritu NAVYŠE):

```json
{
  "summary": {
    "reviewed": 32,
    "ok_as_is": 0,
    "fix_farby": 0,
    "fix_meta": 0,
    "split_or_reject": 0,
    "merge_candidates": 0,
    "needs_human": 0
  },
  "products": [
    {
      "id": "006",
      "verdict": "yes_after_fix",
      "confidence": 0.9,
      "currentFarby": "…ako je teraz…",
      "proposedFarby": "biela [1,5,9,11] | modrá [2,5,8,10] | fialová [3,5,6,13] | žltá [4,5,7,12]",
      "farbyChanged": false,
      "proposedName": null,
      "proposedDescription": null,
      "proposedCategory": null,
      "proposedSubcategory": null,
      "proposedDruh": null,
      "mergeWith": null,
      "splitPlan": [],
      "notes": "…",
      "photoNotes": [
        { "photo": 5, "is": "group overview", "assignTo": ["biela", "modrá", "fialová", "žltá"] }
      ],
      "issues": []
    }
  ]
}
```

### Polia verdict
- `yes` — importovať bez zmeny
- `yes_after_fix` — importovať po aplikovaní proposed*
- `no_split_needed` — najprv rozdeliť (vyplň `splitPlan`)
- `merge_with` — zlúčiť s iným ID (vyplň `mergeWith`, napr. `"003"`)
- `needs_human` — nevieš spoľahlivo rozhodnúť

### splitPlan (len pri no_split_needed)
```json
"splitPlan": [
  {
    "newId": "006a",
    "name": "…",
    "photos": [1, 2],
    "farby": "biela [1-2]",
    "importFarby": "biela [1-2]",
    "category": "Umelé kvety",
    "subcategory": "Stopkové kvety",
    "description": "…"
  }
]
```
- `photos` = pôvodné čísla v tejto galérii
- `importFarby` = prepočítané na novú galériu (1…N v poradí `photos`)

## Postup
1. Prečítaj `manifest.json`
2. Pre každý ID: `_sheet.jpg` → podľa potreby jednotlivé `N.jpg` → `info.txt`
3. Zapíš záznam do `products[]` (všetkých 32)
4. Vyplň `summary`
5. **Za JSON** vypíš ľudskú prioritu:
   - TOP problémy (musí sa opraviť)
   - Merge / split návrhy
   - OK na import
   - Needs human

Začni multi-color produktmi a spornými pármi (002/003, 010/011, 001/012, 017/022), potom zvyšok.
