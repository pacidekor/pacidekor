import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicOrderDetail } from "@/components/orders/PublicOrderDetail";
import {
  buildMockPublicOrder,
  isPublicOrderPreviewNumber,
  isPublicOrderPreviewToken,
} from "@/lib/mock-public-order";
import { normalizeOrderNumberInput } from "@/lib/orders";
import { verifyOrderViewToken } from "@/lib/order-view-token";
import { getOrderByNumberFromDb } from "@/lib/orders.server";
import { listProducts } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const { t: token } = await searchParams;
  const normalized = normalizeOrderNumberInput(decodeURIComponent(orderNumber));
  const isPreview =
    isPublicOrderPreviewToken(token) || isPublicOrderPreviewNumber(normalized);

  return pageMetadata({
    title: isPreview
      ? "Náhľad objednávky"
      : normalized
        ? `Objednávka ${normalized}`
        : "Objednávka",
    description: "Detail objednávky PACIDEKOR.",
    path: `/objednavka/${encodeURIComponent(normalized || orderNumber)}`,
    noIndex: true,
  });
}

export default async function PublicOrderPage({
  params,
  searchParams,
}: PageProps) {
  const { orderNumber: rawNumber } = await params;
  const { t: token } = await searchParams;
  const orderNumber = normalizeOrderNumberInput(decodeURIComponent(rawNumber));
  const isPreview =
    isPublicOrderPreviewToken(token) || isPublicOrderPreviewNumber(orderNumber);

  if (isPreview) {
    const products = await listProducts();
    const order = buildMockPublicOrder(products);

    return (
      <main className="flex flex-1 flex-col py-6 pb-14">
        <nav className="mb-6 text-sm text-[#2f2924]/55">
          <Link href="/" className="transition-colors hover:text-[#75825B]">
            Domov
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-[#2f2924]">Náhľad objednávky</span>
        </nav>

        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#75825B] uppercase">
            Mock · len náhľad
          </p>
          <h1 className="mt-2 text-3xl text-[#2f2924] sm:text-4xl">
            Detail objednávky
          </h1>
          <p className="mt-2 text-base leading-relaxed text-[#2f2924]/65">
            Ukážka toho, čo zákazník uvidí po kliknutí z e-mailu. Bez platby,
            len prehľad produktov a súhrn.
          </p>
        </header>

        <div className="mt-8">
          <PublicOrderDetail order={order} />
        </div>
      </main>
    );
  }

  if (!orderNumber || !verifyOrderViewToken(orderNumber, token ?? "")) {
    notFound();
  }

  const order = await getOrderByNumberFromDb(orderNumber);
  if (!order) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Objednávka {order.id}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">
          Detail objednávky
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[#2f2924]/65">
          Stav a položky objednávky{" "}
          <span className="font-medium text-[#2f2924]">{order.id}</span>.
        </p>
      </header>

      <div className="mt-8">
        <PublicOrderDetail order={order} />
      </div>
    </main>
  );
}
