import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/cart/CartView";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Košík",
  description: "Prehľad produktov v košíku a súhrn objednávky.",
  path: "/kosik",
  noIndex: true,
});

export default function KosikPage() {
  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Košík</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Košík</h1>
        <p className="mt-2 text-base leading-relaxed text-[#2f2924]/65">
          Skontrolujte položky a pokračujte k pokladni.
        </p>
      </header>

      <div className="mt-8">
        <CartView />
      </div>
    </main>
  );
}
