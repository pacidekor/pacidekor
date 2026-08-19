"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  ClipboardList,
  ExternalLink,
  FileText,
  History,
  Layers,
  LogOut,
  Package,
  Pencil,
  RotateCcw,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";
import { AccountOrderDetail } from "@/components/account/AccountOrderDetail";
import { AccountTemplateEditor } from "@/components/account/AccountTemplateEditor";
import { SaveCartTemplateModal } from "@/components/cart/SaveCartTemplateModal";
import {
  clearClientSession,
  fetchClientCustomer,
  notifyClientAuthChanged,
  subscribeClientAuth,
} from "@/lib/client-auth";
import {
  CUSTOMER_TYPE_META,
  customerDisplayName,
  type Customer,
} from "@/lib/customers";
import {
  changeOwnEmail,
  changeOwnPassword,
  updateOwnProfile,
} from "@/lib/actions/auth";
import { PasswordField } from "@/components/PasswordField";
import { companyError, emailError, sanitizeCompany } from "@/lib/form-validation";
import { birthDateError } from "@/lib/birth-date";
import {
  ORDER_TEMPLATES_EVENT,
  deleteOrderTemplate,
  formatTemplateTotal,
  getTemplatesForCustomer,
  type OrderTemplate,
} from "@/lib/order-templates";
import { readCartItems, replaceCartContents, type CartFillLine } from "@/lib/cart";
import { listCustomerOrdersAction } from "@/lib/actions/orders";
import {
  ORDER_STATUS_META,
  ORDERS_EVENT,
  formatOrderShippingLine,
  formatOrderTotal,
  getActiveOrdersForCustomerEmail,
  getOrderHistoryForCustomerEmail,
  type Order,
} from "@/lib/orders";
import { getProductCatalog } from "@/lib/product-catalog";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

const labelClass = "mb-1.5 block text-sm font-medium text-[#2f2924]";

type SectionId =
  | "nastavenie"
  | "aktivne"
  | "historia"
  | "sablony";

