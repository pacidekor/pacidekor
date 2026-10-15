"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ShoppingCart, X } from "lucide-react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { adjustStockAction } from "@/lib/actions/inventory";
import { addToCart } from "@/lib/cart";
import {
  applyInventoryLocally,
  getInventoryForProduct,
  inventoryMaxOrderable,
  isInventoryAvailable,
  previewInventoryDelta,
  setInventory,
} from "@/lib/inventory";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import {
  audienceNetFromCatalogPrice,
  formatAudiencePriceExVat,
  formatAudiencePriceIncVat,
  formatPrice,
  priceIncludingVat,
} from "@/lib/price";
import {
  getColorPreviewImages,
  type Product,
} from "@/lib/products";
import {
  alignMaxToOrderMultiple,
  formatPackagingDeliveryHintShort,
  getPrimaryPackagingOption,
  getProductOrderMultiple,
  snapQuantityToMultiple,
} from "@/lib/taxonomy";
import { useIsWholesale } from "@/lib/use-is-wholesale";
import { useProductInventory } from "@/lib/use-product-inventory";

const RESET_MS = 1400;

type AddToCartQuantityModalProps = {
  open: boolean;
  onClose: () => void;
  product: Product;
  colorId?: string;
};

export function AddToCartQuantityModal({
  open,
  onClose,
  product,
  colorId,
}: AddToCartQuantityModalProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isWholesale = useIsWholesale();
  const inventory = useProductInventory(product);
  const available = isInventoryAvailable(inventory);
  const stockMax = inventoryMaxOrderable(inventory);
  const orderMultiple = getProductOrderMultiple(product.attributes?.packaging);
  const packagingOption = getPrimaryPackagingOption(
    product.attributes?.packaging,
  );
  const packagingHint = packagingOption
    ? formatPackagingDeliveryHintShort(packagingOption)
    : null;
  const maxQty = alignMaxToOrderMultiple(stockMax, orderMultiple);
  const canOrderPack =
    available && (typeof maxQty !== "number" || maxQty >= orderMultiple);

  const [quantity, setQuantity] = useState(orderMultiple);
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview =
    colorId != null
      ? getColorPreviewImages(product, colorId)
      : { image: product.image };

  const unitEx = formatAudiencePriceExVat(product.price, isWholesale);
  const unitInc = formatAudiencePriceIncVat(product.price, isWholesale);
  const unitNet = audienceNetFromCatalogPrice(product.price, isWholesale);
  const totalEx = formatPrice(unitNet * quantity);
  const totalInc = formatPrice(priceIncludingVat(unitNet) * quantity);

  useEffect(() => {
    if (!open) return;

    setAdded(false);
    setSubmitting(false);
    setQuantity(orderMultiple);

    const unlock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      unlock();
      document.removeEventListener("keydown", onKeyDown);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, orderMultiple]);

  useEffect(() => {
    if (!open) return;
    if (!canOrderPack) {
      setQuantity(orderMultiple);
      return;
    }
    setQuantity((prev) =>
      snapQuantityToMultiple(
        prev,
        orderMultiple,
        typeof maxQty === "number" ? maxQty : undefined,
      ) || orderMultiple,
    );
  }, [open, canOrderPack, maxQty, orderMultiple]);

  async function handleConfirm() {
    if (added || submitting || !canOrderPack) return;

    const qty =
      snapQuantityToMultiple(
        quantity,
        orderMultiple,
        typeof maxQty === "number" ? maxQty : undefined,
      ) || orderMultiple;

    const previous = getInventoryForProduct(product);
    const previewDelta = previewInventoryDelta(product, -qty);
    if (!previewDelta.ok) return;

    setSubmitting(true);
    applyInventoryLocally(product.id, previewDelta.entry);

    try {
      await addToCart(product, qty, colorId);
    } catch {
      applyInventoryLocally(product.id, previous);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setAdded(true);

    if (previewDelta.needsServerSync) {
      void adjustStockAction(product.id, -qty).then((result) => {
        if (!result.ok) {
          applyInventoryLocally(product.id, previous);
          return;
        }
        setInventory(product.id, {
          inStock: result.data.inStock,
          quantity: result.data.stockQuantity,
        });
      });
    }

    closeTimerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, RESET_MS);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_20px_48px_rgba(47,41,36,0.22)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavrieť"
          className="absolute top-3 right-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-[#2f2924]/55 transition-colors hover:bg-black/5 hover:text-[#2f2924]"
        >
          <X className="size-5" strokeWidth={1.75} aria-hidden />
        </button>

        <div className="flex flex-col gap-6 p-5 pt-6 sm:gap-7 sm:p-7">
          <div className="flex items-start gap-4 pr-8 sm:gap-5">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-[#f3efe9] sm:size-32">
              <Image
                src={preview.image}
                alt=""
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2
                id={titleId}
                className="font-heading text-xl font-semibold leading-snug text-[#2f2924] sm:text-2xl"
              >
                {product.name}
              </h2>
              <p className="mt-3 text-xl font-semibold text-[#2f2924] sm:text-2xl">
                {unitEx}
                <span className="ml-1.5 text-sm font-medium text-[#2f2924]/45">
                  / ks
                </span>
              </p>
              <p className="mt-1 text-sm text-[#2f2924]/50 sm:text-base">
                {unitInc} s DPH
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold text-[#2f2924]">
                  Množstvo
                </span>
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  max={typeof maxQty === "number" ? maxQty : undefined}
                  min={orderMultiple}
                  step={orderMultiple}
                  size="md"
                  aria-label={`Množstvo pre ${product.name}`}
                />
              </div>
              {packagingHint ? (
                <p className="text-sm text-[#2f2924]/55">{packagingHint}</p>
              ) : null}
              {!canOrderPack ? (
                <p className="text-sm text-[#9a4d3f]">
                  {available
                    ? "Na sklade nie je dostatok kusov pre celé balenie."
                    : "Produkt je momentálne vypredaný."}
                </p>
              ) : null}
            </div>

            <div
              className="border-t border-black/10"
              aria-hidden
            />

            <div className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold text-[#2f2924]">
                Celkom{" "}
                <span className="font-medium text-[#2f2924]/55">
                  ({quantity}&nbsp;ks)
                </span>
              </span>
              <div className="text-right">
                <p className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
                  {totalEx}
                </p>
                <p className="mt-0.5 text-sm text-[#2f2924]/50">
                  {totalInc} s DPH
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!canOrderPack || submitting}
              className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-medium text-white transition-[background-color,transform,opacity] sm:h-14 sm:text-lg ${
                !canOrderPack || submitting
                  ? "cursor-not-allowed bg-[#2f2924]/25"
                  : added
                    ? "cursor-pointer bg-[#5f6a49]"
                    : "cursor-pointer bg-[#75825B] hover:opacity-90 active:scale-[0.99]"
              }`}
            >
              <span className="relative grid size-5 place-items-center">
                <ShoppingCart
                  className={`size-5 transition-all duration-300 ${
                    added
                      ? "scale-50 rotate-12 opacity-0"
                      : "scale-100 opacity-100"
                  }`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <Check
                  className={`absolute size-5 transition-all duration-300 ${
                    added
                      ? "scale-100 opacity-100"
                      : "scale-50 -rotate-12 opacity-0"
                  }`}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </span>
              {added
                ? "Pridané"
                : submitting
                  ? "Pridávam…"
                  : canOrderPack
                    ? "Pridať do košíka"
                    : "Vypredané"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
