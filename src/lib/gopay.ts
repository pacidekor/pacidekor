import "server-only";

type GopayTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  errors?: Array<{ error_name?: string; message?: string }>;
};

export type GopayPaymentState =
  | "CREATED"
  | "PAYMENT_METHOD_CHOSEN"
  | "PAID"
  | "AUTHORIZED"
  | "CANCELED"
  | "TIMEOUTED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | string;

export type GopayPaymentStatus = {
  id: number;
  state: GopayPaymentState;
  order_number?: string;
  amount?: number;
  currency?: string;
  gw_url?: string;
};

export type CreateGopayPaymentInput = {
  orderNumber: string;
  amountEur: number;
  description: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zip: string;
    countryCode: "SVK" | "CZE" | string;
  };
  returnUrl: string;
  notificationUrl: string;
};

type CreateGopayPaymentResult = {
  id: number;
  gwUrl: string;
  state: GopayPaymentState;
};

function gopayBaseUrl() {
  const production = process.env.GOPAY_PRODUCTION === "true";
  return production
    ? "https://gate.gopay.cz/api"
    : "https://gw.sandbox.gopay.com/api";
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Chýba konfigurácia ${name}.`);
  }
  return value;
}

function isGopayConfigured() {
  return Boolean(
    process.env.GOPAY_GOID?.trim() &&
      process.env.GOPAY_CLIENT_ID?.trim() &&
      process.env.GOPAY_CLIENT_SECRET?.trim(),
  );
}

export function assertGopayConfigured() {
  if (!isGopayConfigured()) {
    throw new Error("GoPay nie je nakonfigurované.");
  }
}

let cachedToken:
  | { token: string; expiresAtMs: number; scope: string }
  | null = null;

async function getAccessToken(scope: "payment-create" | "payment-all") {
  const now = Date.now();
  if (
    cachedToken &&
    cachedToken.scope === scope &&
    cachedToken.expiresAtMs > now + 60_000
  ) {
    return cachedToken.token;
  }

  const clientId = requireEnv("GOPAY_CLIENT_ID");
  const clientSecret = requireEnv("GOPAY_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${gopayBaseUrl()}/oauth2/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope,
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as GopayTokenResponse;
  if (!response.ok || !data.access_token) {
    const detail =
      data.errors?.map((e) => e.message || e.error_name).filter(Boolean).join("; ") ||
      `HTTP ${response.status}`;
    throw new Error(`GoPay OAuth zlyhal: ${detail}`);
  }

  cachedToken = {
    token: data.access_token,
    scope,
    expiresAtMs: now + (data.expires_in ?? 1800) * 1000,
  };
  return data.access_token;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Zákazník", lastName: "-" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function amountToMinorUnits(amountEur: number) {
  return Math.round(amountEur * 100);
}

export async function createGopayPayment(
  input: CreateGopayPaymentInput,
): Promise<CreateGopayPaymentResult> {
  assertGopayConfigured();
  const goid = requireEnv("GOPAY_GOID");
  const token = await getAccessToken("payment-create");
  const { firstName, lastName } = splitName(input.customer.name);

  const body = {
    payer: {
      default_payment_instrument: "PAYMENT_CARD",
      allowed_payment_instruments: ["PAYMENT_CARD", "BANK_ACCOUNT"],
      contact: {
        first_name: firstName,
        last_name: lastName,
        email: input.customer.email,
        phone_number: input.customer.phone,
        city: input.customer.city,
        street: input.customer.street,
        postal_code: input.customer.zip,
        country_code: input.customer.countryCode,
      },
    },
    target: {
      type: "ACCOUNT",
      goid: Number(goid),
    },
    amount: amountToMinorUnits(input.amountEur),
    currency: "EUR",
    order_number: input.orderNumber,
    order_description: input.description,
    callback: {
      return_url: input.returnUrl,
      notification_url: input.notificationUrl,
    },
    lang: "sk",
  };

  const response = await fetch(`${gopayBaseUrl()}/payments/payment`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json()) as GopayPaymentStatus & {
    errors?: Array<{ error_name?: string; message?: string; field?: string }>;
  };

  if (!response.ok || !data.id || !data.gw_url) {
    const detail =
      data.errors
        ?.map((e) => [e.field, e.message || e.error_name].filter(Boolean).join(": "))
        .filter(Boolean)
        .join("; ") || `HTTP ${response.status}`;
    throw new Error(`GoPay create payment zlyhal: ${detail}`);
  }

  return {
    id: data.id,
    gwUrl: data.gw_url,
    state: data.state,
  };
}

export async function getGopayPaymentStatus(
  paymentId: string | number,
): Promise<GopayPaymentStatus> {
  assertGopayConfigured();
  const token = await getAccessToken("payment-all");

  const response = await fetch(
    `${gopayBaseUrl()}/payments/payment/${encodeURIComponent(String(paymentId))}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const data = (await response.json()) as GopayPaymentStatus & {
    errors?: Array<{ error_name?: string; message?: string }>;
  };

  if (!response.ok || data.id == null) {
    const detail =
      data.errors?.map((e) => e.message || e.error_name).filter(Boolean).join("; ") ||
      `HTTP ${response.status}`;
    throw new Error(`GoPay status zlyhal: ${detail}`);
  }

  return data;
}

export function isGopayPaidState(state: string | undefined | null) {
  return state === "PAID" || state === "AUTHORIZED";
}

export function mapCountryToGopayCode(country: string): "SVK" | "CZE" | string {
  const normalized = country.trim().toLowerCase();
  if (
    normalized === "sk" ||
    normalized === "svk" ||
    normalized.includes("slovensk")
  ) {
    return "SVK";
  }
  if (
    normalized === "cz" ||
    normalized === "cze" ||
    normalized.includes("česk") ||
    normalized.includes("cesk")
  ) {
    return "CZE";
  }
  return "SVK";
}
