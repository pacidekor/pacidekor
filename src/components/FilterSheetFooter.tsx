"use client";

type FilterSheetFooterProps = {
  hasActiveFilters: boolean;
  onClear: () => void;
  onDone: () => void;
};

export function FilterSheetFooter({
  hasActiveFilters,
  onClear,
  onDone,
}: FilterSheetFooterProps) {
  return (
    <div className="shrink-0 border-t border-black/6 px-5 py-4 sm:px-6">
      <div
        className="grid w-full transition-[grid-template-columns,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          gridTemplateColumns: hasActiveFilters ? "1fr 1fr" : "0fr 1fr",
          gap: hasActiveFilters ? "0.625rem" : "0rem",
        }}
      >
        <div className="min-w-0 overflow-hidden">
          <button
            type="button"
            tabIndex={hasActiveFilters ? 0 : -1}
            aria-hidden={!hasActiveFilters}
            onClick={onClear}
            className={`inline-flex h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border border-black/10 px-3 text-sm font-medium text-[#2f2924] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#faf8f5] ${
              hasActiveFilters
                ? "translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-2 opacity-0"
            }`}
          >
            Zrušiť filtre
          </button>
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
