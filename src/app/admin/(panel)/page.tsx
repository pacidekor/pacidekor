import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Package,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { countPendingWholesaleRegistrations } from "@/lib/actions/auth";
import {
  buildRevenueSeries,
  formatChangeHint,
  formatEuro,
  formatProductRevenue,
  getRevenueKpis,
  getTopProductsFallback,
} from "@/lib/analytics";
import {
  orderStatusClass,
  PENDING_ORDER_STATUSES,
  pendingOrdersForDashboard,
  recentOrdersForDashboard,
} from "@/lib/orders";
import { listOrdersFromDb } from "@/lib/orders.server";
import { setProductCatalog } from "@/lib/product-catalog";
import { listProductsForAdmin } from "@/lib/products-server";

export const dynamic = "force-dynamic";

function hintClass(hint: string) {
  const trimmed = hint.trimStart();
  if (trimmed.startsWith("+")) return "font-medium text-[#75825B]";
  if (trimmed.startsWith("-")) return "font-medium text-[#c45c4a]";
  return "text-[#2f2924]/40";
}

function OrderRow({
  order,
}: {
  order: {
    number: string;
    customer: string;
    price: string;
    status: string;
    createdAt: string;
  };
}) {
  return (
    <Link
      href={`/admin/objednavky?id=${order.number}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#faf8f5]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-[#2f2924]">
          {order.customer}
        </p>
        <p className="mt-0.5 text-xs text-[#2f2924]/40">#{order.number}</p>
        <p className="mt-0.5 text-xs text-[#2f2924]/45">{order.createdAt}</p>
      </div>

      <span
        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${orderStatusClass(order.status)}`}
      >
        {order.status}
      </span>

      <p className="min-w-[4.5rem] shrink-0 text-right text-[15px] font-semibold whitespace-nowrap tabular-nums text-[#2f2924] sm:min-w-[5.25rem]">
        {order.price}
      </p>
    </Link>
  );
}

