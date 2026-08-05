"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/QuantityStepper";
import {
  amountToMinOrder,
  cartItemCount,
  cartSubtotal,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
  removeFromCart,
  setCartQuantity,
  type CartItem,
} from "@/lib/cart";
import { productHref } from "@/lib/products";
import {
  adjustInventory,
  getInventoryForProduct,
  inventoryMaxOrderable,
} from "@/lib/inventory";
import { useCartItems } from "@/lib/use-cart";

function productCountLabel(count: number) {
  if (count === 1) return "1 produkt";
  if (count < 5) return `${count} produkty`;
  return `${count} produktov`;
}

function CartLine({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { product, quantity } = item;
  const lineTotal = parsePrice(product.price) * quantity;
  const inventory = getInventoryForProduct(product);
  const remaining = inventoryMaxOrderable(inventory);
  const maxQty =
    typeof remaining === "number"
      ? Math.max(1, remaining + quantity)
      : undefined;

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
            size="sm"
            aria-label={`Množstvo: ${product.name}`}
          />

          <div className="text-right">
            <p className="font-heading text-lg font-semibold text-[#2f2924]">
              {formatPrice(lineTotal)}
            </p>
            {quantity > 1 ? (
              <p className="mt-0.5 text-xs text-[#2f2924]/45">
                {product.price} / ks
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function CartSummary({
  items,
  subtotal,
}: {
  items: CartItem[];
  subtotal: number;
}) {
  const count = cartItemCount(items);
  const shippingThreshold = 100;
  const freeShipping = subtotal >= shippingThreshold;
  const remainingShipping = Math.max(0, shippingThreshold - subtotal);
  const canCheckout = meetsMinOrder(subtotal);
  const remainingMinOrder = amountToMinOrder(subtotal);

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
            <span className="text-[#2f2924]/60">Medzisúčet</span>
            <span className="font-medium text-[#2f2924]">
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#2f2924]/60">Doprava</span>
            <span className="font-medium text-[#2f2924]">
              {freeShipping ? "Zadarmo" : "Pri pokladni"}
            </span>
          </div>

          <p className="text-xs leading-snug text-[#2f2924]/50">
            {freeShipping
              ? "Máte dopravu zadarmo."
              : `Do dopravy zadarmo chýba ${formatPrice(remainingShipping)}.`}
          </p>

          <div className="h-px bg-black/8" aria-hidden />

          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-[#2f2924]">Celkom</span>
            <span className="font-heading text-2xl font-semibold text-[#2f2924]">
              {formatPrice(subtotal)}
            </span>
          </div>
        </div>

        <div className="border-t border-black/6 px-6 py-5 sm:px-7">
          {!canCheckout ? (
            <p className="mb-3 text-xs leading-snug text-[#2f2924]/50">
              Minimálna objednávka {formatPrice(MIN_ORDER_TOTAL)}, chýba{" "}
              {formatPrice(remainingMinOrder)}.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!canCheckout}
            aria-disabled={!canCheckout}
            className={`inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-white transition-opacity ${
              canCheckout
                ? "cursor-pointer bg-[#75825B] hover:opacity-90"
                : "cursor-not-allowed bg-[#2f2924]/25"
            }`}
          >
            Pokračovať k pokladni
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

  async function updateQuantity(productId: string, next: number) {
    const item = items.find((entry) => entry.product.id === productId);
    if (!item) return;

    const clamped = Math.max(1, next);
    const delta = clamped - item.quantity;
    if (delta === 0) return;

    const result = await adjustInventory(item.product, -delta);
    if (!result.ok) return;

    try {
      await setCartQuantity(productId, clamped);
    } catch {
      await adjustInventory(item.product, delta);
    }
  }

  async function removeItem(productId: string) {
    const item = items.find((entry) => entry.product.id === productId);
    if (item) {
      await adjustInventory(item.product, item.quantity);
    }
    try {
      await removeFromCart(productId);
    } catch {
      if (item) await adjustInventory(item.product, -item.quantity);
    }
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  const subtotal = cartSubtotal(items);
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
              onQuantityChange={(quantity) =>
                updateQuantity(item.product.id, quantity)
              }
              onRemove={() => removeItem(item.product.id)}
            />
          ))}
        </ul>
      </section>

      <CartSummary items={items} subtotal={subtotal} />
    </div>
  );
}
