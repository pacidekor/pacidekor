"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Default 1. Pre balenie (napr. 12) mení +/− po balíkoch. */
  step?: number;
  /** Product page uses md, cart uses sm. */
  size?: "sm" | "md";
  "aria-label"?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  size = "md",
  "aria-label": ariaLabel = "Množstvo",
}: QuantityStepperProps) {
  const increment = Math.max(1, Math.floor(step) || 1);
  const effectiveMin = Math.max(min, increment);
  const [draft, setDraft] = useState(String(value));
  const atMin = value <= effectiveMin;
  const atMax = typeof max === "number" ? value >= max : false;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function snap(next: number) {
    let result = Math.max(effectiveMin, Math.floor(next));
    if (increment > 1) {
      // Najbližší násobok (15 → 12, 20 → 24).
      result = Math.round(result / increment) * increment;
      if (result < effectiveMin) result = effectiveMin;
    }
    if (typeof max === "number") {
      const alignedMax = Math.floor(max / increment) * increment;
      if (alignedMax < effectiveMin) return effectiveMin;
      result = Math.min(result, alignedMax);
    }
    return result;
  }

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = snap(parsed);
    setDraft(String(next));
    if (next !== value) {
      // Synchronne, aby klik na „Do košíka“ hneď videl správne množstvo.
      flushSync(() => {
        onChange(next);
      });
    }
  }

  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-full border border-[#2f2924]/15 bg-white ${
        isSm ? "h-10" : "h-12"
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(snap(value - increment))}
        disabled={atMin}
        aria-label="Znížiť množstvo"
        className={`flex cursor-pointer items-center justify-center text-[#2f2924] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30 ${
          isSm ? "size-10" : "size-12"
        }`}
      >
        <Minus
          className={isSm ? "size-3.5" : "size-4"}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => {
          // Pri písaní len draft — snap až na blur / Enter (žiadne 14 v UI vs 12 v košíku).
          setDraft(event.target.value.replace(/\D/g, ""));
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={`min-w-8 appearance-none border-0 bg-transparent text-center font-sans font-semibold text-[#2f2924] outline-none ${
          isSm ? "w-8 text-sm" : "w-10 text-base"
        }`}
      />

      <button
        type="button"
        onClick={() => onChange(snap(value + increment))}
        disabled={atMax}
        aria-label="Zvýšiť množstvo"
        className={`flex cursor-pointer items-center justify-center text-[#2f2924] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30 ${
          isSm ? "size-10" : "size-12"
        }`}
      >
        <Plus
          className={isSm ? "size-3.5" : "size-4"}
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
  );
}
