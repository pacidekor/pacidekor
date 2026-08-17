"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgePercent,
  Gift,
  Package,
  ShoppingBag,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/RevenueChart";
import {
  FUTURE_CAMPAIGN_PLACEHOLDERS,
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

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex flex-col gap-1 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              {analytics.chartTitle}
            </h2>
            <p className="font-heading text-base font-semibold tabular-nums text-[#2f2924]">
              {formatEuro(analytics.revenue)}
            </p>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden border-t border-black/[0.05] px-2 py-3 sm:px-3 sm:py-5">
            <RevenueChart
              data={analytics.series}
              granularity={analytics.granularity}
            />
          </div>
        </section>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold text-[#2f2924]">
                Najpredávanejšie
              </h2>
              <p className="mt-1 text-xs text-[#2f2924]/45">
                V zvolenom období
              </p>
            </div>
            <Link
              href="/admin/produkty"
              className="shrink-0 text-sm font-medium text-[#75825B] hover:underline"
            >
              Všetky
            </Link>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-black/[0.05] overflow-y-auto border-t border-black/[0.05]">
            {analytics.topProducts.slice(0, 6).map((product, index) => (
              <li key={product.productId}>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span className="w-3.5 shrink-0 text-xs font-semibold tabular-nums text-[#2f2924]/35">
                    {index + 1}
                  </span>
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-[#f3efe9]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#2f2924]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#2f2924]/40">
                      {product.quantity} ks
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold tabular-nums text-[#2f2924]">
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
        </section>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-3">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Zľavové kódy
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              {periodPromoUses} použití v období · {demoPromos.length} kódov
            </p>
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
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
          </ul>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Produktové zľavy
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              Aktívne a naplánované akcie
            </p>
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
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
          </ul>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-4 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Stav objednávok
            </h2>
            <p className="mt-1 text-xs text-[#2f2924]/45">
              Rozloženie v zvolenom období
            </p>
          </div>
          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {analytics.statusBreakdown.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2f2924]">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[#2f2924]/40">
                    {formatEuro(row.revenue)}
                  </p>
                </div>
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
        </section>
      </div>

      <section className="mt-5 min-w-0 overflow-hidden rounded-2xl border border-dashed border-[#75825B]/35 bg-[#f7f8f4]/60">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-[#75825B]" strokeWidth={1.75} />
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Kampane (pripravované)
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#2f2924]/50">
            Sem neskôr pribudnú štatistiky akcií typu 3+1 zdarma, balíčky a flash
            zľavy.
          </p>
        </div>
        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
          {FUTURE_CAMPAIGN_PLACEHOLDERS.map((campaign) => (
            <li key={campaign.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#2f2924]">
                  {campaign.name}
                </p>
                <span className="rounded-md bg-[#e8ebe2] px-2 py-0.5 text-[11px] font-semibold text-[#5a6648]">
                  Čoskoro
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#2f2924]/50">
                {campaign.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