type NavItem = {
  id: SectionId;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
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
      { id: "sablony", label: "Šablóny", icon: Layers },
    ],
  },
  {
    title: "Váš účet",
    items: [{ id: "nastavenie", label: "Nastavenie", icon: Settings }],
  },
];

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
  nastavenie: {
    title: "Nastavenie účtu",
    subtitle: "Kontaktné údaje, e-mail a heslo k vášmu účtu.",
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
  birthDate: string;
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
    birthDate: customer.birthDate ?? "",
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

export function ClientAccountSettings({
  initialOrders,
}: {
  initialOrders?: Order[];
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<SectionId>("aktivne");
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>(
    initialOrders ?? [],
  );
  const [ordersLoading, setOrdersLoading] = useState(initialOrders === undefined);
  const [ordersTick, setOrdersTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function syncCustomer() {
      const found = await fetchClientCustomer();
      if (cancelled) return;
      setCustomer(found);
      if (found) {
        setProfile(toProfileForm(found));
        setTemplates(getTemplatesForCustomer(found.id));
      }
      setHydrated(true);
    }

    function syncTemplates() {
      void fetchClientCustomer().then((found) => {
        if (!found || cancelled) return;
        setTemplates(getTemplatesForCustomer(found.id));
      });
    }

    function syncOrders() {
      setOrdersTick((value) => value + 1);
    }

    void syncCustomer();
    const unsubscribe = subscribeClientAuth(() => {
      void syncCustomer();
    });
    window.addEventListener(ORDER_TEMPLATES_EVENT, syncTemplates);
    window.addEventListener(ORDERS_EVENT, syncOrders);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(ORDER_TEMPLATES_EVENT, syncTemplates);
      window.removeEventListener(ORDERS_EVENT, syncOrders);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!customer) {
      router.replace("/");
    }
  }, [hydrated, customer, router]);

  useEffect(() => {
    if (!customer) {
      setCustomerOrders([]);
      setOrdersLoading(false);
      return;
    }

    let cancelled = false;
    const hasCachedOrders = (initialOrders?.length ?? 0) > 0;

    if (!hasCachedOrders) {
      setOrdersLoading(true);
    }

    void listCustomerOrdersAction(customer.email).then((result) => {
      if (cancelled) return;
      setOrdersLoading(false);
      if (!result.ok) return;
      setCustomerOrders(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [customer, ordersTick, initialOrders]);

  const activeOrders = useMemo(
    () =>
      customer
        ? getActiveOrdersForCustomerEmail(customerOrders, customer.email)
        : [],
    [customer, customerOrders],
  );
  const historyOrders = useMemo(
    () =>
      customer
        ? getOrderHistoryForCustomerEmail(customerOrders, customer.email)
        : [],
    [customer, customerOrders],
  );

  const navGroups = useMemo(() => {
    if (!customer) return [];
    return NAV_GROUPS;
  }, [customer]);

  async function logout() {
    await clearClientSession();
    router.replace("/");
    router.refresh();
  }

  function patchProfile<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setProfileSaved(false);
  }

  async function saveProfile(): Promise<boolean> {
    if (!customer || !profile) return false;
    if (!profile.name.trim() || !profile.phone.trim()) {
      return false;
    }
    const result = await updateOwnProfile({
      name: profile.name.trim(),
      company: profile.company.trim() || undefined,
      phone: profile.phone.trim(),
      street: profile.street.trim(),
      city: profile.city.trim(),
      zip: profile.zip.trim(),
      country: profile.country.trim() || "Slovensko",
      ico: profile.ico.trim() || undefined,
      dic: profile.dic.trim() || undefined,
      birthDate: profile.birthDate.trim() || undefined,
    });
    if (!result.ok) return false;
    setCustomer(result.data.customer);
    setProfile(toProfileForm(result.data.customer));
    setProfileSaved(true);
    return true;
  }

  function resetProfile() {
    if (!customer) return;
    setProfile(toProfileForm(customer));
    setProfileSaved(false);
  }

  if (!hydrated || !customer || !profile) {
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
              <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/55">
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
                  onCustomerUpdated={(next) => {
                    setCustomer(next);
                    setProfile(toProfileForm(next));
                  }}
                />
              ) : null}

              {section === "aktivne" ? (
                <OrdersSection
                  orders={activeOrders}
                  loading={ordersLoading}
                  customerEmail={customer.email}
                  allowCancel
                  onOrdersChanged={() => setOrdersTick((value) => value + 1)}
                  emptyTitle="Žiadne aktívne objednávky"
                  emptyBody="Keď odošlete novú objednávku, uvidíte ju tu až do doručenia."
                />
              ) : null}

              {section === "historia" ? (
                <OrdersSection
                  orders={historyOrders}
                  loading={ordersLoading}
                  customerEmail={customer.email}
                  customerId={customer.id}
                  enableReorderActions
                  onTemplatesChanged={() =>
                    setTemplates(getTemplatesForCustomer(customer.id))
                  }
                  onViewTemplates={() => setSection("sablony")}
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


function formatBirthDateSk(value?: string) {
  if (!value?.trim()) return null;
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-[#2f2924]/50">{label}</dt>
      <dd className="text-sm font-medium text-[#2f2924]">{value}</dd>
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
  onCustomerUpdated,
}: {
  customer: Customer;
  profile: ProfileForm;
  saved: boolean;
  onPatch: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void;
  onSave: () => Promise<boolean> | boolean;
  onReset: () => void;
  onCustomerUpdated: (customer: Customer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const addressLine = [profile.street, [profile.zip, profile.city].filter(Boolean).join(" "), profile.country]
    .filter(Boolean)
    .join(", ");

  async function handleSave() {
    setProfileError(null);
    if (!profile.name.trim()) {
      setProfileError("Zadajte meno / kontaktnú osobu.");
      return;
    }
    if (!profile.phone.trim()) {
      setProfileError("Zadajte telefón.");
      return;
    }
    if (customer.type === "velkoobchod") {
      const companyErr = companyError(profile.company);
      if (companyErr) {
        setProfileError(companyErr);
        return;
      }
    }
    const birthErr = birthDateError(profile.birthDate);
    if (birthErr) {
      setProfileError(birthErr);
      return;
    }
    setSaving(true);
    const ok = await onSave();
    setSaving(false);
    if (!ok) {
      setProfileError("Údaje sa nepodarilo uložiť. Skúste to znova.");
      return;
    }
    setEditing(false);
  }

  function handleCancel() {
    onReset();
    setProfileError(null);
    setEditing(false);
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/6 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#e8ebe2] font-heading text-base font-semibold text-[#75825B]">
              {initials(customer.name)}
            </div>
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-[#2f2924]">
                <UserRound className="size-4 text-[#75825B]" strokeWidth={1.75} />
                Kontaktné údaje
              </p>
              <p className="mt-1 text-sm text-[#2f2924]/55">
                {customerDisplayName(customer)}
              </p>
            </div>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setProfileError(null);
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
            >
              <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
              Upraviť
            </button>
          ) : null}
        </div>

        {!editing ? (
          <dl className="mt-5 space-y-3">
            <SummaryRow label="Kontaktná osoba" value={profile.name} />
            <SummaryRow label="Firma" value={profile.company} />
            <SummaryRow label="Telefón" value={profile.phone} />
            <SummaryRow
              label="Dátum narodenia"
              value={formatBirthDateSk(profile.birthDate)}
            />
            <SummaryRow label="Adresa" value={addressLine} />
            <SummaryRow label="IČO" value={profile.ico} />
            <SummaryRow label="DIČ" value={profile.dic} />
          </dl>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                  {customer.type !== "velkoobchod" ? (
                    <span className="font-normal text-[#2f2924]/40">
                      {" "}
                      (voliteľné)
                    </span>
                  ) : null}
                </label>
                <input
                  id="acc-company"
                  className={fieldClass}
                  value={profile.company}
                  onChange={(e) =>
                    onPatch("company", sanitizeCompany(e.target.value))
                  }
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
              <div>
                <label htmlFor="acc-birth" className={labelClass}>
                  Dátum narodenia{" "}
                  <span className="font-normal text-[#2f2924]/40">(voliteľné)</span>
                </label>
                <input
                  id="acc-birth"
                  type="date"
                  className={fieldClass}
                  value={profile.birthDate}
                  onChange={(e) => onPatch("birthDate", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
                <div>
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
              </div>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="acc-ico" className={labelClass}>
                    IČO{" "}
                    <span className="font-normal text-[#2f2924]/40">
                      (voliteľné)
                    </span>
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
                    DIČ{" "}
                    <span className="font-normal text-[#2f2924]/40">
                      (voliteľné)
                    </span>
                  </label>
                  <input
                    id="acc-dic"
                    className={fieldClass}
                    value={profile.dic}
                    onChange={(e) => onPatch("dic", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {profileError ? (
              <p className="mt-4 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
                {profileError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              {saved ? (
                <p className="mr-auto text-sm text-[#15803d]">Zmeny boli uložené.</p>
              ) : null}
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                Zrušiť
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Ukladám…" : "Uložiť"}
              </button>
            </div>
          </>
        )}
      </section>

      <EmailChangeCard
        currentEmail={customer.email}
        onCustomerUpdated={onCustomerUpdated}
      />
      <PasswordChangeCard />
    </div>
  );
}

function EmailChangeCard({
  currentEmail,
  onCustomerUpdated,
}: {
  currentEmail: string;
  onCustomerUpdated: (customer: Customer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuccess(null);
    const check = emailError(email);
    if (check) {
      setError(check);
      return;
    }
    if (!password) {
      setError("Zadajte aktuálne heslo.");
      return;
    }
    setPending(true);
    const result = await changeOwnEmail({
      newEmail: email,
      currentPassword: password,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(
      `Požiadavka bola odoslaná. Ak máte v Supabase nastavené SMTP, potvrdenie príde na ${result.data.email}. Skontrolujte aj spam.`,
    );
    setEmail("");
    setPassword("");
    setOpen(false);
    notifyClientAuthChanged();
    void fetchClientCustomer().then((next) => {
      if (next) onCustomerUpdated(next);
    });
  }

  return (
    <section className="border-t border-black/6 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[#2f2924]">E-mail</h2>
          <p className="mt-1 text-sm text-[#2f2924]/55">{currentEmail}</p>
          {success ? (
            <p className="mt-2 text-sm text-[#15803d]">{success}</p>
          ) : null}
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError(null);
              setSuccess(null);
            }}
            className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
          >
            Zmeniť e-mail
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-5 space-y-4">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor="acc-new-email" className={labelClass}>
                Nový e-mail
              </label>
              <input
                id="acc-new-email"
                type="email"
                autoComplete="email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="acc-email-password" className={labelClass}>
                Aktuálne heslo
              </label>
              <PasswordField
                id="acc-email-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEmail("");
                  setPassword("");
                  setError(null);
                }}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                Zrušiť
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void submit()}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Ukladám…" : "Uložiť"}
              </button>
            </div>
          </div>
          {error ? (
            <p className="rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PasswordChangeCard() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError("Nové heslo musí mať aspoň 6 znakov.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Nové heslá sa nezhodujú.");
      return;
    }
    setPending(true);
    const result = await changeOwnPassword({
      currentPassword,
      newPassword,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Heslo bolo zmenené.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOpen(false);
  }

  return (
    <section className="border-t border-black/6 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[#2f2924]">Heslo</h2>
          <p className="mt-1 text-sm text-[#2f2924]/55">
            ••••••••
          </p>
          {success ? (
            <p className="mt-2 text-sm text-[#15803d]">{success}</p>
          ) : null}
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError(null);
              setSuccess(null);
            }}
            className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
          >
            Zmeniť heslo
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-5 space-y-4">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="acc-current-password" className={labelClass}>
                Aktuálne heslo
              </label>
              <PasswordField
                id="acc-current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="acc-new-password" className={labelClass}>
                Nové heslo
              </label>
              <PasswordField
                id="acc-new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="acc-confirm-password" className={labelClass}>
                Potvrdenie nového hesla
              </label>
              <PasswordField
                id="acc-confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
              >
                Zrušiť
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void submit()}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Ukladám…" : "Uložiť"}
              </button>
            </div>
          </div>
          {error ? (
            <p className="rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function linesFromCatalogItems(
  items: { productId: string; quantity: number }[],
): CartFillLine[] {
  const lines: CartFillLine[] = [];
  for (const line of items) {
    const product = getProductCatalog().find(
      (item) => item.id === line.productId,
    );
    if (!product) continue;
    lines.push({ product, quantity: line.quantity });
  }
  return lines;
}

function replaceCartWithOrderItems(order: Order): number {
  return replaceCartContents(linesFromCatalogItems(order.items));
}

function ReplaceCartConfirmModal({
  open,
  orderId,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  orderId: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer disabled:cursor-wait"
        aria-label="Zavrieť"
        disabled={busy}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_20px_48px_rgba(47,41,36,0.22)]"
      >
        <div className="flex items-start gap-3 px-5 py-5 sm:px-6 sm:py-6">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3e8e6] text-[#9a4d3f]">
            <AlertTriangle className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-heading text-lg font-semibold text-[#2f2924]"
            >
              Nahradiť obsah košíka?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
              V košíku už máte produkty. Opakovaním objednávky{" "}
              <span className="font-medium text-[#2f2924]">#{orderId}</span> sa
              aktuálny košík úplne vyprázdni a nahradí položkami z tejto
              objednávky.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-black/6 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5] disabled:cursor-wait disabled:opacity-60"
          >
            Zrušiť
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? "Pripravujem…" : "Áno, nahradiť košík"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function OrdersSection({
  orders,
  loading = false,
  emptyTitle,
  emptyBody,
  customerEmail,
  customerId,
  allowCancel = false,
  enableReorderActions = false,
  onTemplatesChanged,
  onViewTemplates,
  onOrdersChanged,
}: {
  orders: Order[];
  loading?: boolean;
  emptyTitle: string;
  emptyBody: string;
  customerEmail: string;
  customerId?: string;
  allowCancel?: boolean;
  enableReorderActions?: boolean;
  onTemplatesChanged?: () => void;
  onViewTemplates?: () => void;
  onOrdersChanged?: () => void;
}) {
  const router = useRouter();
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [replaceOrder, setReplaceOrder] = useState<Order | null>(null);
  const [templateOrder, setTemplateOrder] = useState<Order | null>(null);
  const [repeatingId, setRepeatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runRepeatOrder(order: Order) {
    if (repeatingId) return;
    setRepeatingId(order.id);
    setActionError(null);
    try {
      const added = replaceCartWithOrderItems(order);
      if (added === 0) {
        setActionError(
          "Nepodarilo sa pridať produkty do košíka. Skontrolujte sklad alebo dostupnosť.",
        );
        return;
      }
      setReplaceOrder(null);
      router.push("/kosik");
    } finally {
      setRepeatingId(null);
    }
  }

  function requestRepeatOrder(order: Order) {
    setActionError(null);
    if (readCartItems().length > 0) {
      setReplaceOrder(order);
      return;
    }
    void runRepeatOrder(order);
  }

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Načítavam objednávky">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="animate-pulse rounded-2xl border border-black/6 bg-[#faf8f5] px-5 py-5"
          >
            <div className="h-5 w-40 rounded bg-black/8" />
            <div className="mt-3 h-3 w-64 rounded bg-black/6" />
            <div className="mt-5 flex gap-2">
              <div className="h-10 w-24 rounded-xl bg-black/6" />
              <div className="h-10 w-28 rounded-xl bg-black/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

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
        <p className="mx-auto mt-1 text-sm text-[#2f2924]/55">
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
    <>
      {actionError ? (
        <p className="mb-3 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
          {actionError}
        </p>
      ) : null}

      <div className="space-y-3">
        {orders.map((order) => {
          const meta = ORDER_STATUS_META[order.status];
          const repeating = repeatingId === order.id;
          const itemCount = order.items.length;
          const itemLabel =
            itemCount === 1
              ? "položka"
              : itemCount < 5
                ? "položky"
                : "položiek";

          return (
            <article
              key={order.id}
              className="rounded-2xl border border-black/8 px-4 py-4 sm:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-[#2f2924]">
                      #{order.id}
                    </h2>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#2f2924]/45">
                    {order.createdAtLabel} · {order.paymentMethod} ·{" "}
                    {formatOrderShippingLine(order)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailOrder(order)}
                    className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                  >
                    <FileText className="size-3.5" strokeWidth={1.75} aria-hidden />
                    Detail
                  </button>
                  {enableReorderActions ? (
                    <>
                      <button
                        type="button"
                        disabled={Boolean(repeatingId)}
                        onClick={() => requestRepeatOrder(order)}
                        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5] disabled:cursor-wait disabled:opacity-70"
                      >
                        <RotateCcw
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {repeating ? "Pripravujem…" : "Opakovať"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateOrder(order)}
                        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                      >
                        <Layers
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        Šablóna
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/6 pt-3 text-sm">
                <span className="text-[#2f2924]/75">
                  {itemCount} {itemLabel}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[#2f2924]">
                  {formatOrderTotal(order)}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {detailOrder ? (
        <AccountOrderDetail
          order={detailOrder}
          customerEmail={customerEmail}
          allowCancel={allowCancel}
          onClose={() => setDetailOrder(null)}
          onCancelled={() => onOrdersChanged?.()}
        />
      ) : null}

      <ReplaceCartConfirmModal
        open={Boolean(replaceOrder)}
        orderId={replaceOrder?.id ?? ""}
        busy={Boolean(repeatingId)}
        onClose={() => {
          if (repeatingId) return;
          setReplaceOrder(null);
        }}
        onConfirm={() => {
          if (replaceOrder) void runRepeatOrder(replaceOrder);
        }}
      />

      {enableReorderActions && customerId && templateOrder ? (
        <SaveCartTemplateModal
          open
          onClose={() => setTemplateOrder(null)}
          customerId={customerId}
          defaultName={`Objednávka #${templateOrder.id}`}
          items={templateOrder.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))}
          description={`Uložíme položky z objednávky #${templateOrder.id} (${templateOrder.items.length} ${
            templateOrder.items.length === 1
              ? "položka"
              : templateOrder.items.length < 5
                ? "položky"
                : "položiek"
          }) ako šablónu pre opakované objednávky.`}
          onSaved={onTemplatesChanged}
          onViewTemplates={onViewTemplates}
        />
      ) : null}
    </>
  );
}

function TemplatesSection({
  templates,
  onRefresh,
}: {
  templates: OrderTemplate[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [editingTemplate, setEditingTemplate] = useState<OrderTemplate | null>(
    null,
  );
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    if (editingTemplate?.id === id) setEditingTemplate(null);
    deleteOrderTemplate(id);
    onRefresh();
  }

  function orderAgain(template: OrderTemplate) {
    if (orderingId) return;

    setOrderingId(template.id);
    setOrderError(null);

    const added = replaceCartContents(linesFromCatalogItems(template.items));

    if (added === 0) {
      setOrderError(
        "Nepodarilo sa pridať produkty do košíka. Skontrolujte sklad.",
      );
      setOrderingId(null);
      return;
    }

    setOrderingId(null);
    router.push("/pokladna");
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
        <p className="mx-auto mt-1 text-sm text-[#2f2924]/55">
          Keď budete mať v košíku zostavu, ktorú objednávate často, uložíte ju
          ako šablónu a nabudúce ju spustíte odtiaľto.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {orderError ? (
          <p className="rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
            {orderError}
          </p>
        ) : null}
        {templates.map((template) => (
          <article
            key={template.id}
            className="rounded-2xl border border-black/8 px-4 py-4 sm:px-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => toggleExpanded(template.id)}
                aria-expanded={expandedIds.has(template.id)}
                className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none"
              >
                <div className="flex items-start gap-2">
                  <ChevronDown
                    className={`mt-1 size-4 shrink-0 text-[#2f2924]/40 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      expandedIds.has(template.id) ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="min-w-0">
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
                </div>
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => orderAgain(template)}
                  disabled={orderingId === template.id}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#faf8f5] disabled:cursor-wait disabled:opacity-70"
                >
                  <RotateCcw
                    className="size-3.5"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {orderingId === template.id
                    ? "Pripravujem…"
                    : "Objednať znova"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(template)}
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
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                expandedIds.has(template.id)
                  ? "grid-rows-[1fr]"
                  : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <ul
                  className={`mt-4 space-y-1.5 border-t border-black/6 pt-3 transition-opacity duration-300 ease-out ${
                    expandedIds.has(template.id)
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                >
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
              </div>
            </div>
          </article>
        ))}
      </div>

      {editingTemplate ? (
        <AccountTemplateEditor
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={onRefresh}
        />
      ) : null}
    </>
  );
}
