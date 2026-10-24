"use client";

import { Suspense, useEffect, useState } from "react";
import { ProductEditor } from "@/components/admin/AdminProductsManager";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { ProductMediaPurchase } from "@/components/product/ProductMediaPurchase";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { QuantityStepper } from "@/components/QuantityStepper";
import { DEFAULT_PRODUCT_DETAILS, type Product } from "@/lib/products";
import { audienceNetFromCatalogPrice, formatPrice, priceIncludingVat } from "@/lib/price";
import { getProductOrderMultiple } from "@/lib/taxonomy";
import { getSetSize, salesContentsLabel, salesUnitLabel, salesQuantityLabel } from "@/lib/sales-unit";

const KEY = "pacidekor-sales-unit-preview-v1";
const seed: Product = {
  id: "local-sales-unit-preview", slug: "drevene-lodicky-s-foliou", name: "Drevené lodičky s fóliou", sku: "IMP-910-200",
  description: "Dekoratívne nádoby v tvare lodičky z drevených lamiel s vnútornou plastovou fóliou na aranžérske účely a výsadbu.",
  price: "13,90 €", category: "Košíky", inStock: true,
  image: "https://media.pacidekor.sk/bulk-910/200/b137f47bcb17-1.webp",
  hoverImage: "https://media.pacidekor.sk/bulk-910/200/8a58478e2851-2.webp",
  attributes: { colors: ["custom:a88769:Pr%C3%ADrodn%C3%A1"], packaging: [{ id: "vlastni", label: "Balenie", pieces: 3 }] },
  colors: [{ id: "custom:a88769:Pr%C3%ADrodn%C3%A1", label: "Prírodná", hex: "#a88769" }],
  colorImageMap: { "custom:a88769:Pr%C3%ADrodn%C3%A1": [0, 1] },
  variantMode: "colors", details: DEFAULT_PRODUCT_DETAILS,
};
const taxonomy = { categories: [{ id: "kosiky", label: "Košíky", sortOrder: 0 }], subcategories: [], druhy: [] };

export function SalesUnitPreview() {
  const [product, setProduct] = useState<Product>(seed);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
        if (saved?.product?.id === seed.id && Array.isArray(saved.product.attributes?.packaging)) {
          setProduct(saved.product);
          setQuantity(Number.isSafeInteger(saved.quantity) && saved.quantity >= 0 ? saved.quantity : 0);
        }
      } catch { /* Empty or invalid local preview draft. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function persist(next: Product, count: number) {
    try { localStorage.setItem(KEY, JSON.stringify({ product: next, quantity: count })); }
    catch { setNotice("Prehliadač nepovolil lokálne uloženie. Zmeny zostanú iba do zatvorenia stránky."); }
    setProduct(next); setQuantity(count);
  }
  const unit = salesUnitLabel(product.attributes?.packaging);
  const multiple = getProductOrderMultiple(product.attributes?.packaging);
  const unitNet = audienceNetFromCatalogPrice(product.price, false);
  return (
    <ProductCatalogProvider products={[product]} taxonomy={taxonomy}>
      <div className="min-h-screen bg-[#faf8f5] text-[#2f2924]">
        <header className="border-b border-black/10 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div><div className="text-lg font-semibold tracking-widest">PACIDEKOR</div><p className="mt-1 text-sm text-[#2f2924]/60">Ukážka predajnej jednotky · iba v tomto prehliadači</p></div>
            <div className="flex gap-3"><button type="button" className="cursor-pointer rounded-xl border border-black/15 px-4 py-2 text-sm" onClick={() => { persist(seed, 0); setNotice("Ukážka bola obnovená na pôvodné balenie 3 kusov."); }}>Obnoviť ukážku</button>
              <button type="button" className="cursor-pointer rounded-xl bg-[#75825B] px-5 py-2 text-sm font-medium text-white" onClick={() => setEditing(true)}>Upraviť produkt</button></div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-8 rounded-xl border border-[#d9dfcf] bg-[#eef1e8] p-4 text-sm leading-relaxed">
            Kliknite na <b>Upraviť produkt</b>. Pod farbami vyberte <b>Sada</b> a nastavte 3 kusy. Cena 13,90 € zostane za jednu celú sadu; maloobchodná cena je 20,85 € bez DPH. Uloženie nemení živý produkt.
          </div>
          {notice ? <p role="status" className="mb-5 text-sm text-[#53613e]">{notice}</p> : null}
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <Suspense fallback={<p>Načítavam ukážku…</p>}><ProductMediaPurchase key={JSON.stringify(product.attributes?.packaging) + product.price} product={product} onPreviewAdd={(count) => { persist(product, quantity + count); setNotice(`Pridané do skúšobného košíka: ${salesQuantityLabel(count, product.attributes?.packaging)}.`); }} /></Suspense>
          </div>
          <section className="mt-10 rounded-2xl border border-black/10 bg-white p-6" aria-label="Skúšobný košík">
            <h2 className="text-xl font-semibold">Skúšobný košík</h2>
            <p className="mt-1 text-sm text-[#2f2924]/60">Množstvo je počet {unit === "sada" ? "celých sád" : "kusov"}. Údaje sa automaticky ukladajú v tomto prehliadači.</p>
            {quantity > 0 ? <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
              <div><p className="font-medium">{product.name}</p><p className="mt-1 text-sm text-[#2f2924]/60">{salesContentsLabel(product.attributes?.packaging) ?? `Odber po ${multiple} ks`}</p><ProductPriceDisplay price={product.price} packaging={product.attributes?.packaging} variant="inline" /></div>
              <div><span className="mb-1 block text-xs text-[#2f2924]/60">{unit === "sada" ? "Počet sád" : "Počet kusov"}</span><QuantityStepper value={quantity} onChange={(n) => persist(product, n)} min={multiple} step={multiple} /></div>
              <div className="text-right"><p className="text-xl font-semibold" data-testid="preview-total">{formatPrice(unitNet * quantity)} bez DPH</p><p className="text-sm text-[#2f2924]/60">{formatPrice(priceIncludingVat(unitNet * quantity))} s DPH</p></div>
              <button type="button" className="cursor-pointer text-sm text-[#a45b45]" onClick={() => persist(product, 0)}>Odstrániť</button>
            </div> : <p className="mt-5 text-sm text-[#2f2924]/50">Košík je prázdny. Vyskúšajte pridanie produktu.</p>}
          </section>
        </main>
        {editing ? <ProductEditor previewMode product={product} catalogCustomColors={[]} onClose={() => setEditing(false)} onSave={async (next) => {
          const updated = { ...product, ...next } as Product;
          persist(updated, 0);
          setNotice(`Nastavenie uložené iba v ukážke. ${getSetSize(updated.attributes?.packaging) ? "Predáva sa jedna celá sada." : "Predáva sa po kusoch."} Skúšobný košík bol vyprázdnený.`);
          return true;
        }} /> : null}
      </div>
    </ProductCatalogProvider>
  );
}
