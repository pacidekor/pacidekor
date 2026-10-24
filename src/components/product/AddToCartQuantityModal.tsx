"use client";

import { salesUnitLabel } from "@/lib/sales-unit";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ShoppingCart, X } from "lucide-react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ProductVariantPills } from "@/components/product/ProductVariantPills";
import { addToCart } from "@/lib/cart";
import {
  getInventoryForProduct,
  inventoryMaxOrderable,
  isInventoryAvailable,
  previewInventoryDelta,
} from "@/lib/inventory";
import {
  isColorOrderable,
  isProductOrderableByColors,
} from "@/lib/order-line-color";
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
  catalogNetForTextVariant,
  findTextVariant,
  firstOrderableVariant,
  formatCentsAsPrice,
  type TextVariant,
} from "@/lib/product-variants";
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

type DetailLoadState = "idle" | "loading" | "ready" | "error";

type AddToCartQuantityModalProps = {
  open: boolean;
  onClose: () => void;
  product: Product;
  colorId?: string;
  variantId?: string;
};

export function AddToCartQuantityModal({
  open,
  onClose,
  product: listProduct,
  colorId,
  variantId: initialVariantId,
}: AddToCartQuantityModalProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isCustom = listProduct.variantMode === "custom";
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailState, setDetailState] = useState<DetailLoadState>("idle");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const product = isCustom && detailProduct ? detailProduct : listProduct;
  const variants: TextVariant[] = product.textVariants ?? [];

  const isWholesale = useIsWholesale();
  const inventory = useProductInventory(product);
  const inventoryAvailable = isInventoryAvailable(inventory);
  const colorIds =
    product.attributes?.colors ?? product.colors?.map((c) => c.id);

  const selectedVariant = findTextVariant(variants, selectedVariantId);
  const catalogUnitPrice =
    isCustom && selectedVariant
      ? catalogNetForTextVariant(selectedVariant.priceCents, product.discount)
      : product.price;
  const catalogOriginal =
    isCustom && selectedVariant && product.discount
      ? formatCentsAsPrice(selectedVariant.priceCents)
      : product.originalPrice;

  const productOrderable = isCustom
    ? inventoryAvailable && variants.some((v) => v.available)
    : isProductOrderableByColors({
        productInStock: inventoryAvailable,
        colorIds,
        unavailableColorIds: product.unavailableColorIds,
      });
  const selectedOk = isCustom
    ? Boolean(selectedVariant?.available)
    : !colorId ||
      !colorIds?.length ||
      isColorOrderable(colorId, colorIds, product.unavailableColorIds);
  const available = productOrderable && selectedOk;
  const stockMax = inventoryMaxOrderable(inventory);
  const orderMultiple = getProductOrderMultiple(product.attributes?.packaging);
  const packagingOption = getPrimaryPackagingOption(
    product.attributes?.packaging,
  );
  const packagingHint = packagingOption
    ? formatPackagingDeliveryHintShort(packagingOption)
    : null;
  const maxQty = alignMaxToOrderMultiple(stockMax, orderMultiple);
  const detailReady = !isCustom || detailState === "ready";
  const canOrderPack =
    detailReady &&
    available &&
    (typeof maxQty !== "number" || maxQty >= orderMultiple);

  const [quantity, setQuantity] = useState(orderMultiple);
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview =
    isCustom && selectedVariant?.imageUrls?.[0]
      ? { image: selectedVariant.imageUrls[0]! }
      : colorId != null
        ? getColorPreviewImages(product, colorId)
        : { image: product.image };

  const unitEx = formatAudiencePriceExVat(catalogUnitPrice, isWholesale);
  const unitInc = formatAudiencePriceIncVat(catalogUnitPrice, isWholesale);
  const unitExOriginal = catalogOriginal
    ? formatAudiencePriceExVat(catalogOriginal, isWholesale)
    : undefined;
  const unitNet = audienceNetFromCatalogPrice(catalogUnitPrice, isWholesale);
  const totalEx = formatPrice(unitNet * quantity);
  const totalInc = formatPrice(priceIncludingVat(unitNet) * quantity);

  useEffect(() => {
    if (!open) {
      setDetailProduct(null);
      setDetailState("idle");
      setSelectedVariantId("");
      return;
    }

    setAdded(false);
    setSubmitting(false);
    setQuantity(orderMultiple);

    const unlock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    let cancelled = false;

    if (isCustom) {
      setDetailState("loading");
      void (async () => {
        try {
          const res = await fetch(
            `/api/products/by-ids?ids=${encodeURIComponent(listProduct.id)}`,
            { cache: "no-store" },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as { products?: Product[] };
          const full = json.products?.[0];
          if (!full || cancelled) {
            if (!cancelled) setDetailState("error");
            return;
          }
          const tvs = full.textVariants ?? [];
          const defaultId =
            initialVariantId ||
            firstOrderableVariant(tvs, full.defaultVariantId)?.id ||
            tvs[0]?.id ||
            "";
          setDetailProduct(full);
          setSelectedVariantId(defaultId);
          setDetailState("ready");
        } catch {
          if (!cancelled) setDetailState("error");
        }
      })();
    } else {
      setDetailState("ready");
      setSelectedVariantId(initialVariantId ?? "");
    }

    return () => {
      cancelled = true;
      unlock();
      document.removeEventListener("keydown", onKeyDown);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open / product id
  }, [open, listProduct.id, isCustom, orderMultiple, initialVariantId]);

  useEffect(() => {
    if (!open || !detailReady) return;
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
  }, [open, detailReady, canOrderPack, maxQty, orderMultiple, selectedVariantId]);

  async function handleConfirm() {
    if (added || submitting || !canOrderPack) return;
    if (isCustom && !selectedVariantId) return;

    const qty =
      snapQuantityToMultiple(
        quantity,
        orderMultiple,
        typeof maxQty === "number" ? maxQty : undefined,
      ) || orderMultiple;

    const previewDelta = previewInventoryDelta(product, -qty);
    if (!previewDelta.ok) return;

    setSubmitting(true);

    try {
      await addToCart(product, qty, {
        colorId: isCustom ? undefined : colorId,
        variantId: isCustom ? selectedVariantId : undefined,
      });
    } catch {
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setAdded(true);

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
        className="relative z-10 max-h-[min(92vh,40rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-black/8 bg-white shadow-[0_20px_48px_rgba(47,41,36,0.22)]"
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
              {detailState === "loading" ? (
                <p className="mt-3 text-sm text-[#2f2924]/55">Načítavam varianty…</p>
              ) : detailState === "error" ? (
                <p className="mt-3 text-sm text-[#9a4d3f]">
                  Varianty sa nepodarilo načítať. Skúste znova.
                </p>
              ) : (
                <>
                  <p className="mt-3 text-xl font-semibold text-[#2f2924] sm:text-2xl">
                    {unitExOriginal ? (
                      <>
                        <span className="text-[#c45c4a]">{unitEx}</span>
                        <span className="ml-2 text-base font-medium text-[#2f2924]/45 line-through">
                          {unitExOriginal}
                        </span>
                      </>
                    ) : (
                      unitEx
                    )}
                    <span className="ml-1.5 text-sm font-medium text-[#2f2924]/45">
                      / {salesUnitLabel(product.attributes?.packaging)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[#2f2924]/50 sm:text-base">
                    {unitInc} s DPH
                  </p>
                </>
              )}
            </div>
          </div>

          {isCustom && detailState === "ready" && variants.length > 0 ? (
            <ProductVariantPills
              axisLabel={product.variantAxisLabel || "Varianta"}
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelect={setSelectedVariantId}
            />
          ) : null}

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
              {!canOrderPack && detailReady ? (
                <p className="text-sm text-[#9a4d3f]">
                  {available
                    ? "Na sklade nie je dostatok kusov pre celé balenie."
                    : isCustom && selectedVariant && !selectedVariant.available
                      ? "Vybraná varianta je vypredaná."
                      : "Produkt je momentálne vypredaný."}
                </p>
              ) : null}
            </div>

            <div className="border-t border-black/10" aria-hidden />

            <div className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold text-[#2f2924]">
                Celkom{" "}
                <span className="font-medium text-[#2f2924]/55">
                  ({quantity}&nbsp;{salesUnitLabel(product.attributes?.packaging) === "sada" ? "sád" : "ks"})
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
                  : detailState === "loading"
                    ? "Načítavam…"
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
