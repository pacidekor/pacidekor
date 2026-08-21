import type { Metadata } from "next";
import Link from "next/link";
import { AkciaProductGrid } from "@/components/AkciaProductGrid";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Akcia",
  description:
    "Aktuálne akciové produkty - umelé kvety a dekorácie so zľavou od PACIDEKOR.",
  path: "/akcia",
});

export default function AkciaPage() {
  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Akcia</span>
      </nav>

      <AkciaProductGrid />
    </main>
  );
}
