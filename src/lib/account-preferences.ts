export type AccountPreferences = {
  newsletter: boolean;
  promoEmails: boolean;
  newProducts: boolean;
};

export const ACCOUNT_PREFS_KEY = "pacidekor.account-preferences";
export const ACCOUNT_PREFS_EVENT = "pacidekor:account-preferences-changed";

const DEFAULT_PREFS: AccountPreferences = {
  newsletter: true,
  promoEmails: false,
  newProducts: true,
};

type PrefsMap = Record<string, AccountPreferences>;

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACCOUNT_PREFS_EVENT));
}

function readMap(): PrefsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACCOUNT_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PrefsMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getAccountPreferences(customerId: string): AccountPreferences {
  const map = readMap();
  return { ...DEFAULT_PREFS, ...map[customerId] };
}

export function setAccountPreferences(
  customerId: string,
  prefs: AccountPreferences,
): AccountPreferences {
  if (typeof window === "undefined") return prefs;
  const map = readMap();
  map[customerId] = prefs;
  window.localStorage.setItem(ACCOUNT_PREFS_KEY, JSON.stringify(map));
  notify();
  return prefs;
}
