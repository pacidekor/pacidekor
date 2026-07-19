import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Package,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

const cardShadow = "shadow-[0_2px_12px_rgba(47,41,36,0.04)]";

const stats: {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Objednávky dnes",
    value: "12",
    trend: "+3",
    icon: ShoppingCart,
  },
  {
    label: "Čakajúce na vybavenie",
    value: "7",
    trend: "+2",
    icon: Clock3,
  },
  {
    label: "Dnešné tržby",
    value: "1 842 €",
    trend: "+8%",
    icon: TrendingUp,
  },
  {
    label: "Tržby tento mesiac",
    value: "24 650 €",
    trend: "+11%",
    icon: TrendingUp,
  },
  {
    label: "Nízky sklad",
    value: "6",
    trend: "+1",
    icon: Warehouse,
  },
  {
    label: "Nové VO registrácie",
    value: "3",
    trend: "+3",
    icon: Building2,
  },
];

const recentOrders = [
  {
    number: "2026-00125",
    customer: "Kvetinárstvo Ruža",
    price: "428 €",
    payment: "Zaplatené",
    status: "Pripravuje sa",
  },
  {
    number: "2026-00124",
    customer: "Jana Nováková",
    price: "52 €",
    payment: "Dobierka",
    status: "Nová",
  },
  {
    number: "2026-00123",
    customer: "Floristika Mária",
    price: "196 €",
    payment: "Zaplatené",
    status: "Pripravuje sa",
  },
  {
    number: "2026-00122",
    customer: "Peter Horváth",
    price: "38 €",
    payment: "Nezaplatené",
    status: "Nová",
  },
];

const attentionItems = [
  {
    href: "/admin/objednavky",
    icon: ShoppingCart,
    text: "4 nové objednávky",
  },
  {
    href: "/admin/objednavky",
    icon: Clock3,
    text: "2 nezaplatené objednávky",
  },
  {
    href: "/admin/sklad",
    icon: Package,
    text: "6 produktov dochádza",
  },
  {
    href: "/admin/velkoobchodne-ucty",
    icon: Building2,
    text: "3 veľkoobchodné registrácie čakajú na schválenie",
  },
];

function paymentClass(payment: string) {
  if (payment === "Zaplatené") return "text-[#75825B]";
  if (payment === "Nezaplatené") return "text-[#8f2555]";
  return "text-[#2f2924]/65";
}

function statusClass(status: string) {
  if (status === "Nová") return "bg-[#75825B]/12 text-[#75825B]";
  return "bg-[#f0eee9] text-[#2f2924]/70";
}

export default function AdminPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-[1.75rem]">
          Prehľad
        </h1>
        <p className="mt-1 text-sm text-[#2f2924]/50">
          To najdôležitejšie z vášho eshopu na jednom mieste.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-2xl bg-white p-5 ${cardShadow}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#2f2924]/50">{stat.label}</p>
                  <p className="mt-2 font-heading text-[1.65rem] font-semibold leading-none tracking-tight text-[#2f2924]">
                    {stat.value}
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#75825B]/12 text-[#75825B]">
                  <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#75825B]">
                <ArrowUpRight className="size-3.5" aria-hidden />
                {stat.trend}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className={`rounded-2xl bg-white p-5 sm:p-6 ${cardShadow}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Posledné objednávky
            </h2>
            <Link
              href="/admin/objednavky"
              className="text-sm font-medium text-[#75825B] transition-opacity hover:opacity-75"
            >
              Zobraziť všetky
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="text-[#2f2924]/40">
                  <th className="pb-3 pr-4 font-medium">Číslo</th>
                  <th className="pb-3 pr-4 font-medium">Zákazník</th>
                  <th className="pb-3 pr-4 font-medium">Cena</th>
                  <th className="pb-3 pr-4 font-medium">Platba</th>
                  <th className="pb-3 font-medium">Stav</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.number}
                    className="border-t border-black/[0.05]"
                  >
                    <td className="py-3.5 pr-4 font-medium text-[#2f2924]">
                      {order.number}
                    </td>
                    <td className="py-3.5 pr-4 text-[#2f2924]/75">
                      {order.customer}
                    </td>
                    <td className="py-3.5 pr-4 font-medium text-[#2f2924]">
                      {order.price}
                    </td>
                    <td
                      className={`py-3.5 pr-4 font-medium ${paymentClass(order.payment)}`}
                    >
                      {order.payment}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`rounded-2xl bg-white p-5 sm:p-6 ${cardShadow}`}>
          <h2 className="font-heading text-base font-semibold text-[#2f2924]">
            Vyžaduje pozornosť
          </h2>
          <ul className="mt-5 space-y-2">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl bg-[#faf8f5] px-3.5 py-3 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/70"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#75825B]">
                      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="flex-1 leading-snug">{item.text}</span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-[#2f2924]/25"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
