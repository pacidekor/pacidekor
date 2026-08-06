import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Pokladňa",
  description: "Vyplňte fakturačné údaje a dokončite objednávku.",
};

export default function PokladnaPage() {
  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link href="/kosik" className="transition-colors hover:text-[#75825B]">
          Košík
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Pokladňa</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Pokladňa</h1>
        <p className="mt-2 text-base leading-relaxed text-[#2f2924]/65">
          Vyplňte fakturačné údaje a skontrolujte súhrn objednávky.
        </p>
      </header>

      <div className="mt-8">
        <CheckoutView />
      </div>
    </main>
  );
}
