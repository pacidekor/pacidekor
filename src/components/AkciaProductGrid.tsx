"use client";

import { ProductCard } from "@/components/ProductCard";
import { useAkciaProducts } from "@/lib/use-akcia-products";

export function AkciaProductGrid() {
  const products = useAkciaProducts();

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#2f2924]/12 bg-white/50 px-6 py-16 text-center">
        <p className="text-sm font-medium text-[#2f2924]">
          Momentálne nie sú žiadne akcie
        </p>
        <p className="mt-1 text-sm text-[#2f2924]/50">
          Nové akciové produkty sa tu zobrazia automaticky.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
