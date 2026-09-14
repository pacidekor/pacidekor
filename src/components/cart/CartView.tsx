"use client";

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
  cartSubtotal,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
  readCartItems,
  removeFromCart,
  setCartQuantity,
  type CartItem,
} from "@/lib/cart";
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
import { adjustStockAction } from "@/lib/actions/inventory";
import {
  applyInventoryLocally,
  getInventoryForProduct,
  inventoryMaxOrderable,
  previewInventoryDelta,
  setInventory,
} from "@/lib/inventory";
import { productHref } from "@/lib/products";
import { productCountLabel } from "@/lib/product-count";
import {
  formatAmountExVat,
  formatAmountIncVat,
  formatPriceExVat,
  formatPriceIncVat,
  priceIncludingVat,
} from "@/lib/price";
import {
  alignMaxToOrderMultiple,
  getProductOrderMultiple,
  snapQuantityToMultiple,
} from "@/lib/taxonomy";
import { ORDERS_ENABLED } from "@/lib/shop-flags";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { useCartItems } from "@/lib/use-cart";
import { useIsWholesale } from "@/lib/use-is-wholesale";

/** Accumulate stock deltas while clicking; flush one server call after pause. */
const STOCK_SYNC_MS = 320;
const pendingStockDelta = new Map<
  string,
  { delta: number; timer: ReturnType<typeof setTimeout> }
>();

function scheduleStockSync(product: CartItem["product"], delta: number) {
  const existing = pendingStockDelta.get(product.id);
  if (existing) clearTimeout(existing.timer);

  const nextDelta = (existing?.delta ?? 0) + delta;
  const timer = setTimeout(() => {
    pendingStockDelta.delete(product.id);
    if (nextDelta === 0) return;

    void adjustStockAction(product.id, nextDelta).then((result) => {
      if (!result.ok) {
        const undo = previewInventoryDelta(product, -nextDelta);
        if (undo.ok) applyInventoryLocally(product.id, undo.entry);
        return;
      }
      setInventory(product.id, {
        inStock: result.data.inStock,
        quantity: result.data.stockQuantity,
      });
    });
  }, STOCK_SYNC_MS);

  pendingStockDelta.set(product.id, { delta: nextDelta, timer });
}

