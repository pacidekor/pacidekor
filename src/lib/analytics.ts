import {
  ORDER_STATUS_META,
  orders,
  orderTotal,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { formatPrice, parsePrice } from "@/lib/price";
import { findCatalogProductById } from "@/lib/product-catalog";

export type AnalyticsPeriod = "today" | "week" | "month" | "year";

export type RevenuePoint = {
  date: string;
  value: number;
};

export type ChartGranularity = "hour" | "day" | "month";

export type RevenueKpis = {
  today: number;
  yesterday: number;
  todayChangePct: number | null;
  month: number;
  lastMonth: number;
  monthChangePct: number | null;
  last30: number;
  ordersToday: number;
  ordersMonth: number;
  avgOrderValueMonth: number;
};

export type TopProductStat = {
  productId: string;
  name: string;
  image: string | null;
  quantity: number;
  revenue: number;
  orderCount: number;
};

export type StatusBreakdown = {
  status: OrderStatus;
  label: string;
  count: number;
  revenue: number;
};

export type CampaignPlaceholder = {
  id: string;
  name: string;
  type: "buy_x_get_y" | "bundle" | "flash";
  status: "pripravene";
  description: string;
};

export type PeriodAnalytics = {
  period: AnalyticsPeriod;
  chartTitle: string;
  compareLabel: string;
  granularity: ChartGranularity;
  series: RevenuePoint[];
  revenue: number;
  previousRevenue: number;
  changePct: number | null;
  orderCount: number;
  avgOrderValue: number;
  topProducts: TopProductStat[];
  statusBreakdown: StatusBreakdown[];
};

/** Curated mock daily curve — peaking mid/late period for a nicer chart. */
function mockDailyRevenue(dateKey: string, indexInPeriod = 0, periodLength = 30) {
  const progress = periodLength <= 1 ? 0.5 : indexInPeriod / (periodLength - 1);
  const seasonal =
    620 +
    Math.sin(progress * Math.PI * 1.4) * 340 +
    Math.cos(progress * Math.PI * 3.1) * 90;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const jitter = (hash % 120) - 40;
  return Math.max(220, Math.round(seasonal + jitter));
}

function mockHourlyRevenue(_dateKey: string, hour: number, minute = 0) {
  const profile = [
    18, 12, 9, 8, 14, 28, 52, 86, 124, 168, 210, 248, 265, 252, 238, 220, 198,
    176, 148, 112, 84, 62, 42, 28,
  ];
  const base = profile[hour] ?? 40;
  const next = profile[(hour + 1) % 24] ?? base;
  const blend = base + (next - base) * (minute / 60);
  const wobble = Math.sin((hour * 60 + minute) / 18) * 7;
  return Math.max(6, Math.round(blend + wobble));
}

function mockMonthlyRevenue(year: number, monthIndex: number) {
  const seasonal = [
    14800, 13200, 16400, 17800, 19200, 18600, 21400, 24650, 22800, 25100,
    26800, 31200,
  ];
  const base = seasonal[monthIndex] ?? 18000;
  const yearBias = (year % 7) * 180;
  return base + yearBias;
}

function startOfLocalDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function isBillableOrder(order: Order) {
  return order.status !== "stornovana";
}

function orderDate(order: Order) {
  return new Date(order.createdAt);
}

function startOfWeekMonday(date: Date) {
  const d = startOfLocalDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function parseAnalyticsPeriod(range?: string): AnalyticsPeriod {
  if (range === "today" || range === "week" || range === "month" || range === "year") {
    return range;
  }
  return "month";
}

export function getPeriodMeta(period: AnalyticsPeriod, now = new Date()) {
  const today = startOfLocalDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (period === "today") {
    const prevStart = new Date(today);
    prevStart.setDate(prevStart.getDate() - 1);
    return {
      start: today,
      end: tomorrow,
      previousStart: prevStart,
      previousEnd: today,
      chartTitle: "Tržby dnes",
      compareLabel: "oproti včera",
      granularity: "hour" as const,
    };
  }

  if (period === "week") {
    const start = startOfWeekMonday(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 7);
    return {
      start,
      end,
      previousStart,
      previousEnd: start,
      chartTitle: "Tržby tento týždeň",
      compareLabel: "oproti minulému týždňu",
      granularity: "hour" as const,
    };
  }

  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousEnd = start;
    return {
      start,
      end,
      previousStart,
      previousEnd,
      chartTitle: "Tržby tento rok",
      compareLabel: "oproti minulému roku",
      granularity: "month" as const,
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = start;
  return {
    start,
    end,
    previousStart,
    previousEnd,
    chartTitle: "Tržby tento mesiac",
    compareLabel: "oproti minulému mesiacu",
    granularity: "day" as const,
  };
}

function sumMockRange(start: Date, end: Date) {
  const days: string[] = [];
  const cursor = startOfLocalDay(start);
  const endMs = end.getTime();
  while (cursor.getTime() < endMs) {
    days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.reduce(
    (sum, key, index) => sum + mockDailyRevenue(key, index, days.length),
    0,
  );
}

/** Séria tržieb pre dashboard (posledných 30 dní). */
export function buildRevenueSeries(now = new Date()): RevenuePoint[] {
  const today = startOfLocalDay(now);
  today.setHours(12, 0, 0, 0);
  const points: RevenuePoint[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = toDateKey(date);
    points.push({
      date: key,
      value: mockDailyRevenue(key, 29 - i, 30),
    });
  }
  return points;
}

export function buildRevenueSeriesForPeriod(
  period: AnalyticsPeriod,
  now = new Date(),
): RevenuePoint[] {
  const meta = getPeriodMeta(period, now);

  if (period === "today") {
    const key = toDateKey(now);
    // Polhodinové body — detailnejší denný graf
    const points: RevenuePoint[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30]) {
        points.push({
          date: `${key}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          value: mockHourlyRevenue(key, hour, minute),
        });
      }
    }
    return points;
  }

  if (period === "week") {
    // 4 body denne (ráno / obed / poobede / večer) = detailnejší týždenný graf
    const slots = [
      { hour: 9, minute: 0 },
      { hour: 12, minute: 30 },
      { hour: 16, minute: 0 },
      { hour: 20, minute: 0 },
    ];
    const points: RevenuePoint[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(meta.start);
      date.setDate(meta.start.getDate() + i);
      const key = toDateKey(date);
      const dayBase = mockDailyRevenue(key, i, 7);
      for (const slot of slots) {
        const share = mockHourlyRevenue(key, slot.hour, slot.minute) / 180;
        points.push({
          date: `${key}T${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`,
          value: Math.max(40, Math.round((dayBase / 4) * (0.55 + share))),
        });
      }
    }
    return points;
  }

  if (period === "year") {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const year = now.getFullYear();
      return {
        date: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
        value: mockMonthlyRevenue(year, monthIndex),
      };
    });
  }

  // Mesiac — celý kalendárny mesiac
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const points: RevenuePoint[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    points.push({
      date: key,
      value: mockDailyRevenue(key, day - 1, daysInMonth),
    });
  }
  return points;
}

export function formatEuro(value: number) {
  return `${Math.round(value).toLocaleString("sk-SK")} €`;
}

export function formatChangeHint(pct: number | null, compareLabel: string) {
  if (pct === null) return compareLabel;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct} % ${compareLabel}`;
}

export function getRevenueKpis(now = new Date()): RevenueKpis {
  const series = buildRevenueSeries(now);
  const today = series[series.length - 1]?.value ?? 0;
  const yesterday = series[series.length - 2]?.value ?? 0;

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let month = 0;
  let lastMonth = 0;
  for (const point of series) {
    const d = new Date(`${point.date}T12:00:00`);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      month += point.value;
    }
    const prev = new Date(currentYear, currentMonth - 1, 1);
    if (
      d.getFullYear() === prev.getFullYear() &&
      d.getMonth() === prev.getMonth()
    ) {
      lastMonth += point.value;
    }
  }

  if (lastMonth === 0) {
    lastMonth = Math.round(month / 1.11);
  }

  const billable = orders.filter(isBillableOrder);
  const todayStart = startOfLocalDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(currentYear, currentMonth, 1);

  const ordersToday = billable.filter((o) => {
    const t = orderDate(o).getTime();
    return t >= todayStart.getTime() && t < tomorrow.getTime();
  }).length;

  const monthOrders = billable.filter(
    (o) => orderDate(o).getTime() >= monthStart.getTime(),
  );
  const ordersMonth = monthOrders.length;
  const avgOrderValueMonth =
    ordersMonth > 0
      ? monthOrders.reduce((sum, o) => sum + orderTotal(o), 0) / ordersMonth
      : month / 12;

  const last30 = series.reduce((sum, p) => sum + p.value, 0);

  return {
    today,
    yesterday,
    todayChangePct: percentChange(today, yesterday),
    month,
    lastMonth,
    monthChangePct: percentChange(month, lastMonth),
    last30,
    ordersToday,
    ordersMonth: ordersMonth || 12,
    avgOrderValueMonth: avgOrderValueMonth || month / 12,
  };
}

function ordersInRange(start: Date, end: Date) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return orders.filter((order) => {
    if (!isBillableOrder(order)) return false;
    const t = orderDate(order).getTime();
    return t >= startMs && t < endMs;
  });
}

export function getTopProductsFromOrders(
  limit = 8,
  range?: { start: Date; end: Date },
): TopProductStat[] {
  const source = range
    ? ordersInRange(range.start, range.end)
    : orders.filter(isBillableOrder);

  const map = new Map<
    string,
    {
      productId: string;
      name: string;
      quantity: number;
      revenue: number;
      orderIds: Set<string>;
    }
  >();

  for (const order of source) {
    for (const item of order.items) {
      const existing = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        quantity: 0,
        revenue: 0,
        orderIds: new Set<string>(),
      };
      existing.quantity += item.quantity;
      existing.revenue += parsePrice(item.unitPrice) * item.quantity;
      existing.orderIds.add(order.id);
      map.set(item.productId, existing);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit)
    .map((row) => {
      const catalog = findCatalogProductById(row.productId);
      return {
        productId: row.productId,
        name: catalog?.name ?? row.name,
        image: catalog?.image ?? null,
        quantity: row.quantity,
        revenue: row.revenue,
        orderCount: row.orderIds.size,
      };
    });
}

function scaleForPeriod(period: AnalyticsPeriod, base: number) {
  switch (period) {
    case "today":
      return Math.max(1, Math.round(base * 0.065));
    case "week":
      return Math.max(1, Math.round(base * 0.28));
    case "year":
      return Math.max(1, Math.round(base * 5.4));
    default:
      return Math.max(1, Math.round(base));
  }
}

/** Demo top produkty — vždy plný zoznam pre UI. */
export function getTopProductsFallback(
  catalog: { id: string; slug: string; name: string; image: string }[],
  limit = 5,
  period: AnalyticsPeriod = "month",
  _range?: { start: Date; end: Date },
): TopProductStat[] {
  const mockSold = [128, 96, 84, 71, 63, 52, 44, 38];
  const mockRevenue = [2410, 1875, 1520, 1288, 980, 840, 720, 610];

  const source =
    catalog.length > 0
      ? catalog
      : [
          {
            id: "mock-1",
            slug: "mock-1",
            name: "Ruža velvet burgundy",
            image: "",
          },
          {
            id: "mock-2",
            slug: "mock-2",
            name: "Eukalyptus zelený",
            image: "",
          },
          {
            id: "mock-3",
            slug: "mock-3",
            name: "Hortenzia cream",
            image: "",
          },
          {
            id: "mock-4",
            slug: "mock-4",
            name: "Pivoňka blush",
            image: "",
          },
          {
            id: "mock-5",
            slug: "mock-5",
            name: "Dekoračný list gold",
            image: "",
          },
          {
            id: "mock-6",
            slug: "mock-6",
            name: "Gypsophila white",
            image: "",
          },
          {
            id: "mock-7",
            slug: "mock-7",
            name: "Tulipán soft pink",
            image: "",
          },
          {
            id: "mock-8",
            slug: "mock-8",
            name: "Anemone midnight",
            image: "",
          },
        ];

  return source.slice(0, limit).map((product, index) => ({
    productId: product.id,
    name: product.name,
    image: product.image || null,
    quantity: scaleForPeriod(period, mockSold[index] ?? 20),
    revenue: scaleForPeriod(period, mockRevenue[index] ?? 200),
    orderCount: Math.max(
      1,
      Math.round(scaleForPeriod(period, mockSold[index] ?? 20) / 2.4),
    ),
  }));
}

export function getDemoOrderStatusBreakdown(
  period: AnalyticsPeriod,
  revenue: number,
): StatusBreakdown[] {
  const totals = {
    today: 14,
    week: 47,
    month: 186,
    year: 2140,
  } as const;
  const total = totals[period];
  const shares: { status: OrderStatus; share: number }[] = [
    { status: "dorucena", share: 0.42 },
    { status: "predana_dopravcovi", share: 0.16 },
    { status: "pripravuje_sa", share: 0.14 },
    { status: "zaplatena", share: 0.12 },
    { status: "nova", share: 0.1 },
    { status: "stornovana", share: 0.06 },
  ];

  return shares.map(({ status, share }) => ({
    status,
    label: ORDER_STATUS_META[status].label,
    count: Math.max(1, Math.round(total * share)),
    revenue:
      status === "stornovana" ? 0 : Math.round(revenue * share * 1.05),
  }));
}

export function getOrderStatusBreakdown(range?: {
  start: Date;
  end: Date;
}): StatusBreakdown[] {
  const source = range
    ? orders.filter((order) => {
        const t = orderDate(order).getTime();
        return t >= range.start.getTime() && t < range.end.getTime();
      })
    : orders;

  const counts = new Map<OrderStatus, { count: number; revenue: number }>();

  for (const order of source) {
    const prev = counts.get(order.status) ?? { count: 0, revenue: 0 };
    prev.count += 1;
    if (isBillableOrder(order)) {
      prev.revenue += orderTotal(order);
    }
    counts.set(order.status, prev);
  }

  return (Object.keys(ORDER_STATUS_META) as OrderStatus[])
    .map((status) => {
      const row = counts.get(status) ?? { count: 0, revenue: 0 };
      return {
        status,
        label: ORDER_STATUS_META[status].label,
        count: row.count,
        revenue: row.revenue,
      };
    })
    .filter((row) => row.count > 0);
}

export function getPeriodAnalytics(
  period: AnalyticsPeriod,
  catalog: { id: string; slug: string; name: string; image: string }[],
  now = new Date(),
): PeriodAnalytics {
  const meta = getPeriodMeta(period, now);
  const series = buildRevenueSeriesForPeriod(period, now);
  const revenue = series.reduce((sum, point) => sum + point.value, 0);
  const previousRevenue =
    period === "year"
      ? revenue / 1.14
      : sumMockRange(meta.previousStart, meta.previousEnd);

  const orderTotals = {
    today: 14,
    week: 47,
    month: 186,
    year: 2140,
  } as const;
  const orderCount = orderTotals[period];
  const avgOrderValue = revenue / orderCount;

  return {
    period,
    chartTitle: meta.chartTitle,
    compareLabel: meta.compareLabel,
    granularity: meta.granularity,
    series,
    revenue,
    previousRevenue: Math.round(previousRevenue),
    changePct: percentChange(revenue, previousRevenue),
    orderCount,
    avgOrderValue,
    topProducts: getTopProductsFallback(catalog, 8, period),
    statusBreakdown: getDemoOrderStatusBreakdown(period, revenue),
  };
}

export type DemoPromoStat = {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  usedCount: number;
};

export type DemoDiscountStat = {
  id: string;
  productName: string;
  discountPercent: number;
  validityLabel: string;
  status: "active" | "scheduled";
};

export function getDemoPromoStats(period: AnalyticsPeriod): DemoPromoStat[] {
  const base = [
    { id: "p1", code: "JAR2026", discountPercent: 15, active: true, usedCount: 84 },
    { id: "p2", code: "VELKO10", discountPercent: 10, active: true, usedCount: 61 },
    { id: "p3", code: "KVETY20", discountPercent: 20, active: true, usedCount: 43 },
    { id: "p4", code: "START5", discountPercent: 5, active: true, usedCount: 29 },
    { id: "p5", code: "VIP25", discountPercent: 25, active: false, usedCount: 12 },
  ];
  return base.map((promo) => ({
    ...promo,
    usedCount: scaleForPeriod(period, promo.usedCount),
  }));
}

export function getDemoDiscountStats(): DemoDiscountStat[] {
  return [
    {
      id: "d1",
      productName: "Ruža velvet burgundy",
      discountPercent: 20,
      validityLabel: "01.08.2026 – 31.08.2026",
      status: "active",
    },
    {
      id: "d2",
      productName: "Hortenzia cream",
      discountPercent: 15,
      validityLabel: "Bez obmedzenia",
      status: "active",
    },
    {
      id: "d3",
      productName: "Pivoňka blush",
      discountPercent: 25,
      validityLabel: "Od 01.09.2026",
      status: "scheduled",
    },
    {
      id: "d4",
      productName: "Eukalyptus zelený",
      discountPercent: 10,
      validityLabel: "Do 20.08.2026",
      status: "active",
    },
    {
      id: "d5",
      productName: "Gypsophila white",
      discountPercent: 30,
      validityLabel: "Akcia víkend",
      status: "active",
    },
  ];
}

export function estimatePromoUsesInPeriod(
  usedCount: number,
  period: AnalyticsPeriod,
) {
  return scaleForPeriod(period, Math.max(usedCount, 1));
}

export const FUTURE_CAMPAIGN_PLACEHOLDERS: CampaignPlaceholder[] = [
  {
    id: "bxgy-3plus1",
    name: "3+1 zdarma",
    type: "buy_x_get_y",
    status: "pripravene",
    description:
      "Štatistiky kampane (použitia, tržby, priemerná hodnota košíka) pribudnú po spustení akcie.",
  },
  {
    id: "bundle-starter",
    name: "Balíček na štart",
    type: "bundle",
    status: "pripravene",
    description:
      "Pripravené na sledovanie výkonnosti produktových balíčkov a bundle zliav.",
  },
];

export function formatProductRevenue(value: number) {
  return formatPrice(value);
}
