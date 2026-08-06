export type CookiePreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentState = {
  version: 1;
  decidedAt: string;
  preferences: CookiePreferences;
};

export const COOKIE_CONSENT_STORAGE_KEY = "pacidekor-cookie-consent";
export const COOKIE_CONSENT_CHANGE_EVENT = "pacidekor:cookie-consent-change";
export const COOKIE_OPEN_SETTINGS_EVENT = "pacidekor:open-cookie-settings";

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const ACCEPTED_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed?.version !== 1 || !parsed.preferences) return null;
    return {
      version: 1,
      decidedAt: parsed.decidedAt,
      preferences: {
        necessary: true,
        functional: Boolean(parsed.preferences.functional),
        analytics: Boolean(parsed.preferences.analytics),
        marketing: Boolean(parsed.preferences.marketing),
      },
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(preferences: CookiePreferences) {
  const next: CookieConsentState = {
    version: 1,
    decidedAt: new Date().toISOString(),
    preferences: {
      necessary: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    },
  };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, { detail: next }),
  );
  return next;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_OPEN_SETTINGS_EVENT));
}
