"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgePercent,
  Package,
  ShoppingBag,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/RevenueChart";
import {
  formatChangeHint,
  formatEuro,
  formatProductRevenue,
  getDemoDiscountStats,
  getDemoPromoStats,
  getPeriodAnalytics,
  parseAnalyticsPeriod,
  type AnalyticsPeriod,
} from "@/lib/analytics";
import {
  DISCOUNT_STATUS_META,
  type DiscountStatus,
} from "@/lib/discounts";

export type AnalyticsDiscountRow = {
  id: string;
  productName: string;
  discountPercent: number;
  validityLabel: string;
  status: DiscountStatus;
};

type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
};

type AdminAnalyticsManagerProps = {
  catalog: CatalogProduct[];
  discountRows: AnalyticsDiscountRow[];
  initialPeriod?: AnalyticsPeriod;
};

const PERIOD_TABS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "today", label: "Dnes" },
  { id: "week", label: "Tento týždeň" },
  { id: "month", label: "Tento mesiac" },
  { id: "year", label: "Tento rok" },
];

function hintClass(hint: string) {
  const trimmed = hint.trimStart();
  if (trimmed.startsWith("+")) return "font-medium text-[#75825B]";
  if (trimmed.startsWith("-")) return "font-medium text-[#c45c4a]";
  return "text-[#2f2924]/40";
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-black/[0.06] bg-white px-4 py-4 sm:py-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="text-xs font-medium leading-snug text-[#2f2924]/65 sm:text-sm">
          {label}
        </p>
        <Icon
          className="size-4 shrink-0 text-[#75825B]"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      <p className="mt-3 font-heading text-[1.85rem] font-semibold leading-none tracking-tight text-[#2f2924] sm:mt-4 sm:text-[2.2rem]">
        {value}
      </p>
      <p className={`mt-3 text-xs ${hintClass(hint)}`}>{hint}</p>
    </div>
  );
}

