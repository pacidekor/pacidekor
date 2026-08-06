"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

export function OpenCookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => openCookieSettings()}
      className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      Upraviť nastavenia cookies
    </button>
  );
}
