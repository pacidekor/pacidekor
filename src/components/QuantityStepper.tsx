"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Product page uses md, cart uses sm. */
  size?: "sm" | "md";
  "aria-label"?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  "aria-label": ariaLabel = "Množstvo",
}: QuantityStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const atMin = value <= min;
  const atMax = typeof max === "number" ? value >= max : false;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function clamp(next: number) {
    let result = Math.max(min, next);
    if (typeof max === "number") result = Math.min(max, result);
    return result;
  }

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    onChange(clamp(parsed));
  }

  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#2f2924]/15 bg-white ${
        isSm ? "h-10" : "h-12"
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
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
          const next = event.target.value.replace(/\D/g, "");
          setDraft(next);
          if (next === "") return;
          const parsed = Number.parseInt(next, 10);
          if (!Number.isNaN(parsed) && parsed >= min) {
            onChange(clamp(parsed));
          }
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
        onClick={() => onChange(clamp(value + 1))}
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
