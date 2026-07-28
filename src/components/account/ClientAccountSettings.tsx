"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  History,
  Layers,
  LogOut,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { QuantityStepper } from "@/components/QuantityStepper";
import {
  ACCOUNT_PREFS_EVENT,
  getAccountPreferences,
  setAccountPreferences,
  type AccountPreferences,
} from "@/lib/account-preferences";
import {
  CLIENT_AUTH_EVENT,
  clearClientSession,
  getClientSession,
} from "@/lib/client-auth";
import {
  CUSTOMER_TYPE_META,
  CUSTOMERS_EVENT,
  customerDisplayName,
  getCustomerById,
  readCustomers,
  updateCustomerInStore,
  type Customer,
} from "@/lib/customers";
import {
  ORDER_TEMPLATES_EVENT,
  deleteOrderTemplate,
  formatTemplateTotal,
  getTemplatesForCustomer,
  updateOrderTemplate,
  type OrderTemplate,
  type OrderTemplateItem,
} from "@/lib/order-templates";
import { formatPrice, parsePrice } from "@/lib/cart";
import {
  ORDER_STATUS_META,
  formatOrderTotal,
  getActiveOrdersForCustomerEmail,
  getOrderHistoryForCustomerEmail,
  type Order,
} from "@/lib/orders";
import { products } from "@/lib/products";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

const labelClass = "mb-1.5 block text-sm font-medium text-[#2f2924]";

type SectionId =
  | "nastavenie"
  | "newsletter"
  | "aktivne"
  | "historia"
  | "sablony";

type NavItem = {
  id: SectionId;
  label: string;
  icon: typeof Settings;
  wholesaleOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Objednávky",
    items: [
      { id: "aktivne", label: "Aktívne", icon: Package },
      { id: "historia", label: "História", icon: History },
    ],
  },
  {
    title: "Veľkoobchod",
    items: [
      {
        id: "sablony",
        label: "Šablóny",
        icon: Layers,
        wholesaleOnly: true,
      },
    ],
  },
  {
    title: "Váš účet",
    items: [
      { id: "nastavenie", label: "Nastavenie", icon: Settings },
      { id: "newsletter", label: "Newsletter", icon: Bell },
    ],
  },
];

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
  nastavenie: {
    title: "Nastavenie účtu",
    subtitle: "Kontaktné a firemné údaje vášho partnerského účtu.",
  },
  newsletter: {
    title: "Newsletter a akcie",
    subtitle: "Vyberte, o čom vás chceme informovať e-mailom.",
  },
  aktivne: {
    title: "Aktívne objednávky",
    subtitle: "Objednávky, ktoré práve spracúvame alebo sú u dopravcu.",
  },
  historia: {
    title: "História objednávok",
    subtitle: "Dokončené a stornované objednávky.",
  },
  sablony: {
    title: "Šablóny objednávok",
    subtitle:
      "Uložené zostavy tovaru na opakované objednávky. Z košíka ich neskôr uložíte jedným klikom.",
  },
};

type ProfileForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  ico: string;
  dic: string;
};

