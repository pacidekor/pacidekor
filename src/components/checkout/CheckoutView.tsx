"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Pencil, ShoppingBag } from "lucide-react";
import {
  cartItemCount,
  cartSubtotal,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
  type CartItem,
} from "@/lib/cart";
import {
  fetchClientCustomer,
  subscribeClientAuth,
} from "@/lib/client-auth";
import type { Customer } from "@/lib/customers";
import { productHref } from "@/lib/products";
import { useCartItems } from "@/lib/use-cart";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15";

const labelClass = "mb-1.5 block text-sm font-medium text-[#2f2924]";

const SHIPPING_OPTIONS = [
  {
    id: "packeta_point",
    label: "Packeta / Zásielkovňa - výdajné miesto",
    description: "Z-BOX alebo výdajné miesto podľa vášho výberu.",
    cost: 2.3,
    costFrom: true,
  },
  {
    id: "packeta_address",
    label: "Packeta / Zásielkovňa - na adresu",
    description: "Doručenie na adresu z fakturačných údajov.",
    cost: 3.6,
    costFrom: true,
  },
  {
    id: "pickup",
    label: "Osobný odber",
    description: "Vyzdvihnutie u nás po dohode.",
    cost: 0,
    costFrom: false,
  },
] as const;

const PAYMENT_OPTIONS = [
  { id: "transfer", label: "Bankový prevod" },
  { id: "cod", label: "Dobierka" },
] as const;

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  ico: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note: string;
  shippingMethod: (typeof SHIPPING_OPTIONS)[number]["id"];
  paymentMethod: (typeof PAYMENT_OPTIONS)[number]["id"];
  packetaPointId: string;
  packetaPointName: string;
};

const INITIAL_FORM: CheckoutForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  ico: "",
  dic: "",
  street: "",
  city: "",
  zip: "",
  country: "Slovensko",
  note: "",
  shippingMethod: "packeta_point",
  paymentMethod: "transfer",
  packetaPointId: "",
  packetaPointName: "",
};

function productCountLabel(count: number) {
  if (count === 1) return "1 produkt";
  if (count < 5) return `${count} produkty`;
  return `${count} produktov`;
}

function customerHasBilling(customer: Customer) {
  return Boolean(
    customer.name.trim() &&
      customer.email.trim() &&
      customer.phone.trim() &&
      customer.street.trim() &&
      customer.city.trim() &&
      customer.zip.trim() &&
      customer.country.trim(),
  );
}

function formFromCustomer(
  customer: Customer,
  prev: CheckoutForm,
): CheckoutForm {
  return {
    ...prev,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company ?? "",
    ico: customer.ico ?? "",
    dic: customer.dic ?? "",
    street: customer.street,
    city: customer.city,
    zip: customer.zip,
    country: customer.country || "Slovensko",
  };
}

function validateForm(form: CheckoutForm): string | null {
  if (!form.name.trim()) return "Zadajte meno a priezvisko.";
  if (!form.email.trim() || !form.email.includes("@")) {
    return "Zadajte platný e-mail.";
  }
  if (!form.phone.trim()) return "Zadajte telefón.";
  if (!form.street.trim()) return "Zadajte ulicu a číslo.";
  if (!form.city.trim()) return "Zadajte mesto.";
  if (!form.zip.trim()) return "Zadajte PSČ.";
  if (!form.country.trim()) return "Zadajte krajinu.";
  if (
    form.shippingMethod === "packeta_point" &&
    !form.packetaPointId.trim()
  ) {
    return "Vyberte výdajné miesto Packeta / Zásielkovňa.";
  }
  return null;
}

function formatShippingCost(option: (typeof SHIPPING_OPTIONS)[number]) {
  if (option.cost === 0) return "Zadarmo";
  const price = formatPrice(option.cost);
  return option.costFrom ? `od ${price}` : price;
}

function CheckoutGuard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/6 bg-white px-6 py-16 text-center sm:px-10">
      <p className="font-heading text-2xl font-semibold text-[#2f2924]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
        {body}
      </p>
      <Link
        href={href}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#75825B] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}

