import type { ProfileRow } from "@/lib/supabase/database.types";

export type CustomerType = "maloobchod" | "velkoobchod";

export type CustomerStatus =
  | "aktivny"
  | "ziada_registraciu"
  | "zamietnuty"
  | "zablokovany";

export type Customer = {
  id: string;
  type: CustomerType;
  status: CustomerStatus;
  name: string;
  email: string;
  phone: string;
  company?: string;
  ico?: string;
  dic?: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note?: string;
  createdAtLabel: string;
  registeredAtLabel?: string;
  createdAt: string;
  registeredAt?: string;
};

export type WholesaleRegistrationInput = {
  name: string;
  company: string;
  ico: string;
  dic?: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note?: string;
  password: string;
};

export type RetailRegistrationInput = {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  password: string;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const CUSTOMER_TYPE_META: Record<
  CustomerType,
  { label: string; className: string }
> = {
  maloobchod: {
    label: "Maloobchod",
    className: "bg-[#e8ebe2] text-[#5f6a49]",
  },
  velkoobchod: {
    label: "Veľkoobchod",
    className: "bg-[#e0e7ff] text-[#3730a3]",
  },
};

export const CUSTOMER_STATUS_META: Record<
  CustomerStatus,
  { label: string; className: string }
> = {
  aktivny: {
    label: "Aktívny",
    className: "bg-[#dcfce7] text-[#15803d]",
  },
  ziada_registraciu: {
    label: "Žiada registráciu",
    className: "bg-[#ffedd5] text-[#c2410c]",
  },
  zamietnuty: {
    label: "Zamietnutý",
    className: "bg-[#fee2e2] text-[#b91c1c]",
  },
  zablokovany: {
    label: "Zablokovaný",
    className: "bg-[#f3f4f6] text-[#4b5563]",
  },
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function customerDisplayName(customer: Pick<Customer, "name" | "company">) {
  return customer.company?.trim() || customer.name;
}

export function formatRelativeSk(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 45) return "práve teraz";
  if (diffMin < 60) return `pred ${diffMin} min.`;
  if (diffHour < 24) return `pred ${diffHour} hod.`;
  if (diffDay < 7) return `pred ${diffDay} d.`;

  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function profileToCustomer(row: ProfileRow): Customer {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company ?? undefined,
    ico: row.ico ?? undefined,
    dic: row.dic ?? undefined,
    street: row.street,
    city: row.city,
    zip: row.zip,
    country: row.country,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    registeredAt: row.registered_at ?? undefined,
    createdAtLabel: formatRelativeSk(row.created_at),
    registeredAtLabel: row.registered_at
      ? formatRelativeSk(row.registered_at)
      : undefined,
  };
}

export function loginBlockedMessage(
  status: CustomerStatus,
  type: CustomerType,
): string | null {
  if (status === "ziada_registraciu") {
    return type === "velkoobchod"
      ? "Vaša žiadosť ešte čaká na schválenie."
      : "Váš účet ešte nie je aktívny.";
  }
  if (status === "zamietnuty") {
    return "Vaša žiadosť bola zamietnutá. Kontaktujte nás pre viac informácií.";
  }
  if (status === "zablokovany") {
    return "Tento účet je zablokovaný.";
  }
  if (status !== "aktivny") {
    return "Prihlásenie nie je možné.";
  }
  return null;
}
