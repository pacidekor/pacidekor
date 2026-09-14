# Souhrn úprav katalogu ready-v3

Porovnání vůči: **katalog_raw/noveprodukty5.9.26-ready (originál) + korekcie voči chybám v2**

## Počty
- Aktivní produkty: **173**
- Potvrzená sloučení: **7**
- Obnovené samostatné produkty (vrácené z v2 sloučení): **6**
- Přejmenování (action=renamed): **86**
- Otázky k ověření: **45**
- WebP v aktivních produktech: **540** (očekáváno 540)
- WebP v _archived (originály sloučených): **19**

## Potvrzená sloučení
- **68 → 66**: Fotky 68 ukazujú farebný mix guľovitej dálie s okrúhlymi lupienkami; jednotlivé kusy sa zhodujú s farebnými variantmi 66. Ide o prezentačný mix, nie samostatný predávaný model. _Důkaz:_ porovnanie stavby hlavy 66 vs mix 68 (okrúhle lupienky, rovnaký stred); nie spoločný AI názov
- **162 → 156**: Rovnaký kvetinový potlačový vzor a rovnaký typ saténovej stuhy; líšia sa len farbou podkladu. Šírka/návin z fotky neodhadované - zlúčené ako farebné varianty vzoru. _Důkaz:_ vizuálna zhoda kvetinového vzoru na 156 a 162
- **180 → 127**: Rovnaké predĺžené drevené špirálky (tyčinkovitý tvar); rozdiel len farba. Rozmer z fotky neodhadovaný. _Důkaz:_ zhoda predĺženého tvaru špirálok 127 a 180
- **116 → 83**: Rovnaká dvojfarebná drevená ružička (svetlejšie jadro, tmavší okraj); 116 je ďalšia farebná/prírodná prezentácia. _Důkaz:_ zhoda dvojfarebnej stavby lupienkov 83 a 116
- **87 → 85**: Rovnaká spirálovitá drevená hlava kvetu; 87 a 97 pridávajú ďalšie farby/prezentácie (mach, sáčok). Predajná jednotka zo zdroja neoverená, tvar výrobku je totožný. _Důkaz:_ zhoda spirálovitej vrstvenej stavby 85/87/97
- **97 → 85**: Rovnaká spirálovitá drevená hlava kvetu; 87 a 97 pridávajú ďalšie farby/prezentácie (mach, sáčok). Predajná jednotka zo zdroja neoverená, tvar výrobku je totožný. _Důkaz:_ zhoda spirálovitej vrstvenej stavby 85/87/97
- **16 → 15**: Rovnaká veľká otvorená hlava iskerníka s hustými vrstvami lupienkov; rozdiel len farba. _Důkaz:_ zhoda veľkosti a vrstvenia 15 a 16; kontrast voči kompaktnej 57

## Obnovené produkty (neověřená sloučení z v2)
- **14** (bylo do 13): Zlúčenie vo v2 len podľa spoločného AI názvu; totožnosť modelu a balenia nepotvrdená.
- **32** (bylo do 28): Zlúčenie vo v2 len podľa spoločného AI názvu; totožnosť modelu a balenia nepotvrdená.
- **35** (bylo do 34): Vo v2 označené ok aj k-overeni naraz; bez potvrdenia SKU/balenia vrátené samostatne.
- **38** (bylo do 36): Zlúčenie vo v2 len podľa spoločného AI názvu; totožnosť modelu a balenia nepotvrdená.
- **46** (bylo do 43): Vo v2 označené ok aj k-overeni naraz; bez potvrdenia, či 46 je len balené foto 43, vrátené samostatne.
- **70** (bylo do 67): Vo v2 označené ok aj k-overeni naraz; bez potvrdenia SKU/balenia vrátené samostatne.

## Import - nevyřešené
- **147** (empty-farby): Farby prázdne zámerne - priesvitný uzáver nepotvrdzuje farbu obsahu. Foto 1.webp ostáva pri produkte. Importér musí podporiť produkt bez farebnej varianty alebo dočasný stav 'bez farby'.
- **155** (common-gallery-only): Pole Farby prázdne; snímky v spoločnej galérii. Potrebné jednotlivé fotky farieb alebo potvrdenie, že ide o predávanú sadu. Importér potrebuje podporu všeobecnej galérie.
- **172** (common-gallery-only): Pole Farby prázdne; snímky v spoločnej galérii. Potrebné jednotlivé fotky farieb alebo potvrdenie, že ide o predávanú sadu. Importér potrebuje podporu všeobecnej galérie.

## Validace
- Em dash: 0
- Popisy s barvou/počtem: 0
- Farby s čárkami: 0
- Chybějící WebP v rozsahu: 0
- Opakované popisy (≥5×): 2

## JPG vs WebP
Zdrojový STAV uvádza 642 JPG, ready má 540 WebP. Konkrétny zoznam 102 vynechaných snímok tu nie je priložený; vysvetlenie (mix/duplicitné zábery pri exporte) je NEOVERENÉ bez inventúry zdrojových JPG.

Originál `ready` a `ready-v2` beze změny. Pracovní kopie: `noveprodukty5.9.26-ready-v3`. Nic nepublikováno.
