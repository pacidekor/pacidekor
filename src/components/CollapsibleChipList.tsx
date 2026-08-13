"use client";

import {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const CHIP_H = 36;
const GAP = 8;
/** Keep toggle within this many rows (1-based). */
const COLLAPSED_ROWS = 3;
/** Max offsetTop for toggle relative to first chip (= last allowed row). */
const MAX_TOGGLE_TOP_PX = (COLLAPSED_ROWS - 1) * (CHIP_H + GAP);

type CollapsibleChipListProps = {
  children: ReactNode;
};

const toggleClassName =
  "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-[#e8ebe2] px-3.5 text-sm font-medium tabular-nums text-[#2f2924] transition-colors hover:bg-[#75825B]/20";

/**
 * Collapses flex-wrap chips to a few rows. Toggle sits on the last collapsed
 * row (+N), or right after the last chip when expanded (Zobraziť menej).
 */
export function CollapsibleChipList({ children }: CollapsibleChipListProps) {
  const chips = Children.toArray(children);
  const listRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [expanded, setExpanded] = useState(false);
  /** null = measuring */
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const toggle = toggleRef.current;
    if (!list || !toggle || chips.length === 0) return;

    if (expanded) {
      setVisibleCount(chips.length);
      return;
    }

    const chipEls = Array.from(
      list.querySelectorAll<HTMLElement>("[data-chip]"),
    );
    if (chipEls.length === 0) {
      setVisibleCount(0);
      return;
    }

    for (const chip of chipEls) {
      chip.hidden = false;
    }

    const previousLabel = toggle.textContent;
    toggle.textContent = `+${chips.length}`;

    const maxToggleTop = chipEls[0].offsetTop + MAX_TOGGLE_TOP_PX;

    let lo = 0;
    let hi = chipEls.length;

    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      for (let i = 0; i < chipEls.length; i++) {
        chipEls[i].hidden = i >= mid;
      }
      void list.offsetHeight;
      if (toggle.offsetTop <= maxToggleTop + 2) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    for (const chip of chipEls) {
      chip.hidden = false;
    }
    toggle.textContent = previousLabel;

    setVisibleCount(lo);
  }, [chips.length, expanded]);

  const measuring = visibleCount === null;
  const count = visibleCount ?? chips.length;
  const hiddenCount = Math.max(0, chips.length - count);
  const canCollapse = !measuring && count < chips.length;

  function toggleExpanded() {
    if (expanded) {
      // Remeasure on collapse – keep toggle mounted via measuring=true
      setVisibleCount(null);
      setExpanded(false);
      return;
    }
    setExpanded(true);
  }

  return (
    <div ref={listRef} className="flex flex-wrap gap-2">
      {chips.map((chip, index) => {
        const show = expanded || measuring || index < count;
        return (
          <div
            key={index}
            data-chip
            className={show ? "inline-flex" : "hidden"}
          >
            {chip}
          </div>
        );
      })}
      {measuring || canCollapse || expanded ? (
        <button
          ref={toggleRef}
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-hidden={measuring}
          tabIndex={measuring ? -1 : undefined}
          aria-label={
            expanded ? "Zobraziť menej" : `Zobraziť ďalších ${hiddenCount}`
          }
          className={
            measuring
              ? `${toggleClassName} pointer-events-none opacity-0`
              : toggleClassName
          }
        >
          {measuring
            ? `+${chips.length}`
            : expanded
              ? "Zobraziť menej"
              : `+${hiddenCount}`}
        </button>
      ) : null}
    </div>
  );
}
