import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Package,
  Plus,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

const stats: {
  label: string;
  value: string;
  hint: string;
}[] = [
  {
    label: "Objednávky dnes",
    value: "12",
    hint: "+3 oproti včera",
  },
  {
    label: "Čakajúce objednávky",
    value: "7",
    hint: "na vybavenie",
  },
  {
    label: "Dnešné tržby",
    value: "1 842 €",
    hint: "+8 % oproti včera",
  },
  {
    label: "Tržby tento mesiac",
    value: "24 650 €",
    hint: "+11 % oproti minulému",
  },
  {
    label: "Produkty s nízkym skladom",
    value: "6",
    hint: "vyžaduje doplnenie",
  },
];

const recentOrders = [
  {
    number: "2026-00125",
    customer: "Kvetinárstvo Ruža",
    price: "428 €",
    status: "Pripravuje sa",
    createdAt: "pred 12 min",
  },
  {
    number: "2026-00124",
    customer: "Jana Nováková",
    price: "52 €",
    status: "Nová",
    createdAt: "pred 28 min",
  },
  {
    number: "2026-00123",
    customer: "Floristika Mária",
    price: "196 €",
    status: "Pripravuje sa",
    createdAt: "pred 1 hod.",
  },
  {
    number: "2026-00122",
    customer: "Peter Horváth",
    price: "38 €",
    status: "Nová",
    createdAt: "pred 2 hod.",
  },
  {
    number: "2026-00121",
    customer: "Ateliér Kvet",
    price: "312 €",
    status: "Odoslaná",
    createdAt: "pred 3 hod.",
  },
];

const attentionItems: {
  href: string;
  count: number;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/admin/objednavky",
    count: 4,
    label: "nové objednávky",
    icon: ShoppingCart,
  },
  {
    href: "/admin/objednavky",
    count: 2,
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
    count: 3,
    label: "veľkoobchodné registrácie čakajúce na schválenie",
    icon: Building2,
  },
];

const quickActions: {
  href: string;
  label: string;
}[] = [
  { href: "/admin/produkty", label: "Pridať produkt" },
  { href: "/admin/kategorie", label: "Pridať kategóriu" },
  { href: "/admin/produkty", label: "Import produktov" },
  { href: "/admin/zlavy", label: "Vytvoriť zľavu" },
];

function statusClass(status: string) {
  if (status === "Nová") return "bg-[#75825B]/12 text-[#75825B]";
  if (status === "Odoslaná") return "bg-[#2f2924]/6 text-[#2f2924]/55";
  return "bg-[#e8ebe2] text-[#2f2924]/70";
}

export default function AdminPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-6 sm:px-8 sm:py-7 lg:px-10">
      <header>
        <h1 className="font-heading text-xl font-semibold text-[#2f2924] sm:text-2xl">
          Prehľad
        </h1>
        <p className="mt-0.5 text-sm text-[#2f2924]/50">
          To najdôležitejšie z vášho eshopu na jednom mieste.
        </p>
      </header>

      <section
        aria-label="Štatistiky"
        className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/[0.06] bg-white px-4 py-4"
          >
            <p className="text-xs text-[#2f2924]/45">{stat.label}</p>
            <p className="mt-1.5 font-heading text-[1.65rem] font-semibold leading-none tracking-tight text-[#2f2924]">
              {stat.value}
            </p>
            <p className="mt-2 text-xs text-[#2f2924]/40">{stat.hint}</p>
          </div>
        ))}
      </section>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-5 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Posledné objednávky
            </h2>
          </div>

          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {recentOrders.map((order) => (
              <li key={order.number}>
                <Link
                  href="/admin/objednavky"
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#faf8f5]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="truncate text-sm font-medium text-[#2f2924]">
                        {order.customer}
                      </p>
                      <p className="text-xs text-[#2f2924]/40">
                        #{order.number}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-[#2f2924]/45">
                      {order.createdAt}
                    </p>
                  </div>

                  <span
                    className={`hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${statusClass(order.status)}`}
                  >
                    {order.status}
                  </span>

                  <p className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-[#2f2924]">
                    {order.price}
                  </p>
                </Link>
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

        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <div className="px-5 pt-4 pb-3">
            <h2 className="font-heading text-base font-semibold text-[#2f2924]">
              Vyžaduje pozornosť
            </h2>
          </div>

          <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-[#faf8f5]"
                  >
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-[#75825B]"
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
                      className="mt-0.5 size-3.5 shrink-0 text-[#2f2924]/20 transition-colors group-hover:text-[#75825B]"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="mt-6" aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="font-heading text-base font-semibold text-[#2f2924]"
        >
          Rýchle akcie
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
            >
              <Plus className="size-3.5 shrink-0 text-[#75825B]" strokeWidth={2} aria-hidden />
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
