"use client";

import { useEffect, useState } from "react";
import { validatePromoCodeAction } from "@/lib/actions/promo";
import { formatPrice } from "@/lib/cart";
import {
  clearAppliedPromo,
  readAppliedPromo,
  writeAppliedPromo,
  PROMO_EVENT,
  type AppliedPromo,
} from "@/lib/promo";

type PromoCodeFieldProps = {
  subtotal: number;
  onPromoChange?: (promo: AppliedPromo | null) => void;
};

/** Low-key applied discount row for cart / checkout summary. */
export function AppliedPromoLine({
  promo,
  discountAmount,
}: {
  promo: AppliedPromo;
  discountAmount: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[#2f2924]/60">
          Zľava {promo.discountPercent}&nbsp;%
        </span>
        <span className="shrink-0 font-medium text-[#c45c4a]">
          −{formatPrice(discountAmount)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#2f2924]/45">
        <span className="tracking-wide uppercase">{promo.code}</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={() => clearAppliedPromo()}
          className="cursor-pointer transition-colors hover:text-[#2f2924]/75"
        >
          Odstrániť
        </button>
      </div>
    </div>
  );
}

export function PromoCodeField({ subtotal, onPromoChange }: PromoCodeFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function sync() {
      const next = readAppliedPromo();
      setApplied(next);
      if (next) {
        setOpen(false);
        setDraft("");
      }
      onPromoChange?.(next);
    }
    sync();
    window.addEventListener(PROMO_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROMO_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [onPromoChange]);

  async function applyCode() {
    setError(null);
    setPending(true);
    const result = await validatePromoCodeAction(draft, subtotal);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    writeAppliedPromo(result.data);
    setApplied(result.data);
    setDraft("");
    setOpen(false);
  }

  // Applied state is rendered via AppliedPromoLine in the summary.
  if (applied) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-left text-sm font-medium text-[#75825B] underline decoration-[#75825B]/35 underline-offset-2 transition-colors hover:text-[#5f6a49]"
      >
        Mám zľavový kód
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="promo-code" className="block text-sm font-medium text-[#2f2924]">
        Zľavový kód
      </label>
      <div className="flex gap-2">
        <input
          id="promo-code"
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void applyCode();
            }
          }}
          placeholder="Zadajte kód"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm uppercase tracking-wide text-[#2f2924] outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/15"
        />
        <button
          type="button"
          disabled={pending || draft.trim().length < 3}
          onClick={() => void applyCode()}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "…" : "Použiť"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[#9a4d3f]">{error}</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDraft("");
            setError(null);
          }}
          className="cursor-pointer text-xs text-[#2f2924]/45 transition-colors hover:text-[#2f2924]"
        >
          Zrušiť
        </button>
      )}
    </div>
  );
}
