"use client";

import { salesUnitLabel, salesContentsLabel } from "@/lib/sales-unit";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { Layers, ShoppingBag, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { SaveCartTemplateModal } from "@/components/cart/SaveCartTemplateModal";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import { PromoCodeField, AppliedPromoLine } from "@/components/cart/PromoCodeField";
import {
  amountToMinOrder,
  cartItemCount,
  cartLineUnitCatalogPrice,
  cartSubtotalForAudience,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  readCartItems,
  removeFromCart,
  setCartLineColor,
  setCartQuantity,
  type CartItem,
} from "@/lib/cart";
import { isCartLineColorValid } from "@/lib/order-line-color";
import {
  promoDiscountAmount,
  readAppliedPromo,
  PROMO_EVENT,
  type AppliedPromo,
} from "@/lib/promo";
import {
  fetchClientCustomer,
  subscribeClientAuth,
} from "@/lib/client-auth";
import type { Customer } from "@/lib/customers";
import {
  getInventoryForProduct,
  inventoryMaxOrderable,
  previewInventoryDelta,
} from "@/lib/inventory";
import { productHref } from "@/lib/products";
import { productCountLabel } from "@/lib/product-count";
import {
  audienceNetFromCatalogPrice,
  formatAmountExVat,
  formatAmountIncVat,
  formatAudiencePriceExVat,
  formatAudiencePriceIncVat,
  priceIncludingVat,
} from "@/lib/price";
import {
  alignMaxToOrderMultiple,
  getProductOrderMultiple,
  snapQuantityToMultiple,
} from "@/lib/taxonomy";
import { ORDERS_ENABLED } from "@/lib/shop-flags";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { useCartItemsState } from "@/lib/use-cart";
import { useIsWholesale } from "@/lib/use-is-wholesale";

function CartLine({
  item,
  onQuantityChange,
  onRemove,
  onSelectColor,
  isWholesale,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSelectColor: (colorId: string) => void;
  isWholesale: boolean;
}) {
  const { product, quantity, unavailable, colorId, variantId } = item;
  const colorOptions = product.colors ?? [];
  const unavailableColorIds = product.unavailableColorIds ?? [];
  const isCustom = product.variantMode === "custom";
  const variant = variantId
    ? product.textVariants?.find((v) => v.id === variantId)
    : undefined;
  const needsColorReselect =
    !unavailable &&
    !isCustom &&
    !isCartLineColorValid(colorOptions, colorId, unavailableColorIds);
  const needsVariantReselect =
    !unavailable &&
    isCustom &&
    (!variantId || !variant || !variant.available);
  const reselectOptions = colorOptions.filter(
    (color) => !unavailableColorIds.includes(color.id),
  );
  const deferredQuantity = useDeferredValue(quantity);
  const unitCatalog = cartLineUnitCatalogPrice(item);
  const lineTotalNet =
    audienceNetFromCatalogPrice(unitCatalog, isWholesale) * deferredQuantity;
  const lineTotalInc = priceIncludingVat(lineTotalNet);
  const inventory = getInventoryForProduct(product);
  const remaining = inventoryMaxOrderable(inventory);
  const orderMultiple = getProductOrderMultiple(product.attributes?.packaging);
  const rawMax =
    typeof remaining === "number"
      ? Math.max(orderMultiple, remaining + quantity)
      : undefined;
  const maxQty = alignMaxToOrderMultiple(rawMax, orderMultiple);

  if (unavailable) {
    return (
      <li className="flex items-center gap-3.5 py-5 sm:gap-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#f3efe9] sm:size-28" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold text-[#2f2924] sm:text-lg">
                Produkt už nie je v ponuke
              </p>
              <p className="mt-1 text-sm text-[#9a4d3f]">
                Túto položku odstráňte z košíka. Cena sa do súčtu nezapočítava.
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Odstrániť nedostupný produkt"
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/40 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
            >
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3.5 py-5 sm:gap-5">
      <Link
        href={productHref(product.slug)}
        prefetch={false}
        className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#f3efe9] sm:size-28"
      >
        <Image
          src={product.image}
          alt=""
          fill
          sizes="112px"
          quality={90}
          className="object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={productHref(product.slug)}
              prefetch={false}
              className="block truncate font-heading text-base font-semibold leading-snug text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-lg"
            >
              {product.name}
            </Link>
            <p className="mt-1 truncate text-sm text-[#2f2924]/55">
              {product.category}
            </p>
            {isCustom && variant ? (
              <p className="mt-1 text-sm text-[#2f2924]/70">
                {product.variantAxisLabel ?? "Varianta"}:{" "}
                <span className="font-medium text-[#2f2924]">{variant.label}</span>
              </p>
            ) : null}
            {!isCustom && colorId && colorOptions.length > 0 ? (
              <p className="mt-1 text-sm text-[#2f2924]/70">
                Farba:{" "}
                <span className="font-medium text-[#2f2924]">
                  {colorOptions.find((c) => c.id === colorId)?.label ?? colorId}
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Odstrániť ${product.name}`}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/40 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {needsVariantReselect ? (
          <div className="mt-3 rounded-xl border border-[#9a4d3f]/25 bg-[#9a4d3f]/06 px-3 py-2.5">
            <p className="text-sm text-[#9a4d3f]">
              Vybraná varianta už nie je dostupná. Otvorte produkt a zvoľte novú
              variantu — starý výber neprepisujeme automaticky.
            </p>
            <Link
              href={productHref(product.slug)}
              prefetch={false}
              className="mt-2 inline-flex text-sm font-semibold text-[#75825B] underline-offset-2 hover:underline"
            >
              Prejsť na produkt
            </Link>
          </div>
        ) : null}

        {needsColorReselect ? (
          <div className="mt-3 rounded-xl border border-[#9a4d3f]/25 bg-[#9a4d3f]/06 px-3 py-2.5">
            <p className="text-sm text-[#9a4d3f]">
              {reselectOptions.length > 0
                ? "Vybraná farba už nie je dostupná. Zvoľte inú dostupnú farbu — položka a množstvo zostávajú v košíku."
                : colorOptions.length > 0
                  ? "Všetky farby tohto produktu sú vypredané. Položku odstráňte z košíka."
                  : "Tento produkt už nemá farebné varianty, ale v košíku zostal starý výber farby. Odstráňte výber farby — položka zostane v košíku."}
            </p>
            {reselectOptions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {reselectOptions.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => onSelectColor(color.id)}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/50"
                  >
                    <span
                      className="size-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden
                    />
                    {color.label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectColor("")}
                className="mt-2 inline-flex h-9 cursor-pointer items-center rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/50"
              >
                Odstrániť neplatný výber farby
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-4">
          <span className="text-xs text-[#2f2924]/60">{salesContentsLabel(product.attributes?.packaging)}</span>
          <QuantityStepper
            value={quantity}
            onChange={onQuantityChange}
            max={maxQty}
            min={orderMultiple}
            step={orderMultiple}
            size="sm"
            aria-label={`Množstvo: ${product.name}`}
          />

          <div className="text-right">
            <p className="font-heading text-lg font-semibold tabular-nums text-[#2f2924]">
              {formatPrice(lineTotalNet)}
              <span className="ml-1.5 text-xs font-normal text-[#2f2924]/45">
                bez DPH
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[#2f2924]/45">
              {formatPrice(lineTotalInc)} s DPH
              {deferredQuantity > 1
                ? ` · ${formatAudiencePriceExVat(product.price, isWholesale)} / ${salesUnitLabel(product.attributes?.packaging)}`
                : ""}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function FreeShippingProgress({
  current,
  threshold,
}: {
  current: number;
  threshold: number;
}) {
  const reached = current >= threshold;
  const progress = reached
    ? 100
    : Math.min(100, (current / threshold) * 100);
  const remaining = Math.max(0, threshold - current);

  return (
    <div className="space-y-2">
      <p className="text-xs leading-snug text-[#2f2924]/50">
        {reached ? (
          "Máte dopravu zadarmo."
        ) : (
          <>
            Pridajte ešte{" "}
            <span className="font-semibold text-[#2f2924]/80 tabular-nums">
              {formatPrice(remaining)}
            </span>{" "}
            a máte dopravu zdarma.
          </>
        )}
      </p>

      <div
        className="h-1 overflow-hidden rounded-full bg-black/8"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(current, threshold)}
        aria-label={
          reached
            ? "Dosiahli ste dopravu zadarmo"
            : `Pridajte ešte ${formatPrice(remaining)} a máte dopravu zdarma`
        }
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            reached ? "w-full bg-[#75825B]" : "bg-[#75825B]/80"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function CartSummary({
  items,
  subtotal,
  customer,
}: {
  items: CartItem[];
  subtotal: number;
  customer: Customer | null;
}) {
  const count = cartItemCount(items);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const discount = promo
    ? promoDiscountAmount(subtotal, promo.discountPercent)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShipping = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const hasInvalidColor = items.some(
    (item) =>
      !item.unavailable &&
      !isCartLineColorValid(
        item.product.colors,
        item.colorId,
        item.product.unavailableColorIds,
      ),
  );
  const canCheckout =
    ORDERS_ENABLED && meetsMinOrder(subtotal) && !hasInvalidColor;
  const remainingMinOrder = amountToMinOrder(subtotal);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    function sync() {
      setPromo(readAppliedPromo());
    }
    sync();
    window.addEventListener(PROMO_EVENT, sync);
    return () => window.removeEventListener(PROMO_EVENT, sync);
  }, []);

  function onSaveTemplateClick() {
    if (customer) {
      setTemplateOpen(true);
      return;
    }
    setLoginOpen(true);
  }

  return (
    <aside className="lg:sticky lg:top-[calc(5rem+3.5rem)]">
      <div className="overflow-hidden rounded-3xl border border-black/6 bg-white">
        <div className="border-b border-black/6 px-6 py-5 sm:px-7">
          <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
            Súhrn objednávky
          </h2>
          <p className="mt-1 text-sm text-[#2f2924]/55">
            {productCountLabel(count)}
          </p>
        </div>

        <div className="space-y-3.5 px-6 py-5 sm:px-7">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/60">Medzisúčet bez DPH</span>
            <span className="font-medium text-[#2f2924]">
              {formatAmountExVat(subtotal)}
            </span>
          </div>

          <PromoCodeField subtotal={subtotal} onPromoChange={setPromo} />

          {discount > 0 && promo ? (
            <AppliedPromoLine promo={promo} discountAmount={discount} />
          ) : null}

          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/60">Doprava</span>
            <span className="font-medium text-[#2f2924]">
              {freeShipping ? "Zadarmo" : "Vypočíta sa pri pokladni"}
            </span>
          </div>

          <FreeShippingProgress
            current={afterDiscount}
            threshold={FREE_SHIPPING_THRESHOLD}
          />

          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/60">Celkom bez DPH</span>
            <span className="font-medium tabular-nums text-[#2f2924]">
              {formatAmountExVat(afterDiscount)}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/60">DPH (23 %)</span>
            <span className="font-medium tabular-nums text-[#2f2924]">
              {formatPrice(priceIncludingVat(afterDiscount) - afterDiscount)}
            </span>
          </div>

          <div className="h-px bg-black/8" aria-hidden />

          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-[#2f2924]">
              Celkom k úhrade
            </span>
            <span className="font-heading text-2xl font-semibold tabular-nums text-[#2f2924]">
              {formatAmountIncVat(afterDiscount)}
            </span>
          </div>
        </div>

        <div className="border-t border-black/6 px-6 py-5 sm:px-7">
          {!ORDERS_ENABLED ? (
            <p className="mb-3 text-xs leading-snug text-[#2f2924]/50">
              Táto funkcia zatiaľ nie je sprístupnená.
            </p>
          ) : hasInvalidColor ? (
            <p className="mb-3 text-xs leading-snug text-[#9a4d3f]">
              Niektoré položky majú neplatný výber farby. Zvoľte platnú farbu v
              košíku pred pokračovaním k pokladni.
            </p>
          ) : !meetsMinOrder(subtotal) ? (
            <p className="mb-3 text-xs leading-snug text-[#2f2924]/50">
              Minimálna objednávka {formatPrice(MIN_ORDER_TOTAL)}, chýba{" "}
              {formatPrice(remainingMinOrder)}.
            </p>
          ) : null}
          {canCheckout ? (
            <Link
              href="/pokladna"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Pokračovať k pokladni
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled
              className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#2f2924]/25 text-sm font-medium text-white"
            >
              Pokračovať k pokladni
            </button>
          )}

          <button
            type="button"
            onClick={onSaveTemplateClick}
            className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/8 bg-white text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
          >
            <Layers className="size-4" strokeWidth={1.75} aria-hidden />
            Uložiť ako šablónu
          </button>

          <Link
            href="/"
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/8 bg-white text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
          >
            <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
            Pokračovať v nákupe
          </Link>
        </div>
      </div>

      {customer ? (
        <SaveCartTemplateModal
          open={templateOpen}
          onClose={() => setTemplateOpen(false)}
          customerId={customer.id}
          items={items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price,
          }))}
        />
      ) : null}

      <LoginRequiredModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </aside>
  );
}

function EmptyCart() {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/6 bg-white px-6 py-16 text-center sm:px-10">
      <p className="font-heading text-2xl font-semibold text-[#2f2924]">
        Váš košík je prázdny
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
        Pozrite si našu ponuku a pridajte si produkty, ktoré sa vám páčia.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#75825B] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Prejsť na produkty
      </Link>
    </div>
  );
}

function CartLoading() {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/6 bg-white px-6 py-16 text-center sm:px-10">
      <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#75825B]/25" />
      <p className="mt-5 text-sm text-[#2f2924]/60">Načítavam košík…</p>
    </div>
  );
}

function CartError({ message }: { message: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-6 py-12 text-center sm:px-10">
      <p className="font-heading text-xl font-semibold text-[#9a4d3f]">
        Košík sa nepodarilo načítať
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#9a4d3f]/85">
        {message}
      </p>
    </div>
  );
}

export function CartView() {
  const { items, loading, error } = useCartItemsState();
  const deferredItems = useDeferredValue(items);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const isWholesale = useIsWholesale();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next = await fetchClientCustomer();
      if (!cancelled) setCustomer(next);
    }

    void load();
    return subscribeClientAuth(() => {
      void load();
    });
  }, []);

  function updateQuantity(productId: string, lineOptionKey: string, next: number) {
    // Always read latest cart — React `items` can lag behind rapid stepper clicks.
    const item = readCartItems().find(
      (entry) =>
        entry.product.id === productId &&
        entry.lineOptionKey === lineOptionKey,
    );
    if (!item || item.unavailable) return;

    const multiple = getProductOrderMultiple(item.product.attributes?.packaging);
    const clamped = snapQuantityToMultiple(next, multiple);
    if (clamped <= 0 || clamped === item.quantity) return;
    const delta = clamped - item.quantity;
    if (delta === 0) return;

    const preview = previewInventoryDelta(item.product, -delta);
    if (!preview.ok) return;

    void setCartQuantity(productId, clamped, lineOptionKey);
  }

  function selectColor(
    productId: string,
    fromLineOptionKey: string,
    colorId: string,
  ) {
    void setCartLineColor(productId, colorId, fromLineOptionKey).catch(() => {
      /* keep previous selection; server/guest write failed */
    });
  }

  function removeItem(productId: string, lineOptionKey: string) {
    const item = readCartItems().find(
      (entry) =>
        entry.product.id === productId &&
        entry.lineOptionKey === lineOptionKey,
    );
    if (!item) {
      void removeFromCart(productId, lineOptionKey);
      return;
    }

    void removeFromCart(productId, lineOptionKey);
  }

  if (loading && items.length === 0) {
    return <CartLoading />;
  }

  if (error && items.length === 0) {
    return <CartError message={error} />;
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  const subtotal = cartSubtotalForAudience(
    deferredItems.filter((item) => !item.unavailable),
    isWholesale,
  );
  const count = cartItemCount(items.filter((item) => !item.unavailable));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(16rem,1fr)] lg:items-start lg:gap-8">
      <section
        aria-labelledby="cart-items-heading"
        className="overflow-hidden rounded-3xl border border-black/6 bg-white"
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-black/6 px-5 py-5 sm:px-7">
          <h2
            id="cart-items-heading"
            className="font-heading text-xl font-semibold text-[#2f2924] sm:text-2xl"
          >
            Položky v košíku
          </h2>
          <p className="text-sm text-[#2f2924]/55">
            {productCountLabel(count)}
          </p>
        </div>

        <ul className="divide-y divide-black/6 px-5 sm:px-7">
          {items.map((item) => (
            <CartLine
              key={`${item.product.id}:${item.lineOptionKey}`}
              item={item}
              isWholesale={isWholesale}
              onQuantityChange={(quantity) =>
                updateQuantity(item.product.id, item.lineOptionKey, quantity)
              }
              onSelectColor={(colorId) =>
                selectColor(item.product.id, item.lineOptionKey, colorId)
              }
              onRemove={() =>
                removeItem(item.product.id, item.lineOptionKey)
              }
            />
          ))}
        </ul>
      </section>

      <CartSummary
        items={deferredItems}
        subtotal={subtotal}
        customer={customer}
      />
    </div>
  );
}
