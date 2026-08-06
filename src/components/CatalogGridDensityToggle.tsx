"use client";

type CatalogGridDensity = "comfortable" | "compact";

type CatalogGridDensityToggleProps = {
  value: CatalogGridDensity;
  onChange: (value: CatalogGridDensity) => void;
};

export function catalogGridClass(density: CatalogGridDensity) {
  return density === "compact"
    ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
    : "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4";
}

/** Desktop-only toggle between 4 and 5 products per row. */
export function CatalogGridDensityToggle({
  value,
  onChange,
}: CatalogGridDensityToggleProps) {
  const compact = value === "compact";

  return (
    <button
      type="button"
      onClick={() => onChange(compact ? "comfortable" : "compact")}
      aria-pressed={compact}
      aria-label={
        compact
          ? "Zobraziť 4 produkty v riadku"
          : "Zobraziť 5 produktov v riadku"
      }
      title={
        compact
          ? "4 produkty v riadku"
          : "5 produktov v riadku"
      }
      className={`hidden size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors lg:inline-flex ${
        compact
          ? "border-[#75825B] bg-[#75825B] text-white"
          : "border-[#2f2924]/12 bg-white text-[#2f2924] hover:border-[#75825B]/40 hover:text-[#75825B]"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1" />
        <path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1" />
        <path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1" />
        <path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1" />
      </svg>
    </button>
  );
}
