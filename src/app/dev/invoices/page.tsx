import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Faktúra preview | Dev",
  robots: { index: false, follow: false },
};

export default function DevInvoicesPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.14em] text-[#75825B] uppercase">
        Localhost · Dev only
      </p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-[#2f2924]">
        Náhľad faktúr (PDF)
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#2f2924]/65">
        Ukážkové PDF bez QR. GoPay = už uhradené; dobierka = platba pri prevzatí.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href="/dev/invoices/paid.pdf"
            className="inline-flex h-11 items-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white"
          >
            Preview — GoPay (uhradené)
          </Link>
        </li>
        <li>
          <Link
            href="/dev/invoices/cod.pdf"
            className="inline-flex h-11 items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924]"
          >
            Preview — Dobierka
          </Link>
        </li>
      </ul>
    </main>
  );
}
