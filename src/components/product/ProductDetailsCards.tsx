import type { ProductDetail } from "@/lib/products";

type ProductDetailsCardsProps = {
  details: ProductDetail[];
};

export function ProductDetailsCards({ details }: ProductDetailsCardsProps) {
  return (
    <div className="mt-8 grid gap-3">
      {details.map((detail) => (
        <div
          key={detail.title}
          className="rounded-2xl bg-white px-4 py-4 sm:px-5 sm:py-5"
        >
          <h3 className="font-sans text-sm font-semibold text-[#2f2924]">
            {detail.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#2f2924]/70">
            {detail.content}
          </p>
        </div>
      ))}
    </div>
  );
}
