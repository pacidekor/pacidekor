"use client";

import type { ReactNode } from "react";
import { getSetSize, SET_PACKAGING_ID, type SalesPackaging } from "@/lib/sales-unit";

export function ProductSalesSettings({ packaging, onChange, hint }: {
  packaging: SalesPackaging[];
  onChange: (next: SalesPackaging[]) => void;
  hint: ReactNode;
}) {
  const size = getSetSize(packaging);
  const isSet = size !== null;
  return (
    <fieldset>
      <legend className="flex items-center gap-1.5 text-sm font-medium text-[#2f2924]">
        Predáva sa ako
        {hint}
      </legend>
      <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Predajná jednotka">
        {[false, true].map((set) => (
          <button key={String(set)} type="button" aria-pressed={isSet === set}
            onClick={() => {
              if (set === isSet) return;
              // Switching units requires consciously re-entering delivery multiples.
              // Never reinterpret an old box of 3 pieces as a box of 3 sets.
              onChange(set ? [{ id: SET_PACKAGING_ID, pieces: 3 }] : []);
            }}
            className={`h-9 cursor-pointer whitespace-nowrap rounded-xl border border-black/10 px-2.5 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#75825B] ${isSet === set ? "bg-[#e8ebe2]/60 font-medium" : "bg-white"}`}>
            {set ? "Sada" : "Kus"}
          </button>
        ))}
      </div>
      {isSet ? <label className="mt-2 flex min-h-11 items-center justify-between gap-2.5 rounded-xl border border-black/10 bg-[#e8ebe2]/60 px-2.5 py-2 text-sm text-[#2f2924]">
        Kusov v sade
        <span className="flex items-center gap-1.5"><input aria-label="Počet kusov v jednej sade" type="number" min={1} step={1} value={size}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            if (Number.isSafeInteger(next) && next >= 1 && next <= 100000) {
              onChange(packaging.map((item) => item.id === SET_PACKAGING_ID ? { ...item, pieces: next } : item));
            }
          }}
          className="h-9 w-28 cursor-text rounded-lg border border-black/10 bg-white px-2.5 outline-none focus:border-[#75825B]/50" /><span className="text-xs text-[#2f2924]/45">ks</span></span>
      </label> : null}
    </fieldset>
  );
}
