"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { colorSwatchStyle, type ProductColor } from "@/lib/products";

const GAP_PX = 8;

type ProductColorPillsProps = {
  colors: ProductColor[];
  selectedColorId: string;
  onSelect: (colorId: string) => void;
};

function ColorPillButton({
  color,
  selected,
  onSelect,
  measureRef,
}: {
  color: ProductColor;
  selected: boolean;
  onSelect: (colorId: string) => void;
  measureRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={measureRef}
      type="button"
      onClick={() => onSelect(color.id)}
      aria-pressed={selected}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-[#75825B] bg-[#75825B] text-white"
          : "border-[#2f2924]/15 bg-white text-[#2f2924] hover:border-[#75825B]/50"
      }`}
    >
      <span
        className="size-3.5 rounded-full border border-black/10"
        style={colorSwatchStyle(color)}
        aria-hidden
      />
      {color.label}
    </button>
  );
}

export function ProductColorPills({
  colors,
  selectedColorId,
  onSelect,
}: ProductColorPillsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const expandMeasureRef = useRef<HTMLButtonElement>(null);
  const pillElsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(colors.length);

  useLayoutEffect(() => {
    pillElsRef.current = pillElsRef.current.slice(0, colors.length);
    setExpanded(false);
  }, [colors]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalc = () => {
      const available = container.clientWidth;
      if (available <= 0) return;

      const widths = pillElsRef.current.map((el) => el?.offsetWidth ?? 0);
      if (widths.some((w) => w <= 0)) return;

      const expandWidth = expandMeasureRef.current?.offsetWidth ?? 96;
      const totalWithGaps =
        widths.reduce((sum, w) => sum + w, 0) +
        GAP_PX * Math.max(0, widths.length - 1);

      if (totalWithGaps <= available) {
        setVisibleCount(colors.length);
        return;
      }

      let used = 0;
      let count = 0;

      for (let i = 0; i < widths.length; i++) {
        const width = widths[i];
        const gap = count > 0 ? GAP_PX : 0;
        const remainingAfter = widths.length - (i + 1);
        const expandCost =
          remainingAfter > 0 ? GAP_PX + expandWidth : 0;

        if (used + gap + width + expandCost <= available) {
          used += gap + width;
          count += 1;
        } else {
          break;
        }
      }

      setVisibleCount(Math.max(1, count));
    };

    recalc();

    const observer = new ResizeObserver(recalc);
    observer.observe(container);
    return () => observer.disconnect();
  }, [colors]);

  const collapsed = !expanded && visibleCount < colors.length;
  const shownColors = collapsed ? colors.slice(0, visibleCount) : colors;
  const hiddenCount = colors.length - visibleCount;

  const measureRowStyle: CSSProperties = {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    display: "flex",
    gap: GAP_PX,
    whiteSpace: "nowrap",
    left: 0,
    top: 0,
  };

  return (
    <div>
      <p className="font-sans text-sm font-semibold text-[#2f2924]">Farba</p>

      <div ref={containerRef} className="relative mt-3">
        <div aria-hidden style={measureRowStyle}>
          {colors.map((color, index) => (
            <ColorPillButton
              key={`measure-${color.id}`}
              color={color}
              selected={false}
              onSelect={() => undefined}
              measureRef={(el) => {
                pillElsRef.current[index] = el;
              }}
            />
          ))}
          <button
            ref={expandMeasureRef}
            type="button"
            tabIndex={-1}
            className="inline-flex shrink-0 items-center rounded-full border border-[#2f2924]/15 px-4 py-2 text-sm font-medium"
          >
            + {colors.length} ďalšie
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {shownColors.map((color) => (
            <ColorPillButton
              key={color.id}
              color={color}
              selected={selectedColorId === color.id}
              onSelect={onSelect}
            />
          ))}

          {collapsed ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex shrink-0 cursor-pointer items-center rounded-full border border-[#2f2924]/15 bg-white px-4 py-2 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/50"
              aria-expanded={false}
              aria-label={`Zobraziť ďalších ${hiddenCount} farieb`}
            >
              + {hiddenCount} ďalšie
            </button>
          ) : null}

          {expanded && visibleCount < colors.length ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex shrink-0 cursor-pointer items-center rounded-full border border-[#2f2924]/15 bg-white px-4 py-2 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/50"
              aria-expanded={true}
            >
              Menej
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
