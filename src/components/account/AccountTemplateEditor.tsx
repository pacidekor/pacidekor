"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { ProductSearchSelect } from "@/components/ProductSearchSelect";
import { QuantityStepper } from "@/components/QuantityStepper";
import { formatPrice, parsePrice } from "@/lib/cart";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import {
  updateOrderTemplate,
  type OrderTemplate,
  type OrderTemplateItem,
} from "@/lib/order-templates";
import { getProductCatalog } from "@/lib/product-catalog";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

const labelClass = "mb-1.5 block text-sm font-medium text-[#2f2924]";

export function AccountTemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: OrderTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState(template.name);
  const [note, setNote] = useState(template.note ?? "");
  const [items, setItems] = useState<OrderTemplateItem[]>(() =>
    template.items.map((item) => ({ ...item })),
  );

  const panelOpen = entered && !exiting;
  const availableProducts = getProductCatalog().filter(
    (product) => !items.some((item) => item.productId === product.id),
  );
  const draftTotal = formatPrice(
    items.reduce(
      (sum, line) => sum + parsePrice(line.unitPrice) * line.quantity,
      0,
    ),
  );
  const canSave = items.length > 0 && name.trim().length > 0;

  useEffect(() => {
    const unlock = lockPageScroll();
    const enterFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(enterFrame);
      unlock();
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function closePanel() {
    if (exiting) return;
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 320);
  }

  function setItemQuantity(productId: string, quantity: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function addProduct(product: { id: string; name: string; price: string }) {
    setItems((prev) => {
      if (prev.some((item) => item.productId === product.id)) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
        },
      ];
    });
  }

  function handleSave() {
    if (!canSave) return;
    updateOrderTemplate(template.id, {
      name,
      note,
      items,
    });
    onSaved();
    closePanel();
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        panelOpen ? "bg-black/30" : "bg-black/0"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={closePanel}
      />
      <aside
        className={`relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-template-editor-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Úprava šablóny
            </p>
            <h2
              id="account-template-editor-title"
              className="mt-1 font-heading text-lg text-[#2f2924]"
            >
              {template.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zavrieť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="tpl-edit-name" className={labelClass}>
                Názov šablóny
              </label>
              <input
                id="tpl-edit-name"
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="tpl-edit-note" className={labelClass}>
                Poznámka{" "}
                <span className="font-normal text-[#2f2924]/45">
                  (voliteľné)
                </span>
              </label>
              <input
                id="tpl-edit-note"
                className={fieldClass}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Napr. týždenná dodávka…"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-black/6 pt-5">
            <p className="mb-3 text-sm font-medium text-[#2f2924]">
              Položky šablóny
            </p>
            <ProductSearchSelect
              products={availableProducts}
              onSelect={addProduct}
              placeholder="Hľadať a pridať produkt…"
              emptyLabel="Všetky produkty sú už v šablóne"
            />

            <ul className="mt-4 space-y-3">
              {items.map((line) => {
                const catalogProduct = getProductCatalog().find(
                  (product) => product.id === line.productId,
                );
                return (
                  <li
                    key={line.productId}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f3efe9]">
                        {catalogProduct ? (
                          <Image
                            src={catalogProduct.image}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#2f2924]">
                          {line.name}
                        </p>
                        <p className="text-xs text-[#2f2924]/45">
                          {line.unitPrice} / ks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <QuantityStepper
                        size="sm"
                        value={line.quantity}
                        min={1}
                        onChange={(quantity) =>
                          setItemQuantity(line.productId, quantity)
                        }
                        aria-label={`Množstvo: ${line.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId)}
                        aria-label={`Odstrániť ${line.name}`}
                        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-[#2f2924]/55 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
                      >
                        <Trash2
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {items.length === 0 ? (
              <p className="mt-3 text-sm text-[#9a4d3f]">
                Šablóna musí obsahovať aspoň jednu položku.
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 shrink-0 border-t border-black/6 bg-white px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/55">Medzisúčet</span>
            <span className="font-semibold tabular-nums text-[#2f2924]">
              {draftTotal}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closePanel}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Uložiť zmeny
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
