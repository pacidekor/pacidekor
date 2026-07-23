"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

type ProductCarouselProps = {
  products: Product[];
  /** Desktop grid columns. Default matches homepage. */
  desktopCols?: "home" | "related";
  autoplay?: boolean;
};

const AUTO_MS = 5000;
const GAP_PX = 12;

export function ProductCarousel({
  products,
  desktopCols = "home",
  autoplay = true,
}: ProductCarouselProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const showIndicator = products.length > 2;

  // Pixel-perfect edge = distance from viewport left → content column left
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const sync = () => {
      const edge = Math.max(0, Math.round(wrap.getBoundingClientRect().left));
      wrap.style.setProperty("--carousel-edge", `${edge}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const thumb = thumbRef.current;
    if (!scroller || !thumb || !showIndicator) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const trackWidth = thumb.parentElement?.clientWidth ?? 0;
      if (maxScroll <= 0 || trackWidth <= 0) {
        thumb.style.width = "100%";
        thumb.style.transform = "translate3d(0,0,0)";
        return;
      }

      const visibleRatio = scroller.clientWidth / scroller.scrollWidth;
      const thumbWidth = Math.max(visibleRatio, 0.22);
      const travel = 1 - thumbWidth;
      const left = (scroller.scrollLeft / maxScroll) * travel;

      thumb.style.width = `${thumbWidth * 100}%`;
      thumb.style.transform = `translate3d(${left * trackWidth}px,0,0)`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);

    const observer = new ResizeObserver(update);
    observer.observe(scroller);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [products.length, showIndicator]);

  useEffect(() => {
    if (!autoplay) return;

    const scroller = scrollerRef.current;
    if (!scroller || products.length <= 2) return;

    let paused = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const getStep = () => {
      const card = scroller.querySelector("[data-carousel-card]") as HTMLElement | null;
      if (!card) return scroller.clientWidth * 0.4;
      return card.offsetWidth + GAP_PX;
    };

    const advance = () => {
      if (paused || document.hidden) return;

      const step = getStep();
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (maxScroll <= 0) return;

      // Already showing the last product fully → next tick resets to start
      if (scroller.scrollLeft >= maxScroll - 2) {
        scroller.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      // Step forward; last step lands exactly on the end (last card fully visible)
      const next = Math.min(scroller.scrollLeft + step, maxScroll);
      scroller.scrollTo({ left: next, behavior: "smooth" });
    };

    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(advance, AUTO_MS);
    };

    const pause = () => {
      paused = true;
    };

    const resume = () => {
      paused = false;
      start();
    };

    start();

    const onVisibility = () => {
      if (document.hidden) pause();
      else resume();
    };

    scroller.addEventListener("pointerdown", pause);
    scroller.addEventListener("pointerup", resume);
    scroller.addEventListener("pointercancel", resume);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      scroller.removeEventListener("pointerdown", pause);
      scroller.removeEventListener("pointerup", resume);
      scroller.removeEventListener("pointercancel", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [products.length, autoplay]);

  const desktopGridClass =
    desktopCols === "related"
      ? "hidden grid-cols-2 gap-6 md:grid md:grid-cols-4 md:gap-7"
      : "hidden grid-cols-2 gap-6 md:grid md:grid-cols-3 md:gap-7 lg:grid-cols-5 lg:gap-8";

  return (
    <>
      <div ref={wrapRef} className="w-full md:hidden">
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            width: "100vw",
            marginLeft: "calc(0px - var(--carousel-edge, var(--page-gutter)))",
          }}
        >
          {/* Spacers align first/last card with content column (no flex gap — that would offset the first card) */}
          <div
            className="shrink-0"
            style={{ width: "var(--carousel-edge, var(--page-gutter))" }}
            aria-hidden
          />

          {products.map((product, index) => (
            <div
              key={product.id}
              data-carousel-card
              className="shrink-0"
              style={{
                width:
                  "calc((100vw - var(--carousel-edge, var(--page-gutter)) - 0.75rem) / 2.25)",
                marginRight:
                  index < products.length - 1 ? GAP_PX : undefined,
              }}
            >
              <ProductCard product={product} />
            </div>
          ))}

          <div
            className="shrink-0"
            style={{ width: "var(--carousel-edge, var(--page-gutter))" }}
            aria-hidden
          />
        </div>

        {showIndicator ? (
          <div
            className="mx-auto mt-4 h-0.5 w-28 overflow-hidden rounded-full bg-[#2f2924]/12"
            aria-hidden
          >
            <div
              ref={thumbRef}
              className="h-full w-[22%] rounded-full bg-[#75825B]/75 will-change-transform"
            />
          </div>
        ) : null}
      </div>

      <div className={desktopGridClass}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
