import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";

type RelatedProductsProps = {
  products: Product[];
};

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-14 w-full">
      <h2 className="text-2xl text-[#2f2924] sm:text-3xl">
        Mohlo by sa vám páčiť
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-7">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
