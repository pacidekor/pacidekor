import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, XCircle } from "lucide-react";
import { syncOrderPaidFromGopayPayment } from "@/lib/gopay-orders";
import { isGopayPaidState } from "@/lib/gopay";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Výsledok platby",
  description: "Stav platby objednávky.",
  path: "/pokladna/vysledok",
  noIndex: true,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isInterruptedPaymentState(state: string | null) {
  return (
    state === "CANCELED" ||
    state === "TIMEOUTED" ||
    state === "CREATED" ||
    state === "PAYMENT_METHOD_CHOSEN"
  );
}

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const paymentId = first(params.id)?.trim() || "";
  const orderFromQuery = first(params.order)?.trim() || "";

  let orderNumber = orderFromQuery;
  let state: string | null = null;
  let error: string | null = null;

  if (paymentId) {
    try {
      // No revalidatePath here — this page runs during render.
      const result = await syncOrderPaidFromGopayPayment(paymentId, {
        revalidate: false,
      });
      orderNumber = result.orderNumber || orderFromQuery;
      state = result.state;
    } catch (err) {
      error = err instanceof Error ? err.message : "Overenie platby zlyhalo.";
    }
  } else if (!orderFromQuery) {
    error = "Chýba identifikátor platby.";
  }

  const paid = isGopayPaidState(state);
  // Návrat z brány bez úspechu (zrušenie / späť) — nie „platba sa spracúva“.
  const interrupted =
    !error && !paid && (state == null || isInterruptedPaymentState(state));
  const unpaid = !error && !paid && !interrupted;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-black/6 bg-white px-6 py-14 text-center sm:px-10">
        {error ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-700">
              <XCircle className="size-8" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-[#2f2924]">
              Platbu sa nepodarilo overiť
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
              {error}
            </p>
          </>
        ) : paid ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#75825B]/12 text-[#75825B]">
              <CheckCircle2 className="size-8" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-[#2f2924]">
              Platba prebehla úspešne
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
              Objednávka{" "}
              <span className="font-medium text-[#2f2924]">
                {orderNumber || "—"}
              </span>{" "}
              je zaplatená. Ďakujeme.
            </p>
          </>
        ) : interrupted ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-800">
              <XCircle className="size-8" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-[#2f2924]">
              Platba bola prerušená
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
              Objednávka{" "}
              <span className="font-medium text-[#2f2924]">
                {orderNumber || "—"}
              </span>{" "}
              ostáva nezaplatená. Môžete sa vrátiť do obchodu a skúsiť platbu
              znova, alebo zvoliť iný spôsob (napr. dobierku).
            </p>
          </>
        ) : unpaid ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-700">
              <XCircle className="size-8" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-[#2f2924]">
              Platba neprebehla
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
              Objednávka{" "}
              <span className="font-medium text-[#2f2924]">
                {orderNumber || "—"}
              </span>{" "}
              ostáva nezaplatená
              {state ? ` (${state})` : ""}. Skúste to znova alebo zvoľte iný
              spôsob platby.
            </p>
          </>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#75825B] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
            Pokračovať v nákupe
          </Link>
          <Link
            href="/ucet"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/8 bg-white px-6 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B] sm:w-auto"
          >
            Moje objednávky
          </Link>
        </div>
      </div>
    </div>
  );
}
