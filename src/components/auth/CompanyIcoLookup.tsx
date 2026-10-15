"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { sanitizeIco } from "@/lib/form-validation";

export type CompanyLookupSelection = {
  ico: string;
  name: string;
  dic?: string;
  street?: string;
  city?: string;
  zip?: string;
};

type Suggestion = {
  ico: string;
  name: string;
  city?: string;
  status?: string;
  dic?: string;
  icDph?: string;
};

type CompanyIcoLookupProps = {
  ico: string;
  dic: string;
  onIcoChange: (ico: string) => void;
  onSelect: (selection: CompanyLookupSelection) => void;
  onVerifiedChange?: (verified: boolean) => void;
  fieldClass: string;
  labelClass: string;
  tabIndex?: number;
};

const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 4;

export function CompanyIcoLookup({
  ico,
  dic,
  onIcoChange,
  onSelect,
  onVerifiedChange,
  fieldClass,
  labelClass,
  tabIndex = 0,
}: CompanyIcoLookupProps) {
  const listId = useId();
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedIco, setVerifiedIco] = useState<string | null>(null);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    onVerifiedChange?.(verifiedIco != null && verifiedIco === ico);
  }, [verifiedIco, ico, onVerifiedChange]);

  function updateMenuPosition() {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuBox({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, suggestions.length, lookupError]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (inputWrapRef.current?.contains(target)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [listId]);

  useEffect(() => {
    const query = sanitizeIco(ico);
    if (query.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setLookupError(null);
      setLoading(false);
      setOpen(false);
      return;
    }

    if (verifiedIco === query && query.length === 8) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLookupError(null);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/company-lookup?q=${encodeURIComponent(query)}`,
        );
        const payload = (await response.json()) as {
          ok: boolean;
          results?: Suggestion[];
          error?: string | null;
        };
        if (requestId !== requestIdRef.current) return;

        if (!payload.ok) {
          setSuggestions([]);
          setLookupError(
            payload.error || "Vyhľadávanie firiem je dočasne nedostupné.",
          );
          setOpen(true);
          return;
        }

        const results = payload.results ?? [];
        setSuggestions(results);
        setOpen(results.length > 0 || query.length >= 6);
        if (results.length === 0 && query.length >= 6) {
          setLookupError("Nenašli sa firmy pre zadané IČO.");
        } else {
          setLookupError(null);
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setLookupError("Vyhľadávanie firiem je dočasne nedostupné.");
        setOpen(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [ico, verifiedIco]);

  async function applySuggestion(item: Suggestion) {
    setOpen(false);
    setLoading(true);
    setLookupError(null);

    try {
      const response = await fetch(
        `/api/company-lookup?ico=${encodeURIComponent(item.ico)}`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        company?: CompanyLookupSelection & { icDph?: string };
        error?: string;
      };

      if (!payload.ok || !payload.company) {
        onSelect({
          ico: item.ico,
          name: item.name,
          dic: item.dic || item.icDph || dic,
        });
        setVerifiedIco(item.ico);
        setLookupError(payload.error || null);
        return;
      }

      const detail = payload.company;
      onSelect({
        ico: detail.ico,
        name: detail.name || item.name,
        dic: detail.dic || detail.icDph || item.dic || item.icDph || dic,
        street: detail.street,
        city: detail.city,
        zip: detail.zip,
      });
      setVerifiedIco(detail.ico);
    } catch {
      onSelect({
        ico: item.ico,
        name: item.name,
        dic: item.dic || item.icDph || dic,
      });
      setVerifiedIco(item.ico);
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
  }

  const showMenu =
    open &&
    menuBox &&
    typeof document !== "undefined" &&
    (suggestions.length > 0 || Boolean(lookupError));

  return (
    <div className="relative" ref={inputWrapRef}>
      <label htmlFor="vo-ico" className={labelClass}>
        IČO
      </label>
      <div className="relative">
        <input
          id="vo-ico"
          type="text"
          inputMode="numeric"
          maxLength={8}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          value={ico}
          onChange={(event) => {
            const next = sanitizeIco(event.target.value);
            onIcoChange(next);
            if (verifiedIco && verifiedIco !== next) {
              setVerifiedIco(null);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0 || lookupError) setOpen(true);
          }}
          className={fieldClass}
          placeholder="12345678"
          tabIndex={tabIndex}
        />
        {loading ? (
          <Loader2
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[#75825B]"
            aria-hidden
          />
        ) : null}
      </div>
      {verifiedIco && verifiedIco === ico ? (
        <p className="mt-1.5 text-xs text-[#75825B]">Overené v registri</p>
      ) : null}

      {showMenu
        ? createPortal(
            <div
              id={listId}
              role="listbox"
              className="fixed z-[90] max-h-64 overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-[0_12px_32px_rgba(47,41,36,0.18)]"
              style={{
                top: menuBox.top,
                left: menuBox.left,
                width: menuBox.width,
              }}
            >
              {lookupError && suggestions.length === 0 ? (
                <p className="px-3.5 py-2.5 text-sm text-[#2f2924]/55">
                  {lookupError}
                </p>
              ) : (
                suggestions.map((item) => (
                  <button
                    key={item.ico}
                    type="button"
                    role="option"
                    className="flex w-full cursor-pointer flex-col gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[#75825B]/10"
                    onClick={() => void applySuggestion(item)}
                  >
                    <span className="text-sm font-semibold text-[#2f2924]">
                      {item.name}
                    </span>
                    <span className="text-xs text-[#2f2924]/55">
                      IČO {item.ico}
                      {item.city ? ` · ${item.city}` : ""}
                      {item.status ? ` · ${item.status}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
