"use client";

import {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const DEFAULT_CHIP_H = 36;
const DEFAULT_GAP = 8;
const DEFAULT_COLLAPSED_ROWS = 3;

type CollapsibleChipListProps = {
  children: ReactNode;
  /** How many rows to keep when collapsed (default 3). */
  collapsedRows?: number;
  /** Chip height used for row math (default 36 = h-9). */
  chipHeight?: number;
  gap?: number;
  className?: string;
  toggleClassName?: string;
};

const defaultToggleClassName =
  "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-[#e8ebe2] px-3.5 text-sm font-medium tabular-nums text-[#2f2924] transition-colors hover:bg-[#75825B]/20";

/**
 * Collapses flex-wrap chips to a few rows. Toggle sits on the last collapsed
 * row (+N), or right after the last chip when expanded (Zobraziť menej).
 */
export function CollapsibleChipList({
  children,
  collapsedRows = DEFAULT_COLLAPSED_ROWS,
  chipHeight = DEFAULT_CHIP_H,
  gap = DEFAULT_GAP,
  className = "flex flex-wrap gap-2",
  toggleClassName = defaultToggleClassName,
}: CollapsibleChipListProps) {
  const chips = Children.toArray(children);
  const listRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [expanded, setExpanded] = useState(false);
  /** null = measuring */
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [measureTick, setMeasureTick] = useState(0);

  const maxToggleTopPx = (collapsedRows - 1) * (chipHeight + gap);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let lastWidth = list.clientWidth;

    const observer = new ResizeObserver((entries) => {
      if (expanded) return;
      const width = entries[0]?.contentRect.width ?? list.clientWidth;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      setVisibleCount(null);
      setMeasureTick((tick) => tick + 1);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [expanded]);

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

    const maxToggleTop = chipEls[0].offsetTop + maxToggleTopPx;

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
  }, [chips.length, expanded, maxToggleTopPx, measureTick]);

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
    <div ref={listRef} className={className}>
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
