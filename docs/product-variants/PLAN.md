# Vlastné textové varianty — schválený plán

Stav: **schválené** (2026-10-18). Lokálna implementácia bez produkčnej migrácie / push / deploy.

Legenda: **[O]** overené · **[S]** schválené rozhodnutie

---

## Schválené rozhodnutia (odlišnosti od skoršieho návrhu)

### Identita košíka **[S]**
- `none` → produkt
- `colors` → produkt + `colorId` (dve farby = **dva riadky**)
- `custom` → produkt + stabilné `variantId`
- Jednotný kľúč s namespace: `""` | `c:{colorId}` | `v:{variantId}` (`line_option_key`)
- Rovnaká voľba sa zlučuje množstvom; žiadne prepísanie farby v jednom riadku
- Migrácia existujúcich košíkov: z uloženého `color_id` → `c:…`; nič nedohadávať

### Ceny **[S]**
- Varianta: celá VO cena bez DPH → existujúca cenotvorba (markup, DPH, zaokrúhlenie)
- Nové ceny variant v **eurocentoch** (`priceCents: integer`), nie text „4,90 €“
- Staré `products.price` text plošne neprepisovať
- Custom + `%` produktová zľava (aj naplánovaná, keď je efektívne aktívna) → na každú variantu
- Absolutný `sale_price` pre custom **nie je podporený** — admin musí konflikt vyriešiť výslovne (nesmie ticho zmazať ani ignorovať pri objednávke)
- Kontrola objednávky vždy z konkrétnej varianty, nie z odvodeného minima

### Katalógový súhrn **[S]**
Compact (bez `text_variants` v liste): `variant_mode`, počty platných/objednateľných, `min` cena, `priceVaries`
- Objednateľné existujú → cena/„od“ z nich
- Žiadna objednateľná → min všetkých platných + „Vypredané“, CTA off
- „od“ len pri skutočne rôznych relevantných cenách
- Štítok počtu = všetky platné (vrátane vypredaných); 1 → bez štítku
- `in_stock` = samostatný nadradený prepínač; **neauto-false** pri všetkých unavailable
- Karta custom → navigácia na PDP (bez nového modalu)

### Fotky **[S]**
- Referencie **URL** (musia byť z `images` produktu), nie indexy
- Poradie PDP: fotky varianty → ostatné → shared last; každá URL raz
- Bez priradenia = galéria produktu (shared last)
- Main/hover karty sa výberom nemení; farebná logika bezo zmeny

### Sklad / história **[S]**
- Varianta: manuálne available
- `stock_quantity` = spoločný strop; súčet všetkých riadkov produktu
- Snapshot osi + hodnoty aj pre farby; staré objednávky fallback

### Prepínač režimov **[S]**
- Neaktívne dáta farieb/variant sa nemažú
- Návrat z custom: odvodené min **nesmie** potichu prepísať pôvodnú cenu — editor vyžaduje cenu pre nový režim (`price_before_custom` / explicitné potvrdenie)

### SEO **[S]**
- Nie samostatná etapa; JSON-LD nesmie odporovať cene/dostupnosti

---

## Dátový model **[S]**

### `products` (nové stĺpce)
| Stĺpec | Typ |
|--------|-----|
| `variant_mode` | `none` \| `colors` \| `custom` (backfill) |
| `variant_axis_label` | text null |
| `text_variants` | jsonb null — `[{id,label,priceCents,available,sortOrder,imageUrls}]` |
| `default_variant_id` | text null |
| `variant_total_count` | int |
| `variant_orderable_count` | int |
| `variant_min_price_cents` | int null |
| `variant_price_varies` | bool |
| `price_before_custom` | text null |

Pri save custom: atomicky prepočítať súhrn + odvodené `products.price` = format(min orderable alebo min all).

### `cart_items`
- `line_option_key text not null default ''`
- PK `(user_id, product_id, line_option_key)`
- `color_id` ostáva denormalizované pre čitateľnosť; kanonický kľúč = `line_option_key`

### `order_items`
- `variant_id`, `selection_axis_label`, `selection_value_label` (snapshot)
- farby: axis napr. „Farba“, value = label v čase objednávky

---

## Etapy implementácie
1. Migrácia (izolovaná) + typy + `cart-line-key` / `product-variants` — **kód hotový**
2. Admin — **editor režimov + varianty**
3. PDP + katalog + galéria URL — **hotové**
4. Košík (identita, merge, qty, remove) — **hotové**
5. Objednávky + doklady + zľavy konflikt — **hotové**
6. Typecheck / build / browser — čiastočne (unit testy OK; migrácia a browser čakajú)

Produkčné produkty sa nekonvertujú na custom. Deploy / push mimo scope.

### Poradie migrácie / deploy (až po schválení)
1. Staging / izolovaná DB: `supabase/migrations/20261019_product_text_variants.sql`
2. Overenie: existujúce produkty `variant_mode` none/colors; cart PK; order_items stĺpce
3. Deploy app (Vercel) **až po** migrácii DB (inak list/order select zlyhá bez fallbacku na všetkých cestách)
4. Smoke: 2 farby = 2 riadky; custom produkt; percent zľava; archív
5. Návrat: revert app deploy; cart PK zmena vyžaduje opatrný down (záloha `cart_items`); order_items stĺpce sú aditívne (safe leave)

### Unit testy (simulácia, nie E2E)
```
node --experimental-strip-types --test src/lib/cart-line-key.test.mjs src/lib/product-variants.test.mjs
```
