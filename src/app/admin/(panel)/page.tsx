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
  orderStatusClass,
  orders,
  pendingOrdersForDashboard,
  recentOrdersForDashboard,
} from "@/lib/orders";
import { products } from "@/lib/products";

export const dynamic = "force-dynamic";

const newOrdersCount = orders.filter((o) => o.status === "nova").length;
const unpaidOrdersCount = orders.filter(
  (o) => o.status === "nezaplatena",
).length;

const stats: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Objednávky dnes",
    value: "12",
    hint: "+3 oproti včera",
    icon: ShoppingCart,
  },
  {
    label: "Čakajúce objednávky",
    value: "7",
    hint: "na vybavenie",
    icon: Clock3,
  },
  {
    label: "Dnešné tržby",
    value: "1 842 €",
    hint: "+8 % oproti včera",
    icon: ShoppingBag,
  },
  {
    label: "Tržby tento mesiac",
    value: "24 650 €",
    hint: "+11 % oproti minulému",
    icon: TrendingUp,
  },
  {
    label: "Produkty s nízkym skladom",
    value: "6",
    hint: "vyžaduje doplnenie",
    icon: Warehouse,
  },
];

const pendingOrders = pendingOrdersForDashboard();
const recentOrders = recentOrdersForDashboard(3);

const topProducts = [
  { slug: products[0].slug, name: products[0].name, image: products[0].image, sold: 48, revenue: "907 €" },
  { slug: products[1].slug, name: products[1].name, image: products[1].image, sold: 36, revenue: "788 €" },
  { slug: products[4].slug, name: products[4].name, image: products[4].image, sold: 29, revenue: "435 €" },
  { slug: products[2].slug, name: products[2].name, image: products[2].image, sold: 24, revenue: "502 €" },
  { slug: products[3].slug, name: products[3].name, image: products[3].image, sold: 21, revenue: "189 €" },
];

/** Mock tržby za posledných 30 dní (vrátane dneška) - peak okolo pred týždňom. */
const revenueValues = [
  420, 380, 510, 460, 390, 440, 580, 520, 490, 610, 570, 640, 590, 620, 700,
  680, 740, 920, 1100, 1280, 1190, 980, 860, 790, 720, 810, 760, 830, 870, 910,
];

function buildRevenueData() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return revenueValues.map((value, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (revenueValues.length - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      value,
    };
  });
}

const revenueData = buildRevenueData();

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
      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#faf8f5]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate text-[15px] font-medium text-[#2f2924]">
            {order.customer}
          </p>
          <p className="text-xs text-[#2f2924]/40">#{order.number}</p>
        </div>
        <p className="mt-0.5 text-xs text-[#2f2924]/45">{order.createdAt}</p>
      </div>

      <span
        className={`hidden shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold sm:inline-flex ${orderStatusClass(order.status)}`}
      >
        {order.status}
      </span>

      <p className="min-w-[5.25rem] shrink-0 text-right text-[15px] font-semibold whitespace-nowrap tabular-nums text-[#2f2924]">
        {order.price}
      </p>
    </Link>
  );
}

export default async function AdminPage() {
  const pendingWholesaleCount = await countPendingWholesaleRegistrations();
  const revenueTotal = revenueData.reduce((sum, d) => sum + d.value, 0);

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
      label: "veľkoobchodné registrácie čakajúce na schválenie",
      icon: Building2,
    },
  ];

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminPageHeader
        title="Prehľad"
        description="To najdôležitejšie z vášho eshopu na jednom mieste."
      />

      {/* Stats */}
      <section
        aria-label="Štatistiky"
        className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex flex-col rounded-2xl border border-black/[0.06] bg-white px-5 py-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug text-[#2f2924]/65">
                  {stat.label}
                </p>
                <Icon
                  className="size-4 shrink-0 text-[#75825B]"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <p className="mt-4 font-heading text-[2.4rem] font-semibold leading-none tracking-tight text-[#2f2924]">
                {stat.value}
              </p>
              <p className={`mt-3 text-xs ${hintClass(stat.hint)}`}>
                {stat.hint}
              </p>
            </div>
          );
        })}
      </section>

      {/* Pending orders 70% + Attention 30% */}
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Objednávky čakajúce na vybavenie
            </h2>
            <span className="rounded-md bg-[#75825B]/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#75825B]">
              {pendingOrders.length}
            </span>
          </div>

          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {pendingOrders.map((order) => (
              <li key={order.number}>
                <OrderRow order={order} />
              </li>
            ))}
          </ul>

          <div className="border-t border-black/[0.05] px-5 py-3">
            <Link
              href="/admin/objednavky"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
            >
              Zobraziť všetky objednávky
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="flex h-full flex-col rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-5 pt-4 pb-3">
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
                    className="group flex w-full items-center gap-3.5 px-5 py-4 transition-colors hover:bg-[#faf8f5]"
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
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="flex h-full flex-col rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 sm:px-6">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Tržby za posledných 30 dní
            </h2>
            <p className="font-heading text-base font-semibold tabular-nums text-[#2f2924]">
              {revenueTotal.toLocaleString("sk-SK")} €
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-black/[0.05] px-5 py-4 sm:px-6 sm:py-5">
            <RevenueChart data={revenueData} className="flex min-h-0 flex-1" />
          </div>
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-5 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Najpredávanejšie produkty
            </h2>
          </div>

          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {topProducts.map((product, index) => (
              <li key={product.slug}>
                <Link
                  href="/admin/produkty"
                  className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[#faf8f5]"
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
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
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
