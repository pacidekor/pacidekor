"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BellIcon } from "@/components/icons/BellIcon";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ProductColorPills } from "@/components/product/ProductColorPills";
import { RestockNotifyModal } from "@/components/product/RestockNotifyModal";
import {
  inventoryMaxOrderable,
  isInventoryAvailable,
} from "@/lib/inventory";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";

type ProductPurchaseProps = {
  product: Product;
  selectedColor?: string;
  onSelectColor?: (colorId: string) => void;
};

export function ProductPurchase({
  product,
  selectedColor: controlledColor,
  onSelectColor,
}: ProductPurchaseProps) {
  const inventory = useProductInventory(product);
  const available = isInventoryAvailable(inventory);
  const maxQty = inventoryMaxOrderable(inventory);

  const [quantity, setQuantity] = useState(1);
  const [restockOpen, setRestockOpen] = useState(false);
  const [internalColor, setInternalColor] = useState(
    product.colors?.[0]?.id ?? "",
  );
  const selectedColor = controlledColor ?? internalColor;
  const setSelectedColor = onSelectColor ?? setInternalColor;

  useEffect(() => {
    if (!available) {
      setQuantity(1);
      return;
    }
    if (typeof maxQty === "number") {
      setQuantity((prev) => Math.min(Math.max(1, prev), maxQty));
    }
  }, [available, maxQty]);

  const hasColors = Boolean(product.colors && product.colors.length > 0);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {hasColors ? (
        <ProductColorPills
          colors={product.colors!}
          selectedColorId={selectedColor}
          onSelect={setSelectedColor}
        />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <ProductPriceDisplay
            price={product.price}
            originalPrice={product.originalPrice}
            variant="pdp"
          />
        </div>

        <div className="flex w-fit max-w-full flex-col items-end gap-1.5 self-end sm:self-auto">
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={typeof maxQty === "number" ? maxQty : undefined}
              min={1}
            />

            <AddToCartButton
              product={product}
              quantity={quantity}
              colorId={selectedColor || undefined}
              disabled={!available}
              size="page"
            />

            {!available ? (
              <button
                type="button"
                onClick={() => setRestockOpen(true)}
                aria-label="Upozorniť na naskladnenie"
                title="Upozorniť na naskladnenie"
                className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#75825B] text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
              >
                <BellIcon className="size-5" />
              </button>
            ) : null}
          </div>

          <p
            className={`text-right text-sm ${
              available
                ? "text-[#2f2924]/55"
                : "font-medium text-[#c45c4a]"
            }`}
          >
            {available
              ? typeof maxQty === "number"
                ? `Na sklade: ${maxQty} ks`
                : "Na sklade"
              : "Momentálne nie je na sklade"}
          </p>
        </div>
      </div>

      <RestockNotifyModal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        product={product}
        colorId={selectedColor || undefined}
      />
    </div>
  );
}
