"use client";

import Link from "next/link";
import { Check, Cookie, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACCEPTED_COOKIE_PREFERENCES,
  COOKIE_OPEN_SETTINGS_EVENT,
  DEFAULT_COOKIE_PREFERENCES,
  type CookiePreferences,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent";
import { lockPageScroll } from "@/lib/lock-page-scroll";

type OptionalKey = keyof Omit<CookiePreferences, "necessary">;

const CATEGORIES: {
  key: OptionalKey | "necessary";
  title: string;
  body: string;
  required?: boolean;
}[] = [
  {
    key: "necessary",
    title: "Nevyhnutné",
    body: "Potrebné na fungovanie e-shopu, prihlásenie, košík a bezpečnosť. Vždy zapnuté.",
    required: true,
  },
  {
    key: "functional",
    title: "Funkčné",
    body: "Zapamätajú si preferencie zobrazenia a pohodlnejšie používanie webu.",
  },
  {
    key: "analytics",
    title: "Analytické",
    body: "Pomáhajú nám pochopiť, ako sa web používa, a zlepšovať ho.",
  },
  {
    key: "marketing",
    title: "Marketingové",
    body: "Slúžia na meranie kampaní a relevantnejšie marketingové oznamy.",
  },
];

function CookieCheckbox({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  label: string;
}) {
  return (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        className={`pointer-events-none flex size-5 items-center justify-center rounded-md border transition-colors ${
          checked
            ? "border-[#75825B] bg-[#75825B] text-white"
            : "border-black/20 bg-white text-transparent peer-hover:border-[#75825B]/50"
        } ${disabled ? "opacity-70" : ""}`}
        aria-hidden
      >
        <Check className="size-3" strokeWidth={2.5} />
      </span>
    </span>
  );
}

export function CookieConsent() {
  const titleId = useId();
  const settingsTitleId = useId();
  const [ready, setReady] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerShown, setBannerShown] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draft, setDraft] = useState<CookiePreferences>(DEFAULT_COOKIE_PREFERENCES);

  useEffect(() => {
    const existing = readCookieConsent();
    setReady(true);
    if (!existing) {
      setBannerShown(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setBannerVisible(true));
      });
    }

    function onOpenSettings() {
      const current = readCookieConsent()?.preferences ?? DEFAULT_COOKIE_PREFERENCES;
      setDraft(current);
      setSettingsOpen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSettingsVisible(true));
      });
    }

    window.addEventListener(COOKIE_OPEN_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(COOKIE_OPEN_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    return lockPageScroll();
  }, [settingsOpen]);

  function hideBanner() {
    setBannerVisible(false);
    window.setTimeout(() => setBannerShown(false), 280);
  }

  function closeSettings() {
    setSettingsVisible(false);
    window.setTimeout(() => setSettingsOpen(false), 220);
  }

  function savePreferences(preferences: CookiePreferences) {
    writeCookieConsent(preferences);
    hideBanner();
    closeSettings();
  }

  function openSettingsFromBanner() {
    setDraft(DEFAULT_COOKIE_PREFERENCES);
    setSettingsOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSettingsVisible(true));
    });
  }

  if (!ready || typeof document === "undefined") return null;

  return createPortal(
    <>
      {bannerShown ? (
        <div
          role="dialog"
          aria-labelledby={titleId}
          aria-live="polite"
          className={`fixed bottom-4 left-4 z-[70] max-w-[min(100%-2rem,48rem)] rounded-2xl border border-black/8 bg-[#faf8f5] px-4 py-3.5 shadow-[0_20px_48px_rgba(47,41,36,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-6 sm:left-6 sm:px-5 ${
            bannerVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-center gap-4">
            <Cookie
              className="size-6 shrink-0 text-[#75825B]"
              strokeWidth={1.75}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="font-heading text-base font-semibold text-[#2f2924]"
              >
                Cookies
              </h2>
              <p className="mt-0.5 max-w-[32rem] text-sm leading-snug text-[#2f2924]/70">
                Používame cookies, aby e-shop fungoval spoľahlivo. Voliteľné
                cookies môžete prijať alebo odmietnuť.{" "}
                <Link
                  href="/cookies"
                  className="font-medium text-[#75825B] transition-opacity hover:opacity-80"
                >
                  Viac info
                </Link>
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openSettingsFromBanner}
                className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#f3f1ed]"
              >
                Nastavenia
              </button>
              <button
                type="button"
                onClick={() => savePreferences(DEFAULT_COOKIE_PREFERENCES)}
                className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#f3f1ed]"
              >
                Odmietnuť
              </button>
              <button
                type="button"
                onClick={() => savePreferences(ACCEPTED_COOKIE_PREFERENCES)}
                className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Prijať
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className={`fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center sm:p-6 transition-colors duration-300 ${
            settingsVisible ? "bg-[#2f2924]/55" : "bg-[#2f2924]/0"
          }`}
          style={{ backdropFilter: settingsVisible ? "blur(6px)" : "blur(0px)" }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Zavrieť"
            onClick={closeSettings}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={settingsTitleId}
            className={`relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-[#faf8f5] shadow-[0_28px_64px_rgba(47,41,36,0.35)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              settingsVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-[0.98] opacity-0"
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/6 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e8ebe2] text-[#75825B]">
                  <Cookie className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h2
                    id={settingsTitleId}
                    className="font-heading text-lg font-semibold text-[#2f2924]"
                  >
                    Nastavenia cookies
                  </h2>
                  <p className="mt-0.5 text-xs text-[#2f2924]/55">
                    Vyberte, ktoré cookies povolíte
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                aria-label="Zavrieť"
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#2f2924]/45 transition-colors hover:bg-white hover:text-[#2f2924]"
              >
                <X className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="max-h-[min(60vh,28rem)] space-y-2.5 overflow-y-auto px-5 py-4 sm:px-6">
              {CATEGORIES.map((category) => {
                const checked =
                  category.key === "necessary"
                    ? true
                    : draft[category.key as OptionalKey];

                return (
                  <label
                    key={category.key}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                      checked
                        ? "border-[#75825B]/35 bg-[#75825B]/6"
                        : "border-black/8 bg-white hover:bg-[#faf8f5]"
                    } ${category.required ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <CookieCheckbox
                      checked={checked}
                      disabled={category.required}
                      label={category.title}
                      onChange={
                        category.required
                          ? undefined
                          : (next) =>
                              setDraft((prev) => ({
                                ...prev,
                                [category.key]: next,
                              }))
                      }
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#2f2924]">
                          {category.title}
                        </span>
                        {category.required ? (
                          <span className="rounded-full bg-[#75825B]/12 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#75825B] uppercase">
                            Povinné
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-[#2f2924]/55">
                        {category.body}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-black/6 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => savePreferences(DEFAULT_COOKIE_PREFERENCES)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#f3f1ed]"
              >
                Odmietnuť voliteľné
              </button>
              <button
                type="button"
                onClick={() => savePreferences(draft)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Uložiť výber
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
