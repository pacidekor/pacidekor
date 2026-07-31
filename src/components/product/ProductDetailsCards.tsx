import {
  Flower,
  Layers,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { ProductDetail } from "@/lib/products";

type ProductDetailsCardsProps = {
  details: ProductDetail[];
};

const detailIcons: Record<string, LucideIcon> = {
  Materiál: Layers,
  Použitie: Flower,
  Doprava: Truck,
};

export function ProductDetailsCards({ details }: ProductDetailsCardsProps) {
  const visibleDetails = details.filter((detail) => detail.content.trim());

  if (visibleDetails.length === 0) return null;

  return (
    <div className="mt-8 grid gap-3">
      {visibleDetails.map((detail) => {
        const Icon = detailIcons[detail.title];

        return (
          <div
            key={detail.title}
            className="rounded-2xl bg-white px-4 py-4 sm:px-5 sm:py-5"
          >
            <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-[#2f2924]">
              {Icon ? (
                <Icon
                  className="size-5 shrink-0 text-[#75825B]/70"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : null}
              {detail.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#2f2924]/70">
              {detail.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
