"use client";

import { CollapsibleChipList } from "@/components/CollapsibleChipList";
import { colorSwatchStyle, parseCustomColorId } from "@/lib/products";
import type { TaxonomyValue } from "@/lib/taxonomy";

type ColorFilterChipsProps = {
  colors: TaxonomyValue[];
  selected: string[];
  onToggle: (id: string) => void;
};

export function ColorFilterChips({
  colors,
  selected,
  onToggle,
}: ColorFilterChipsProps) {
  return (
    <CollapsibleChipList>
      {colors.map((color) => {
        const active = selected.includes(color.id);
        const custom = parseCustomColorId(color.id);
        const swatchStyle = custom
          ? colorSwatchStyle(custom)
          : color.hex
            ? { backgroundColor: color.hex }
            : undefined;

        return (
          <button
            key={color.id}
            type="button"
            onClick={() => onToggle(color.id)}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors ${
              active
                ? "border-[#75825B] bg-[#75825B] text-white"
                : "border-black/10 bg-[#faf8f5] text-[#2f2924] hover:border-[#75825B]/40"
            }`}
          >
            {swatchStyle ? (
              <span
                className={`size-3.5 shrink-0 rounded-full border ${
                  active ? "border-white/40" : "border-black/10"
                }`}
                style={swatchStyle}
                aria-hidden
              />
            ) : null}
            {color.label}
          </button>
        );
      })}
    </CollapsibleChipList>
  );
}
