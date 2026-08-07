"use client";

type FilterChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  swatch?: string;
};

export function FilterChip({
  label,
  active,
  onClick,
  swatch,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#75825B] text-white"
          : "bg-[#e8ebe2] text-[#2f2924] hover:bg-[#75825B]/20"
      }`}
    >
      {swatch ? (
        <span
          className={`size-3.5 rounded-full border ${
            active ? "border-white/40" : "border-black/10"
          }`}
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      ) : null}
      {label}
    </button>
  );
}
