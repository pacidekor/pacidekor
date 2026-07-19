import { ProductCarousel } from "@/components/ProductCarousel";
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

      <div className="mt-6">
        <ProductCarousel
          products={products}
          enableHoverImage
          desktopCols="related"
        />
      </div>
    </section>
  );
}