function CartLine({
  item,
  onQuantityChange,
  onRemove,
  isWholesale,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  isWholesale: boolean;
}) {
  const { product, quantity } = item;
  const deferredQuantity = useDeferredValue(quantity);
  const lineTotalNet = parsePrice(product.price) * deferredQuantity;
  const lineTotal = isWholesale
    ? lineTotalNet
    : priceIncludingVat(lineTotalNet);
  const inventory = getInventoryForProduct(product);
  const remaining = inventoryMaxOrderable(inventory);
  const orderMultiple = getProductOrderMultiple(product.attributes?.packaging);
  const rawMax =
    typeof remaining === "number"
      ? Math.max(orderMultiple, remaining + quantity)
      : undefined;
  const maxQty = alignMaxToOrderMultiple(rawMax, orderMultiple);

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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-4">
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
              {formatPrice(lineTotal)}
              {isWholesale ? (
                <span className="ml-1.5 text-xs font-normal text-[#2f2924]/45">
                  bez DPH
                </span>
              ) : null}
            </p>
            {deferredQuantity > 1 ? (
              <p className="mt-0.5 text-xs text-[#2f2924]/45">
                {isWholesale
                  ? `${formatPriceExVat(product.price)} / ks`
                  : `${formatPriceIncVat(product.price)} / ks`}
              </p>
            ) : null}
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
  isWholesale,
}: {
  items: CartItem[];
  subtotal: number;
  customer: Customer | null;
  isWholesale: boolean;
}) {
  const count = cartItemCount(items);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const discount = promo
    ? promoDiscountAmount(subtotal, promo.discountPercent)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const displaySubtotal = isWholesale
    ? subtotal
    : priceIncludingVat(subtotal);
  const displayDiscount = isWholesale
    ? discount
    : priceIncludingVat(discount);
  const displayAfterDiscount = isWholesale
    ? afterDiscount
    : priceIncludingVat(afterDiscount);
  const freeShipping = displayAfterDiscount >= FREE_SHIPPING_THRESHOLD;
  const canCheckout = ORDERS_ENABLED && meetsMinOrder(displaySubtotal);
  const remainingMinOrder = amountToMinOrder(displaySubtotal);
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
            <span className="text-[#2f2924]/60">
              {isWholesale ? "Medzisúčet bez DPH" : "Medzisúčet"}
            </span>
            <span className="font-medium text-[#2f2924]">
              {isWholesale
                ? formatAmountExVat(subtotal)
                : formatAmountIncVat(subtotal)}
            </span>
          </div>

          <PromoCodeField subtotal={subtotal} onPromoChange={setPromo} />

          {discount > 0 && promo ? (
            <AppliedPromoLine promo={promo} discountAmount={displayDiscount} />
          ) : null}

          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/60">Doprava</span>
            <span className="font-medium text-[#2f2924]">
              {freeShipping ? "Zadarmo" : "Vypočíta sa pri pokladni"}
            </span>
          </div>

          <FreeShippingProgress
            current={displayAfterDiscount}
            threshold={FREE_SHIPPING_THRESHOLD}
          />

          <div className="h-px bg-black/8" aria-hidden />

          {isWholesale ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[#2f2924]">
                  Celkom bez DPH
                </span>
                <span className="font-heading text-2xl font-semibold text-[#2f2924]">
                  {formatAmountExVat(afterDiscount)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#2f2924]/60">Celkom s DPH</span>
                <span className="text-base font-medium text-[#2f2924]/70">
                  {formatAmountIncVat(afterDiscount)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-[#2f2924]">Celkom</span>
              <span className="font-heading text-2xl font-semibold text-[#2f2924]">
                {formatPrice(displayAfterDiscount)}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-black/6 px-6 py-5 sm:px-7">
          {!ORDERS_ENABLED ? (
            <p className="mb-3 text-xs leading-snug text-[#2f2924]/50">
              Táto funkcia zatiaľ nie je sprístupnená.
            </p>
          ) : !canCheckout ? (
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

export function CartView() {
  const items = useCartItems();
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

  function updateQuantity(productId: string, next: number) {
    // Always read latest cart — React `items` can lag behind rapid stepper clicks.
    const item = readCartItems().find((entry) => entry.product.id === productId);
    if (!item) return;

    const multiple = getProductOrderMultiple(item.product.attributes?.packaging);
    const clamped = snapQuantityToMultiple(next, multiple);
    if (clamped <= 0 || clamped === item.quantity) return;
    const delta = clamped - item.quantity;
    if (delta === 0) return;

    const previous = getInventoryForProduct(item.product);
    const preview = previewInventoryDelta(item.product, -delta);
    if (!preview.ok) return;

    applyInventoryLocally(item.product.id, preview.entry);
    void setCartQuantity(productId, clamped).catch(() => {
      applyInventoryLocally(item.product.id, previous);
    });

    if (preview.needsServerSync) {
      scheduleStockSync(item.product, -delta);
    }
  }

  function removeItem(productId: string) {
    const item = readCartItems().find((entry) => entry.product.id === productId);
    if (!item) {
      void removeFromCart(productId);
      return;
    }

    const pending = pendingStockDelta.get(productId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingStockDelta.delete(productId);
    }

    const previous = getInventoryForProduct(item.product);
    const preview = previewInventoryDelta(item.product, item.quantity);
    if (preview.ok) {
      applyInventoryLocally(item.product.id, preview.entry);
    }

    void removeFromCart(productId).catch(() => {
      applyInventoryLocally(item.product.id, previous);
    });

    if (preview.ok && preview.needsServerSync) {
      const flushDelta = (pending?.delta ?? 0) + item.quantity;
      if (flushDelta !== 0) {
        void adjustStockAction(item.product.id, flushDelta).then((result) => {
          if (!result.ok) {
            applyInventoryLocally(item.product.id, previous);
            return;
          }
          setInventory(item.product.id, {
            inStock: result.data.inStock,
            quantity: result.data.stockQuantity,
          });
        });
      }
    }
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  const subtotal = cartSubtotal(deferredItems);
  const count = cartItemCount(items);

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
              key={item.product.id}
              item={item}
              isWholesale={isWholesale}
              onQuantityChange={(quantity) =>
                updateQuantity(item.product.id, quantity)
              }
              onRemove={() => removeItem(item.product.id)}
            />
          ))}
        </ul>
      </section>

      <CartSummary
        items={deferredItems}
        subtotal={subtotal}
        customer={customer}
        isWholesale={isWholesale}
      />
    </div>
  );
}