export default async function AdminPage() {
  const orders = await listOrdersFromDb();
  const pendingWholesaleCount = await countPendingWholesaleRegistrations();
  const catalog = await listProductsForAdmin();
  setProductCatalog(catalog);

  const kpis = getRevenueKpis(orders);
  const revenueData = buildRevenueSeries();
  const newOrdersCount = orders.filter((order) => order.status === "nova").length;
  const pendingOrdersCount = orders.filter((order) =>
    PENDING_ORDER_STATUSES.includes(order.status),
  ).length;
  const unpaidOrdersCount = orders.filter(
    (order) => order.status === "nezaplatena",
  ).length;
  const pendingOrders = pendingOrdersForDashboard(orders);
  const recentOrders = recentOrdersForDashboard(orders, 3);

  const stats: {
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    href?: string;
  }[] = [
    {
      label: "Objednávky dnes",
      value: String(kpis.ordersToday),
      hint: "dnes vytvorené",
      icon: ShoppingCart,
      href: "/admin/objednavky?status=nova",
    },
    {
      label: "Čakajúce objednávky",
      value: String(pendingOrdersCount),
      hint: "na vybavenie",
      icon: Clock3,
      href: "/admin/objednavky?status=cakajuce",
    },
    {
      label: "Dnešné tržby",
      value: formatEuro(kpis.today),
      hint: formatChangeHint(kpis.todayChangePct, "oproti včera"),
      icon: ShoppingBag,
      href: "/admin/analytika?range=today",
    },
    {
      label: "Tržby tento mesiac",
      value: formatEuro(kpis.month),
      hint: formatChangeHint(kpis.monthChangePct, "oproti minulému"),
      icon: TrendingUp,
      href: "/admin/analytika?range=month",
    },
    {
      label: "Produkty s nízkym skladom",
      value: "6",
      hint: "vyžaduje doplnenie",
      icon: Warehouse,
      href: "/admin/produkty?stock=attention",
    },
  ];

  const topProducts = getTopProductsFallback(catalog, 5).map((product) => ({
    slug: product.productId,
    name: product.name,
    image: product.image ?? catalog[0]?.image ?? "",
    sold: product.quantity,
    revenue: formatProductRevenue(product.revenue),
  }));
  const revenueTotal = kpis.last30;

  const attentionItems: {
    href: string;
    count: number;
    label: string;
    icon: LucideIcon;
  }[] = [
    {
      href: "/admin/objednavky",
      count: newOrdersCount,
      label: "nové objednávky",
      icon: ShoppingCart,
    },
    {
      href: "/admin/objednavky",
      count: unpaidOrdersCount,
      label: "nezaplatené objednávky",
      icon: Clock3,
    },
    {
      href: "/admin/sklad",
      count: 6,
      label: "produkty s nízkym skladom",
      icon: Package,
    },
    {
      href: "/admin/velkoobchodne-ucty",
      count: pendingWholesaleCount,
      label: "čakajúce veľkoobchodné registrácie",
      icon: Building2,
    },
  ];

  return (
    <main className="flex min-w-0 flex-1 flex-col px-4 py-5 lg:px-6 lg:py-6">
      <AdminPageHeader
        title="Prehľad"
        description="To najdôležitejšie z vášho eshopu na jednom mieste."
      />

      {/* Stats — full-bleed carousel on mobile, grid on desktop */}
      <section aria-label="Štatistiky" className="mt-5">
        <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
          <div className="flex w-max snap-x snap-mandatory gap-3 lg:grid lg:w-full lg:grid-cols-5 lg:snap-none">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const className =
                "flex w-[min(72vw,17.5rem)] shrink-0 snap-start flex-col rounded-2xl border border-black/[0.06] bg-white px-4 py-4 sm:py-5 lg:w-auto";
              const content = (
                <>
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <p className="text-xs font-medium leading-snug text-[#2f2924]/65 sm:text-sm">
                      {stat.label}
                    </p>
                    <Icon
                      className="size-4 shrink-0 text-[#75825B]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-3 font-heading text-[1.85rem] font-semibold leading-none tracking-tight text-[#2f2924] sm:mt-4 sm:text-[2.4rem]">
                    {stat.value}
                  </p>
                  <p className={`mt-3 text-xs ${hintClass(stat.hint)}`}>
                    {stat.hint}
                  </p>
                </>
              );

              if (stat.href) {
                return (
                  <Link
                    key={stat.label}
                    href={stat.href}
                    className={`${className} transition-colors hover:border-[#75825B]/35 hover:bg-[#f7f8f4]`}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={stat.label} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pending orders 70% + Attention 30% */}
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Objednávky čakajúce na vybavenie
            </h2>
            <span className="rounded-md bg-[#75825B]/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#75825B]">
              {pendingOrders.length}
            </span>
          </div>

          <ul className="min-h-0 flex-1 divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {pendingOrders.map((order) => (
              <li key={order.number}>
                <OrderRow order={order} />
              </li>
            ))}
          </ul>

          <div className="mt-auto shrink-0 border-t border-black/[0.05] px-4 py-3">
            <Link
              href="/admin/objednavky"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
            >
              Zobraziť všetky objednávky
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Vyžaduje pozornosť
            </h2>
          </div>

          <ul className="flex flex-1 flex-col divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex flex-1">
                  <Link
                    href={item.href}
                    className="group flex w-full items-center gap-3 px-4 py-4 transition-colors hover:bg-[#faf8f5]"
                  >
                    <Icon
                      className="size-5 shrink-0 text-[#75825B]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <p className="min-w-0 flex-1 text-sm leading-snug text-[#2f2924]">
                      <span className="font-semibold tabular-nums">
                        {item.count}
                      </span>{" "}
                      {item.label}
                    </p>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-[#2f2924]/20 transition-colors group-hover:text-[#75825B]"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Revenue chart 50% + Top products 50% */}
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <section className="flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex flex-col gap-1 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Tržby za posledných 30 dní
            </h2>
            <p className="font-heading text-base font-semibold tabular-nums text-[#2f2924]">
              {revenueTotal.toLocaleString("sk-SK")} €
            </p>
          </div>

          <div className="min-w-0 overflow-hidden border-t border-black/[0.05] px-2 py-3 sm:px-3 sm:py-5">
            <RevenueChart data={revenueData} />
          </div>
        </section>

        <section className="min-w-0 w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Najpredávanejšie produkty
            </h2>
          </div>

          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {topProducts.map((product, index) => (
              <li key={product.slug}>
                <Link
                  href="/admin/produkty"
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#faf8f5]"
                >
                  <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-[#2f2924]/35">
                    {index + 1}
                  </span>
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f3efe9]">
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#2f2924]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#2f2924]/45">
                      {product.sold} predaných
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[#2f2924]">
                    {product.revenue}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent orders full width */}
      <section className="mt-5 rounded-2xl border border-black/[0.06] bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <h2 className="font-heading text-base font-semibold text-[#2f2924]">
            Posledné objednávky
          </h2>
          <Link
            href="/admin/objednavky"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
          >
            Zobraziť všetky
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
          {recentOrders.map((order) => (
            <li key={order.number}>
              <OrderRow order={order} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