function OrderLines({ items }: { items: CartItem[] }) {
  return (
    <ul className="divide-y divide-black/6">
      {items.map((item) => {
        const lineTotal = parsePrice(item.product.price) * item.quantity;
        return (
          <li
            key={item.product.id}
            className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <Link
              href={productHref(item.product.slug)}
              prefetch={false}
              className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f3efe9]"
            >
              <Image
                src={item.product.image}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#2f2924]">
                {item.product.name}
              </p>
              <p className="mt-0.5 text-xs text-[#2f2924]/50">
                {item.quantity} × {item.product.price}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-[#2f2924]">
              {formatPrice(lineTotal)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function BillingSummary({
  form,
  onEdit,
}: {
  form: CheckoutForm;
  onEdit: () => void;
}) {
  const companyLine = [
    form.company,
    form.ico ? `IČO ${form.ico}` : null,
    form.dic ? `DIČ ${form.dic}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div className="min-w-0 space-y-1 text-sm leading-relaxed text-[#2f2924]">
          <p className="font-medium">{form.name}</p>
          {companyLine ? (
            <p className="text-[#2f2924]/65">{companyLine}</p>
          ) : null}
          <p className="text-[#2f2924]/65">
            {form.street}
            <br />
            {form.zip} {form.city}
            <br />
            {form.country}
          </p>
          <p className="pt-1 text-[#2f2924]/65">
            {form.email}
            <span className="mx-1.5 text-[#2f2924]/25" aria-hidden>
              ·
            </span>
            {form.phone}
          </p>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-black/8 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
        >
          <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
          Upraviť údaje
        </button>
      </div>

      <p className="border-t border-black/6 px-5 py-3 text-xs leading-relaxed text-[#2f2924]/60 sm:px-7">
        Údaje z vášho{" "}
        <Link
          href="/ucet"
          className="font-medium text-[#75825B] transition-opacity hover:opacity-80"
        >
          účtu
        </Link>
        . Trvalú zmenu uložíte v nastavení účtu.
      </p>
    </>
  );
}

function BillingFields({
  form,
  patch,
}: {
  form: CheckoutForm;
  patch: <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => void;
}) {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
      <div className="sm:col-span-2">
        <label htmlFor="checkout-name" className={labelClass}>
          Meno a priezvisko
        </label>
        <input
          id="checkout-name"
          name="name"
          autoComplete="name"
          className={fieldClass}
          value={form.name}
          onChange={(event) => patch("name", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="checkout-email" className={labelClass}>
          E-mail
        </label>
        <input
          id="checkout-email"
          name="email"
          type="email"
          autoComplete="email"
          className={fieldClass}
          value={form.email}
          onChange={(event) => patch("email", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="checkout-phone" className={labelClass}>
          Telefón
        </label>
        <input
          id="checkout-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={fieldClass}
          value={form.phone}
          onChange={(event) => patch("phone", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="checkout-company" className={labelClass}>
          Firma{" "}
          <span className="font-normal text-[#2f2924]/40">(voliteľné)</span>
        </label>
        <input
          id="checkout-company"
          name="company"
          autoComplete="organization"
          className={fieldClass}
          value={form.company}
          onChange={(event) => patch("company", event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="checkout-ico" className={labelClass}>
            IČO
          </label>
          <input
            id="checkout-ico"
            name="ico"
            className={fieldClass}
            value={form.ico}
            onChange={(event) => patch("ico", event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="checkout-dic" className={labelClass}>
            DIČ
          </label>
          <input
            id="checkout-dic"
            name="dic"
            className={fieldClass}
            value={form.dic}
            onChange={(event) => patch("dic", event.target.value)}
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="checkout-street" className={labelClass}>
          Ulica a číslo
        </label>
        <input
          id="checkout-street"
          name="street"
          autoComplete="street-address"
          className={fieldClass}
          value={form.street}
          onChange={(event) => patch("street", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="checkout-city" className={labelClass}>
          Mesto
        </label>
        <input
          id="checkout-city"
          name="city"
          autoComplete="address-level2"
          className={fieldClass}
          value={form.city}
          onChange={(event) => patch("city", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="checkout-zip" className={labelClass}>
          PSČ
        </label>
        <input
          id="checkout-zip"
          name="zip"
          autoComplete="postal-code"
          className={fieldClass}
          value={form.zip}
          onChange={(event) => patch("zip", event.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="checkout-country" className={labelClass}>
          Krajina
        </label>
        <input
          id="checkout-country"
          name="country"
          autoComplete="country-name"
          className={fieldClass}
          value={form.country}
          onChange={(event) => patch("country", event.target.value)}
        />
      </div>
    </div>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const items = useCartItems();
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mockOrderId, setMockOrderId] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      const next = await fetchClientCustomer();
      if (cancelled) return;
      setCustomer(next);
      if (next) {
        setForm((prev) => formFromCustomer(next, prev));
        setEditingBilling(!customerHasBilling(next));
      } else {
        setEditingBilling(true);
      }
      setAuthReady(true);
    }

    void loadCustomer();
    return subscribeClientAuth(() => {
      void loadCustomer();
    });
  }, []);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const count = cartItemCount(items);
  const shipping = SHIPPING_OPTIONS.find(
    (option) => option.id === form.shippingMethod,
  );
  const shippingCost = shipping?.cost ?? 0;
  const freeShipping = subtotal >= 100;
  const effectiveShipping = freeShipping ? 0 : shippingCost;
  const total = subtotal + effectiveShipping;

  const showBillingSummary =
    authReady &&
    customer != null &&
    customerHasBilling(customer) &&
    !editingBilling;

  function patch<K extends keyof CheckoutForm>(
    key: K,
    value: CheckoutForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      setEditingBilling(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    // Mock place-order until payments / orders persistence are wired.
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const id = `PD-${Date.now().toString().slice(-8)}`;
    setMockOrderId(id);
    setSubmitted(true);
    setSubmitting(false);
  }

  if (items.length === 0 && !submitted) {
    return (
      <CheckoutGuard
        title="Košík je prázdny"
        body="Pred pokračovaním k pokladni si pridajte produkty do košíka."
        href="/"
        cta="Prejsť na produkty"
      />
    );
  }

  if (!meetsMinOrder(subtotal) && !submitted) {
    return (
      <CheckoutGuard
        title="Minimálna objednávka"
        body={`Na dokončenie objednávky potrebujete aspoň ${formatPrice(MIN_ORDER_TOTAL)}. Teraz máte ${formatPrice(subtotal)}.`}
        href="/kosik"
        cta="Späť do košíka"
      />
    );
  }

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-3xl border border-black/6 bg-white px-6 py-14 text-center sm:px-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#75825B]/12 text-[#75825B]">
          <CheckCircle2 className="size-8" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-5 font-heading text-2xl font-semibold text-[#2f2924]">
          Objednávka je pripravená
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2f2924]/60">
          Náhľad pokladne je hotový. Platba a uloženie objednávky ešte nie sú
          napojené - číslo{" "}
          <span className="font-medium text-[#2f2924]">{mockOrderId}</span> je
          len skúšobné.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/kosik"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/8 bg-white px-6 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B] sm:w-auto"
          >
            Späť do košíka
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#75825B] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
            Pokračovať v nákupe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(17rem,1fr)] lg:items-start lg:gap-8"
      noValidate
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-black/6 bg-white">
          <div className="border-b border-black/6 px-5 py-5 sm:px-7">
            <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
              Fakturačné údaje
            </h2>
            <p className="mt-1 text-sm text-[#2f2924]/55">
              {showBillingSummary
                ? "Použijeme údaje z vášho zákazníckeho účtu."
                : "Tieto údaje použijeme na faktúru a komunikáciu k objednávke."}
            </p>
          </div>

          {showBillingSummary ? (
            <BillingSummary
              form={form}
              onEdit={() => setEditingBilling(true)}
            />
          ) : (
            <>
              <BillingFields form={form} patch={patch} />
              {customer && customerHasBilling(customer) ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/6 px-5 py-4 sm:px-7">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBilling(false);
                      setError(null);
                    }}
                    className="text-sm font-medium text-[#75825B] transition-opacity hover:opacity-80"
                  >
                    Zbaliť súhrn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => formFromCustomer(customer, prev));
                      setEditingBilling(false);
                      setError(null);
                    }}
                    className="text-sm font-medium text-[#2f2924]/55 transition-colors hover:text-[#75825B]"
                  >
                    Obnoviť z účtu
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-black/6 bg-white">
          <div className="border-b border-black/6 px-5 py-5 sm:px-7">
            <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
              Doprava a platba
            </h2>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-7">
            <fieldset>
              <legend className={labelClass}>Spôsob dopravy</legend>
              <div className="space-y-2.5">
                {SHIPPING_OPTIONS.map((option) => {
                  const selected = form.shippingMethod === option.id;
                  const expandable =
                    option.id === "packeta_point" ||
                    option.id === "packeta_address";

                  return (
                    <div
                      key={option.id}
                      className={`rounded-xl border transition-colors duration-300 ${
                        selected
                          ? "border-[#75825B] bg-[#75825B]/6"
                          : "border-black/8 hover:border-black/15"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3">
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={option.id}
                            checked={selected}
                            onChange={() => {
                              setForm((prev) => ({
                                ...prev,
                                shippingMethod: option.id,
                                ...(option.id !== "packeta_point"
                                  ? {
                                      packetaPointId: "",
                                      packetaPointName: "",
                                    }
                                  : null),
                              }));
                              if (error) setError(null);
                            }}
                            className="mt-0.5 size-4 accent-[#75825B]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-[#2f2924]">
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-[#2f2924]/55">
                              {option.description}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-[#2f2924]/65">
                          {formatShippingCost(option)}
                        </span>
                      </label>

                      {expandable ? (
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div
                              className={`border-t border-[#75825B]/20 px-4 py-3 transition-opacity duration-300 ease-out ${
                                selected ? "opacity-100" : "opacity-0"
                              }`}
                            >
                              {option.id === "packeta_point" ? (
                                form.packetaPointId ? (
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium tracking-[0.08em] text-[#75825B] uppercase">
                                        Vybrané výdajné miesto
                                      </p>
                                      <p className="mt-1 text-sm font-medium text-[#2f2924]">
                                        {form.packetaPointName}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm((prev) => ({
                                          ...prev,
                                          packetaPointId: "",
                                          packetaPointName: "",
                                        }));
                                      }}
                                      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-black/8 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
                                    >
                                      Zmeniť
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-[#2f2924]">
                                        Výber výdajného miesta
                                      </p>
                                      <p className="mt-1 text-xs leading-relaxed text-[#2f2924]/55">
                                        Tu sa napojí Packeta widget na výber
                                        Z-BOX alebo výdajného miesta.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm((prev) => ({
                                          ...prev,
                                          packetaPointId: "demo-zbox-001",
                                          packetaPointName:
                                            "Z-BOX Bratislava - ukážka (widget neskôr)",
                                        }));
                                        if (error) setError(null);
                                      }}
                                      className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                    >
                                      Vybrať miesto
                                    </button>
                                  </div>
                                )
                              ) : (
                                <p className="text-xs leading-relaxed text-[#2f2924]/60">
                                  Balík doručíme na adresu z fakturačných údajov
                                  {form.street.trim()
                                    ? `: ${form.street}, ${form.zip} ${form.city}`
                                    : "."}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className={labelClass}>Spôsob platby</legend>
              <div className="space-y-2.5">
                {PAYMENT_OPTIONS.map((option) => {
                  const selected = form.paymentMethod === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        selected
                          ? "border-[#75825B] bg-[#75825B]/6"
                          : "border-black/8 hover:border-black/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.id}
                        checked={selected}
                        onChange={() => patch("paymentMethod", option.id)}
                        className="size-4 accent-[#75825B]"
                      />
                      <span className="text-sm font-medium text-[#2f2924]">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="checkout-note" className={labelClass}>
                Poznámka{" "}
                <span className="font-normal text-[#2f2924]/40">(voliteľné)</span>
              </label>
              <textarea
                id="checkout-note"
                name="note"
                rows={3}
                className="w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15"
                placeholder="Napr. poschodie, čas doručenia…"
                value={form.note}
                onChange={(event) => patch("note", event.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-[calc(5rem+3.5rem)]">
        <div className="overflow-hidden rounded-3xl border border-black/6 bg-white">
          <div className="border-b border-black/6 px-6 py-5 sm:px-7">
            <h2 className="font-heading text-xl font-semibold text-[#2f2924]">
              Súhrn objednávky
            </h2>
            <p className="mt-1 text-sm text-[#2f2924]/55">
              {productCountLabel(count)}
            </p>
          </div>

          <div className="px-6 py-4 sm:px-7">
            <OrderLines items={items} />
          </div>

          <div className="space-y-3 border-t border-black/6 px-6 py-5 sm:px-7">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[#2f2924]/60">Medzisúčet</span>
              <span className="font-medium text-[#2f2924]">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[#2f2924]/60">Doprava</span>
              <span className="font-medium text-[#2f2924]">
                {effectiveShipping === 0
                  ? "Zadarmo"
                  : formatPrice(effectiveShipping)}
              </span>
            </div>
            {freeShipping && shippingCost > 0 ? (
              <p className="text-xs text-[#2f2924]/50">
                Nad 100 € je doprava zadarmo.
              </p>
            ) : null}

            <div className="h-px bg-black/8" aria-hidden />

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-[#2f2924]">Celkom</span>
              <span className="font-heading text-2xl font-semibold text-[#2f2924]">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <div className="border-t border-black/6 px-6 py-5 sm:px-7">
            {error ? (
              <p className="mb-3 rounded-xl border border-[#c45c4a]/25 bg-[#f3e8e6] px-3.5 py-2.5 text-sm text-[#9a4d3f]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
            >
              {submitting ? "Odosielam…" : "Dokončiť objednávku"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/kosik")}
              className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-black/8 bg-white text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
            >
              Späť do košíka
            </button>

            <p className="mt-3 text-center text-xs leading-snug text-[#2f2924]/45">
              Platba ešte nie je napojená — ide o prípravu procesu objednávky.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