export function AdminAnalyticsManager({
  catalog,
  discountRows,
  initialPeriod = "month",
}: AdminAnalyticsManagerProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(
    parseAnalyticsPeriod(initialPeriod),
  );

  const analytics = useMemo(
    () => getPeriodAnalytics(period, catalog),
    [period, catalog],
  );

  const demoPromos = useMemo(() => getDemoPromoStats(period), [period]);
  const displayDiscounts =
    discountRows.length > 0 ? discountRows : getDemoDiscountStats();
  const periodPromoUses = demoPromos.reduce(
    (sum, promo) => sum + promo.usedCount,
    0,
  );

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
            Analytika
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            Prehľad tržieb, najpredávanejších produktov a výkonu akcií.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Obdobie"
          className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end"
        >
          {PERIOD_TABS.map((tab) => {
            const active = period === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(tab.id)}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-3.5 text-sm font-medium transition-colors sm:px-4 ${
                  active
                    ? "bg-[#75825B] text-white"
                    : "bg-white text-[#2f2924]/70 ring-1 ring-black/[0.08] hover:bg-[#f7f8f4] hover:text-[#2f2924]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-label="Kľúčové ukazovatele" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tržby"
            value={formatEuro(analytics.revenue)}
            hint={formatChangeHint(analytics.changePct, analytics.compareLabel)}
            icon={ShoppingBag}
          />
          <KpiCard
            label="Objednávky"
            value={String(analytics.orderCount)}
            hint="v zvolenom období"
            icon={ShoppingCart}
          />
          <KpiCard
            label="Priemerná objednávka"
            value={formatEuro(analytics.avgOrderValue)}
            hint="priemer v období"
            icon={BadgePercent}
          />
          <KpiCard
            label="Top produkt"
            value={
              analytics.topProducts[0]
                ? formatEuro(analytics.topProducts[0].revenue)
                : "—"
            }
            hint={analytics.topProducts[0]?.name ?? "bez predaja"}
            icon={Package}
          />
        </div>
      </section>

      <div className="mt-3 grid min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white sm:col-span-2 xl:col-span-3">
          <div className="flex shrink-0 flex-col gap-1 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              {analytics.chartTitle}
            </h2>
            <p className="font-heading text-base font-semibold tabular-nums text-[#2f2924]">
              {formatEuro(analytics.revenue)}
            </p>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-black/[0.05] px-2 py-3 sm:px-3 sm:py-4">
            <RevenueChart
              data={analytics.series}
              granularity={analytics.granularity}
              className="min-h-[280px] flex-1 sm:min-h-[320px]"
            />
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white sm:col-span-2 xl:col-span-1">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Najpredávanejšie produkty
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              V zvolenom období
            </p>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {analytics.topProducts.slice(0, 5).map((product, index) => (
              <li key={product.productId}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="w-4 shrink-0 text-sm font-semibold tabular-nums text-[#2f2924]/35">
                    {index + 1}
                  </span>
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#f3efe9]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#2f2924]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#2f2924]/45">
                      {product.quantity} ks
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[#2f2924]">
                    {formatProductRevenue(product.revenue)}
                  </p>
                </div>
              </li>
            ))}
            {analytics.topProducts.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[#2f2924]/45">
                Zatiaľ žiadne predaje
              </li>
            )}
          </ul>
          <div className="mt-auto shrink-0 border-t border-black/[0.05] px-4 py-3">
            <Link
              href="/admin/produkty"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
            >
              Zobraziť všetky produkty
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-3 grid min-w-0 items-stretch gap-3 xl:grid-cols-3">
        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Zľavové kódy
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              {periodPromoUses} použití v období · {demoPromos.length} kódov
            </p>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {demoPromos.map((promo) => {
              return (
                <li
                  key={promo.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold tracking-wide text-[#2f2924]">
                      {promo.code}
                    </p>
                    <p className="mt-0.5 text-xs text-[#2f2924]/40">
                      −{promo.discountPercent} %
                      {promo.active ? "" : " · neaktívny"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-[#2f2924]">
                      {promo.usedCount}×
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#2f2924]/40">
                      v období
                    </p>
                  </div>
                </li>
              );
            })}
            {demoPromos.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[#2f2924]/45">
                Žiadne zľavové kódy
              </li>
            )}
          </ul>
          <div className="mt-auto shrink-0 border-t border-black/[0.05] px-4 py-3">
            <Link
              href="/admin/zlavy"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
            >
              Spravovať zľavové kódy
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Produktové zľavy
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              Aktívne a naplánované akcie
            </p>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {displayDiscounts.slice(0, 6).map((row) => {
              const meta = DISCOUNT_STATUS_META[row.status];
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#2f2924]">
                      {row.productName}
                    </p>
                    <p className="mt-0.5 text-xs text-[#2f2924]/40">
                      −{row.discountPercent} % · {row.validityLabel}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
            {displayDiscounts.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[#2f2924]/45">
                Žiadne produktové zľavy
              </li>
            )}
          </ul>
          <div className="mt-auto shrink-0 border-t border-black/[0.05] px-4 py-3">
            <Link
              href="/admin/zlavy"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
            >
              Prejsť do sekcie zľavy
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Stav objednávok
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              Rozloženie v zvolenom období
            </p>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {analytics.statusBreakdown.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <p className="min-w-0 truncate text-sm font-medium text-[#2f2924]">
                  {row.label}{" "}
                  <span className="font-normal text-[#2f2924]/45">
                    ({formatEuro(row.revenue)})
                  </span>
                </p>
                <span className="shrink-0 font-heading text-lg font-semibold tabular-nums text-[#2f2924]">
                  {row.count}
                </span>
              </li>
            ))}
            {analytics.statusBreakdown.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[#2f2924]/45">
                Žiadne objednávky v období
              </li>
            )}
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
      </div>
    </>
  );
}
