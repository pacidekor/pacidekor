# Inventura katalogu (Drive ↔ e-shop)

## Stav zdrojů
- Drive dump: `katalog_raw/produktyznovu` (146 složek, mimo `public/` ✓)
- Fotek: cca 1853× JPG
- E-shop produktů (DB): **214** → `_katalog-work/katalog-eshop.csv`
- Clean výstup: `_katalog-work/clean/`

## Stavy
- `NA_ESHOPU` / `CHYBI` / `OPRAVA` / `NEJISTE` / `PREFOTIT` / `SKIP`

## Názvy složek
Formát: `{NNN} {STAV} {Název}`  
Příklad: `007 NA_ESHOPU Ginkgo žlté`

## Pravidla
1. WebP ~85 %
2. Pořadí: květináč → close-up → stonek
3. Barvy: defaultní názvy + hex (Bordová `#800020`)
4. Žádný auto-import do DB
5. **Dávky po ≥20 složkách**
6. Stav je vždy v názvu složky (ne jen v TSV)

## Progress
| Dávka | Složek | Stav |
|-------|--------|------|
| 1 | 20 (001–020) | **hotovo** → `STAV.tsv` |
| 2+ | zbývá ~126 (+ `-II` guláš) | čeká |

### Dávka 1 – shrnutí
- 13× `NA_ESHOPU`
- 3× `OPRAVA` (orchidea mini, hortenzia multi, eukalyptus mauve)
- 3× `NEJISTE` (aspidistra?, pivónie/hortenzia, chryzantéma/georgína)
- 2× `PREFOTIT` (B1__014, B1__128YL)
- Složka `-II` zatím přeskočena (vnořený guláš ~905 fotek)

Další: napiš „dávka 2“ a pokračuju dalšími 20.
