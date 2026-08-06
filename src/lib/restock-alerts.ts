"use client";

const STORAGE_KEY = "pacidekor:restock-alerts";

export type RestockAlert = {
  productId: string;
  productName: string;
  email: string;
  createdAt: string;
};

function readAlerts(): RestockAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RestockAlert =>
        !!item &&
        typeof item === "object" &&
        typeof (item as RestockAlert).productId === "string" &&
        typeof (item as RestockAlert).email === "string",
    );
  } catch {
    return [];
  }
}

function writeAlerts(alerts: RestockAlert[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

/** Persist a restock watch (local until backend exists). */
export function subscribeRestockAlert(input: {
  productId: string;
  productName: string;
  email: string;
}): RestockAlert {
  const email = input.email.trim().toLowerCase();
  const next: RestockAlert = {
    productId: input.productId,
    productName: input.productName,
    email,
    createdAt: new Date().toISOString(),
  };

  const alerts = readAlerts().filter(
    (item) =>
      !(item.productId === next.productId && item.email === next.email),
  );
  alerts.unshift(next);
  writeAlerts(alerts);
  return next;
}

export function hasRestockAlert(productId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return readAlerts().some(
    (item) => item.productId === productId && item.email === normalized,
  );
}