function toProfileForm(customer: Customer): ProfileForm {
  return {
    name: customer.name,
    company: customer.company ?? "",
    email: customer.email,
    phone: customer.phone,
    street: customer.street,
    city: customer.city,
    zip: customer.zip,
    country: customer.country,
    ico: customer.ico ?? "",
    dic: customer.dic ?? "",
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientAccountSettings() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<SectionId>("aktivne");
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [prefs, setPrefs] = useState<AccountPreferences | null>(null);
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);

  useEffect(() => {
    function syncCustomer() {
      const session = getClientSession();
      if (!session) {
        setCustomer(null);
        setHydrated(true);
        return;
      }
      const found = getCustomerById(session.customerId, readCustomers()) ?? null;
      setCustomer(found);
      if (found) {
        setProfile(toProfileForm(found));
        setPrefs(getAccountPreferences(found.id));
        setTemplates(getTemplatesForCustomer(found.id));
      }
      setHydrated(true);
    }

    function syncTemplates() {
      const session = getClientSession();
      if (!session) return;
      setTemplates(getTemplatesForCustomer(session.customerId));
    }

    function syncPrefs() {
      const session = getClientSession();
      if (!session) return;
      setPrefs(getAccountPreferences(session.customerId));
    }

    syncCustomer();
    window.addEventListener(CLIENT_AUTH_EVENT, syncCustomer);
    window.addEventListener(CUSTOMERS_EVENT, syncCustomer);
    window.addEventListener(ORDER_TEMPLATES_EVENT, syncTemplates);
    window.addEventListener(ACCOUNT_PREFS_EVENT, syncPrefs);
    window.addEventListener("storage", syncCustomer);
    return () => {
      window.removeEventListener(CLIENT_AUTH_EVENT, syncCustomer);
      window.removeEventListener(CUSTOMERS_EVENT, syncCustomer);
      window.removeEventListener(ORDER_TEMPLATES_EVENT, syncTemplates);
      window.removeEventListener(ACCOUNT_PREFS_EVENT, syncPrefs);
      window.removeEventListener("storage", syncCustomer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!customer) {
      router.replace("/");
    }
  }, [hydrated, customer, router]);

  useEffect(() => {
    if (!customer) return;
    if (customer.type !== "velkoobchod" && section === "sablony") {
      setSection("aktivne");
    }
  }, [customer, section]);

  const activeOrders = useMemo(
    () => (customer ? getActiveOrdersForCustomerEmail(customer.email) : []),
    [customer],
  );
  const historyOrders = useMemo(
    () => (customer ? getOrderHistoryForCustomerEmail(customer.email) : []),
    [customer],
  );

  const navGroups = useMemo(() => {
    if (!customer) return [];
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.wholesaleOnly || customer.type === "velkoobchod",
      ),
    })).filter((group) => group.items.length > 0);
  }, [customer]);

  function logout() {
    clearClientSession();
    router.replace("/");
  }

  function patchProfile<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setProfileSaved(false);
  }

  function saveProfile() {
    if (!customer || !profile) return;
    if (!profile.name.trim() || !profile.email.trim() || !profile.phone.trim()) {
      return;
    }
    updateCustomerInStore(customer.id, {
      name: profile.name.trim(),
      company: profile.company.trim() || undefined,
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      street: profile.street.trim(),
      city: profile.city.trim(),
      zip: profile.zip.trim(),
      country: profile.country.trim(),
      ico: profile.ico.trim() || undefined,
      dic: profile.dic.trim() || undefined,
    });
    setProfileSaved(true);
  }

  function resetProfile() {
    if (!customer) return;
    setProfile(toProfileForm(customer));
    setProfileSaved(false);
  }

  function patchPrefs<K extends keyof AccountPreferences>(
    key: K,
    value: AccountPreferences[K],
  ) {
    if (!customer || !prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setAccountPreferences(customer.id, next);
  }

  if (!hydrated || !customer || !profile || !prefs) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#75825B]/25" />
      </div>
    );
  }

  const typeMeta = CUSTOMER_TYPE_META[customer.type];
  const sectionMeta = SECTION_TITLES[section];
  const displayName = customerDisplayName(customer);

  return (
    <div className="flex min-h-dvh flex-1 bg-[#faf8f5]">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-black/[0.06] bg-white lg:flex">
        <div className="flex shrink-0 items-center justify-center px-5 py-7">
          <Link
            href="/"
            className="font-heading text-2xl tracking-[0.08em] text-foreground transition-opacity hover:opacity-80"
          >
            PACIDEKOR
          </Link>
        </div>

        <nav
          aria-label="Sekcie účtu"
          className="flex min-h-0 flex-1 flex-col px-3 pb-5"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.14em] text-[#2f2924]/40 uppercase">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSection(item.id)}
                          className={`flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[0.95rem] transition-colors ${
                            active
                              ? "bg-[#75825B] font-medium text-white"
                              : "text-[#2f2924]/70 hover:bg-[#faf8f5] hover:text-[#2f2924]"
                          }`}
                        >
                          <Icon
                            className="size-5 shrink-0"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {active ? (
                            <ChevronRight
                              className="size-4 shrink-0 opacity-80"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 shrink-0">
            <Link
              href="/"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] text-[#2f2924]/70 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
            >
              <ExternalLink
                className="size-5 shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
              Späť na eshop
            </Link>

            <div className="mt-3 border-t border-black/[0.06] pt-4">
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8ebe2] font-heading text-xs font-semibold text-[#75825B]">
                  {initials(customer.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] font-medium text-[#2f2924]">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-[#2f2924]/55">
                    {customer.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Odhlásiť sa"
                  title="Odhlásiť sa"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/55 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
                >
                  <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-black/[0.06] bg-white px-4 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-semibold text-[#2f2924]">
                Môj účet
              </p>
              <p className="mt-0.5 truncate text-sm text-[#2f2924]/55">
                {displayName}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
              Eshop
            </Link>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navGroups.flatMap((group) =>
              group.items.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#75825B] text-white"
                        : "bg-[#faf8f5] text-[#2f2924]/65 ring-1 ring-black/8"
                    }`}
                  >
                    <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="overflow-hidden rounded-3xl border border-black/6 bg-white">
            <div className="border-b border-black/6 px-5 py-5 sm:px-7">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${typeMeta.className}`}
                >
                  {typeMeta.label}
                </span>
              </div>
              <h1 className="font-heading text-xl font-semibold text-[#2f2924] sm:text-2xl">
                {sectionMeta.title}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#2f2924]/55">
                {sectionMeta.subtitle}
              </p>
            </div>

            <div className="px-5 py-6 sm:px-7 sm:py-7">
              {section === "nastavenie" ? (
                <ProfileSection
                  customer={customer}
                  profile={profile}
                  saved={profileSaved}
                  onPatch={patchProfile}
                  onSave={saveProfile}
                  onReset={resetProfile}
                />
              ) : null}

              {section === "newsletter" ? (
                <NewsletterSection prefs={prefs} onPatch={patchPrefs} />
              ) : null}

              {section === "aktivne" ? (
                <OrdersSection
                  orders={activeOrders}
                  emptyTitle="Žiadne aktívne objednávky"
                  emptyBody="Keď odošlete novú objednávku, uvidíte ju tu až do doručenia."
                />
              ) : null}

              {section === "historia" ? (
                <OrdersSection
                  orders={historyOrders}
                  emptyTitle="Zatiaľ žiadna história"
                  emptyBody="Dokončené objednávky sa zobrazia na tomto mieste."
                />
              ) : null}

              {section === "sablony" ? (
                <TemplatesSection
                  templates={templates}
                  onRefresh={() =>
                    setTemplates(getTemplatesForCustomer(customer.id))
                  }
                />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


function ProfileSection({
  customer,
  profile,
  saved,
  onPatch,
  onSave,
  onReset,
}: {
  customer: Customer;
  profile: ProfileForm;
  saved: boolean;
  onPatch: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-4 border-b border-black/6 pb-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#e8ebe2] font-heading text-lg font-semibold text-[#75825B]">
          {initials(customer.name)}
        </div>
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-[#2f2924]">
            <UserRound className="size-4 text-[#75825B]" strokeWidth={1.75} />
            Profil partnera
          </p>
          <p className="mt-1 text-sm text-[#2f2924]/55">
            Zmeny sa uložia do vášho veľkoobchodného / zákazníckeho účtu.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-name" className={labelClass}>
            Kontaktná osoba
          </label>
          <input
            id="acc-name"
            className={fieldClass}
            value={profile.name}
            onChange={(e) => onPatch("name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-company" className={labelClass}>
            Firma
          </label>
          <input
            id="acc-company"
            className={fieldClass}
            value={profile.company}
            onChange={(e) => onPatch("company", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="acc-email"
            type="email"
            className={fieldClass}
            value={profile.email}
            onChange={(e) => onPatch("email", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-phone" className={labelClass}>
            Telefón
          </label>
          <input
            id="acc-phone"
            type="tel"
            className={fieldClass}
            value={profile.phone}
            onChange={(e) => onPatch("phone", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="acc-street" className={labelClass}>
            Ulica a číslo
          </label>
          <input
            id="acc-street"
            className={fieldClass}
            value={profile.street}
            onChange={(e) => onPatch("street", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-city" className={labelClass}>
            Mesto
          </label>
          <input
            id="acc-city"
            className={fieldClass}
            value={profile.city}
            onChange={(e) => onPatch("city", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-zip" className={labelClass}>
            PSČ
          </label>
          <input
            id="acc-zip"
            className={fieldClass}
            value={profile.zip}
            onChange={(e) => onPatch("zip", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-country" className={labelClass}>
            Krajina
          </label>
          <input
            id="acc-country"
            className={fieldClass}
            value={profile.country}
            onChange={(e) => onPatch("country", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-ico" className={labelClass}>
            IČO
          </label>
          <input
            id="acc-ico"
            className={fieldClass}
            value={profile.ico}
            onChange={(e) => onPatch("ico", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="acc-dic" className={labelClass}>
            DIČ
          </label>
          <input
            id="acc-dic"
            className={fieldClass}
            value={profile.dic}
            onChange={(e) => onPatch("dic", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-black/6 pt-6">
        {saved ? (
          <p className="mr-auto text-sm text-[#15803d]">Zmeny boli uložené.</p>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
        >
          Zrušiť
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Uložiť
        </button>
      </div>
    </div>
  );
}

function NewsletterSection({
  prefs,
  onPatch,
}: {
  prefs: AccountPreferences;
  onPatch: <K extends keyof AccountPreferences>(
    key: K,
    value: AccountPreferences[K],
  ) => void;
}) {
  const options: {
    key: keyof AccountPreferences;
    title: string;
    body: string;
  }[] = [
    {
      key: "newsletter",
      title: "Mesačný newsletter",
      body: "Inšpirácie, tipy do predajne a novinky zo sortimentu.",
    },
    {
      key: "promoEmails",
      title: "Promo akcie a zľavy",
      body: "Informácie o akciách, sezónnych balíčkoch a VO ponukách.",
    },
    {
      key: "newProducts",
      title: "Novinky v katalógu",
      body: "Upozornenie, keď doplníme nové produkty alebo kolekcie.",
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const checked = prefs[option.key];
        return (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-4 rounded-2xl border border-black/8 px-4 py-4 transition-colors hover:bg-[#faf8f5]/80"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onPatch(option.key, e.target.checked)}
              className="mt-1 size-4 rounded border-black/20 text-[#75825B] accent-[#75825B]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#2f2924]">
                {option.title}
              </span>
              <span className="mt-0.5 block text-sm text-[#2f2924]/55">
                {option.body}
              </span>
            </span>
          </label>
        );
      })}
      <p className="pt-2 text-xs text-[#2f2924]/45">
        Preferencie sa ukladajú ihneď. Odhlásiť sa môžete kedykoľvek.
      </p>
    </div>
  );
}

function OrdersSection({
  orders,
  emptyTitle,
  emptyBody,
}: {
  orders: Order[];
  emptyTitle: string;
  emptyBody: string;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 px-5 py-12 text-center">
        <ClipboardList
          className="mx-auto size-8 text-[#75825B]/70"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 font-heading text-lg font-semibold text-[#2f2924]">
          {emptyTitle}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[#2f2924]/55">
          {emptyBody}
        </p>
        <Link
          href="/produkty"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Prejsť do eshopu
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/8">
      <ul className="divide-y divide-black/6">
        {orders.map((order) => {
          const meta = ORDER_STATUS_META[order.status];
          return (
            <li
              key={order.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[#2f2924]">#{order.id}</p>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#2f2924]/55">
                  {order.createdAtLabel} · {order.items.length}{" "}
                  {order.items.length === 1 ? "položka" : "položky"} ·{" "}
                  {order.shippingMethod}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                <p className="text-sm font-semibold text-[#2f2924]">
                  {formatOrderTotal(order)}
                </p>
                <p className="text-xs text-[#2f2924]/45">{order.paymentMethod}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TemplatesSection({
  templates,
  onRefresh,
}: {
  templates: OrderTemplate[];
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftItems, setDraftItems] = useState<OrderTemplateItem[]>([]);
  const [addProductId, setAddProductId] = useState("");

  function startEdit(template: OrderTemplate) {
    setEditingId(template.id);
    setDraftName(template.name);
    setDraftNote(template.note ?? "");
    setDraftItems(template.items.map((item) => ({ ...item })));
    setAddProductId("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftName("");
    setDraftNote("");
    setDraftItems([]);
    setAddProductId("");
  }

  function saveEdit() {
    if (!editingId) return;
    if (draftItems.length === 0) return;
    updateOrderTemplate(editingId, {
      name: draftName,
      note: draftNote,
      items: draftItems,
    });
    cancelEdit();
    onRefresh();
  }

  function setItemQuantity(productId: string, quantity: number) {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  }

  function removeItem(productId: string) {
    setDraftItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function addItem() {
    if (!addProductId) return;
    const product = products.find((p) => p.id === addProductId);
    if (!product) return;
    setDraftItems((prev) => {
      if (prev.some((item) => item.productId === product.id)) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
        },
      ];
    });
    setAddProductId("");
  }

  function handleDelete(id: string) {
    if (editingId === id) cancelEdit();
    deleteOrderTemplate(id);
    onRefresh();
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 px-5 py-12 text-center">
        <Layers
          className="mx-auto size-8 text-[#75825B]/70"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 font-heading text-lg font-semibold text-[#2f2924]">
          Zatiaľ žiadne šablóny
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#2f2924]/55">
          Keď budete mať v košíku zostavu, ktorú objednávate často, uložíte ju
          ako šablónu a nabudúce ju spustíte odtiaľto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => {
        const isEditing = editingId === template.id;
        const availableProducts = products.filter(
          (product) =>
            !draftItems.some((item) => item.productId === product.id),
        );
        const draftTotal = formatPrice(
          draftItems.reduce(
            (sum, line) => sum + parsePrice(line.unitPrice) * line.quantity,
            0,
          ),
        );

        return (
          <article
            key={template.id}
            className="rounded-2xl border border-black/8 px-4 py-4 sm:px-5"
          >
            {isEditing ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`tpl-name-${template.id}`}
                      className={labelClass}
                    >
                      Názov šablóny
                    </label>
                    <input
                      id={`tpl-name-${template.id}`}
                      className={fieldClass}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`tpl-note-${template.id}`}
                      className={labelClass}
                    >
                      Poznámka{" "}
                      <span className="font-normal text-[#2f2924]/45">
                        (voliteľné)
                      </span>
                    </label>
                    <input
                      id={`tpl-note-${template.id}`}
                      className={fieldClass}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Napr. týždenná dodávka…"
                    />
                  </div>
                </div>

                <ul className="mt-4 space-y-3 border-t border-black/6 pt-4">
                  {draftItems.map((line) => (
                    <li
                      key={`${template.id}-edit-${line.productId}`}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2f2924]">
                          {line.name}
                        </p>
                        <p className="text-xs text-[#2f2924]/45">
                          {line.unitPrice} / ks
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantityStepper
                          size="sm"
                          value={line.quantity}
                          min={1}
                          onChange={(quantity) =>
                            setItemQuantity(line.productId, quantity)
                          }
                          aria-label={`Množstvo: ${line.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(line.productId)}
                          aria-label={`Odstrániť ${line.name}`}
                          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-[#2f2924]/55 transition-colors hover:bg-[#faf8f5] hover:text-[#2f2924]"
                        >
                          <Trash2
                            className="size-3.5"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {draftItems.length === 0 ? (
                  <p className="mt-3 text-sm text-[#9a4d3f]">
                    Šablóna musí obsahovať aspoň jednu položku.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={addProductId}
                    onChange={(e) => setAddProductId(e.target.value)}
                    className={`${fieldClass} sm:flex-1`}
                    aria-label="Pridať produkt"
                  >
                    <option value="">Pridať produkt…</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {product.price}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!addProductId}
                    className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-4" strokeWidth={1.75} aria-hidden />
                    Pridať
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-4">
                  <p className="text-sm text-[#2f2924]/55">
                    Medzisúčet{" "}
                    <span className="font-semibold text-[#2f2924]">
                      {draftTotal}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                    >
                      <X className="size-3.5" strokeWidth={1.75} aria-hidden />
                      Zrušiť
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={draftItems.length === 0 || !draftName.trim()}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#75825B] px-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Uložiť zmeny
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[#2f2924]">
                      {template.name}
                    </h2>
                    {template.note ? (
                      <p className="mt-0.5 text-sm text-[#2f2924]/55">
                        {template.note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-[#2f2924]/45">
                      Upravené {template.updatedAtLabel} ·{" "}
                      {template.items.length} položiek ·{" "}
                      {formatTemplateTotal(template)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                    >
                      <Pencil
                        className="size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      Upraviť
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#75825B] px-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      title="Pripojíme po dokončení košíka"
                    >
                      <RotateCcw
                        className="size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      Objednať znova
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                    >
                      <Trash2
                        className="size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      Odstrániť
                    </button>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5 border-t border-black/6 pt-3">
                  {template.items.map((line) => (
                    <li
                      key={`${template.id}-${line.productId}`}
                      className="flex items-center justify-between gap-3 text-sm text-[#2f2924]/75"
                    >
                      <span className="min-w-0 truncate">{line.name}</span>
                      <span className="shrink-0 tabular-nums text-[#2f2924]/55">
                        {line.quantity}× · {line.unitPrice}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
