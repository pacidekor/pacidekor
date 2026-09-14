"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

type BannerSlide = {
  desktopSrc: string;
  mobileSrc: string;
  href: string;
  alt: string;
  ctaLabel: string;
};

const slides: BannerSlide[] = [
  {
    desktopSrc: "/bannervsetko.webp",
    mobileSrc: "/vsetkobannermobile.webp",
    href: "/registracia/velkoobchod",
    alt: "PACIDEKOR - umelé kvety, krása ktorá vydrží",
    ctaLabel: "Registrácia",
  },
  {
    desktopSrc: "/banner2.webp",
    mobileSrc: "/2bannermobile.webp",
    href: "/produkty",
    alt: "PACIDEKOR - expedícia do 24 hodín",
    ctaLabel: "Všetky produkty",
  },
];

const AUTO_MS = 5000;
const SWIPE_THRESHOLD_RATIO = 0.18;
const TRANSITION = "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)";

type DragState = {
  startX: number;
  deltaX: number;
  pointerId: number;
};

export function HeroBanner() {
  const router = useRouter();
  const count = slides.length;
  const loop = count > 1;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const trackIndexRef = useRef(loop ? 1 : 0);
  const didDragRef = useRef(false);
  const animatingRef = useRef(false);
  const hoverPausedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const trackSlides = loop
    ? [slides[count - 1], ...slides, slides[0]]
    : slides;
  const lastTrack = trackSlides.length - 1;
  const activeSlide = slides[activeIndex];

  const toRealIndex = useCallback(
    (trackIndex: number) => {
      if (!loop) return trackIndex;
      if (trackIndex <= 0) return count - 1;
      if (trackIndex >= lastTrack) return 0;
      return trackIndex - 1;
    },
    [count, lastTrack, loop],
  );

  const applyTransform = useCallback(
    (trackIndex: number, offsetPx: number, animate: boolean) => {
      const track = trackRef.current;
      if (!track) return;

      // Percentage is relative to the track. With track width = n * viewport,
      // each step of (100 / n)% moves exactly one viewport — avoids subpixel
      // gaps from clientWidth rounding that let the next slide peek through.
      const stepPercent = 100 / trackSlides.length;

      if (animate) {
        track.style.transition = "none";
        void track.offsetHeight;
      }

      track.style.transition = animate ? TRANSITION : "none";
      track.style.transform = `translate3d(calc(${-trackIndex * stepPercent}% + ${offsetPx}px), 0, 0)`;
      animatingRef.current = animate;
    },
    [trackSlides.length],
  );

  const normalizeClone = useCallback(() => {
    if (!loop) return;
    const trackIndex = trackIndexRef.current;

    if (trackIndex === 0) {
      trackIndexRef.current = count;
      applyTransform(count, 0, false);
      return;
    }

    if (trackIndex === lastTrack) {
      trackIndexRef.current = 1;
      applyTransform(1, 0, false);
    }
  }, [applyTransform, count, lastTrack, loop]);

  const measure = useCallback(() => {
    const width = viewportRef.current?.getBoundingClientRect().width ?? 0;
    widthRef.current = width;
    applyTransform(trackIndexRef.current, 0, false);
  }, [applyTransform]);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !loop) return;

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== track || event.propertyName !== "transform") return;
      animatingRef.current = false;
      if (dragRef.current) return;
      normalizeClone();
    };

    track.addEventListener("transitionend", onTransitionEnd);
    return () => track.removeEventListener("transitionend", onTransitionEnd);
  }, [loop, normalizeClone]);

  const goToTrack = useCallback(
    (nextTrack: number) => {
      const clamped = Math.min(lastTrack, Math.max(0, nextTrack));
      trackIndexRef.current = clamped;
      setActiveIndex(toRealIndex(clamped));
      applyTransform(clamped, 0, true);
    },
    [applyTransform, lastTrack, toRealIndex],
  );

  const goNext = useCallback(() => {
    if (animatingRef.current) normalizeClone();
    goToTrack(trackIndexRef.current + 1);
  }, [goToTrack, normalizeClone]);

  const goToReal = useCallback(
    (realIndex: number) => {
      if (animatingRef.current) normalizeClone();
      const nextTrack = loop ? realIndex + 1 : realIndex;
      goToTrack(nextTrack);
    },
    [goToTrack, loop, normalizeClone],
  );

  useEffect(() => {
    if (!loop) return;

    const id = window.setInterval(() => {
      if (hoverPausedRef.current || dragRef.current) return;
      goNext();
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [goNext, loop]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !loop) return;

    event.preventDefault();
    didDragRef.current = false;
    setIsDragging(false);

    if (animatingRef.current) {
      const track = trackRef.current;
      if (track) track.style.transition = "none";
      animatingRef.current = false;
    }
    normalizeClone();

    dragRef.current = {
      startX: event.clientX,
      deltaX: 0,
      pointerId: event.pointerId,
    };
    applyTransform(trackIndexRef.current, 0, false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 8) {
      didDragRef.current = true;
      setIsDragging(true);
    }

    drag.deltaX = deltaX;
    applyTransform(trackIndexRef.current, deltaX, false);
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);

    const width = widthRef.current || 1;
    const threshold = width * SWIPE_THRESHOLD_RATIO;
    let nextTrack = trackIndexRef.current;

    if (drag.deltaX <= -threshold) nextTrack += 1;
    else if (drag.deltaX >= threshold) nextTrack -= 1;

    goToTrack(nextTrack);
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    goToTrack(trackIndexRef.current);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Banner"
      className={`group relative isolate aspect-[2/1] w-full overflow-hidden rounded-3xl select-none touch-none [-webkit-user-drag:none] md:aspect-auto ${
        loop ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={onPointerCancel}
      onMouseEnter={() => {
        hoverPausedRef.current = true;
      }}
      onMouseLeave={() => {
        hoverPausedRef.current = false;
        setIsDragging(false);
      }}
      onDragStart={(event) => event.preventDefault()}
      onClick={() => {
        if (didDragRef.current) return;
        const href = slides[activeIndex]?.href;
        if (href) router.push(href);
      }}
    >
      <Image
        src="/banner1.webp"
        alt=""
        width={1920}
        height={640}
        priority
        quality={90}
        sizes="80vw"
        aria-hidden
        draggable={false}
        className="pointer-events-none invisible hidden h-auto w-full md:block"
      />

      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-hidden rounded-[inherit] [clip-path:inset(0_round_1.5rem)]"
      >
        <div
          ref={trackRef}
          className="flex h-full will-change-transform select-none [-webkit-user-drag:none]"
          draggable={false}
          style={{ width: `${trackSlides.length * 100}%` }}
        >
          {trackSlides.map((slide, index) => {
            const realIndex = toRealIndex(index);
            return (
              <div
                key={`${slide.desktopSrc}-${index}`}
                className="relative h-full shrink-0 select-none [-webkit-user-drag:none]"
                style={{ width: `${100 / trackSlides.length}%` }}
                aria-hidden={realIndex !== activeIndex}
                draggable={false}
              >
                <Image
                  src={slide.mobileSrc}
                  alt={realIndex === activeIndex ? slide.alt : ""}
                  fill
                  priority={realIndex === 0}
                  quality={90}
                  sizes="94vw"
                  draggable={false}
                  className="object-cover md:hidden"
                />
                <Image
                  src={slide.desktopSrc}
                  alt={realIndex === activeIndex ? slide.alt : ""}
                  fill
                  priority={realIndex === 0}
                  quality={90}
                  sizes="80vw"
                  draggable={false}
                  className="hidden object-cover md:block"
                />
              </div>
            );
          })}
        </div>
      </div>

      {activeSlide ? (
        <div
          className={`absolute right-6 bottom-6 z-20 hidden md:block ${
            isDragging
              ? "pointer-events-none opacity-0"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
          } transition-opacity duration-200 ease-out`}
        >
          <Link
            href={activeSlide.href}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#75825B] px-6 text-base font-semibold tracking-[0.08em] text-white uppercase shadow-[0_8px_24px_rgba(47,41,36,0.28)] transition-opacity hover:opacity-90"
          >
            {activeSlide.ctaLabel}
            <ChevronRight
              className="size-6 shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        </div>
      ) : null}

      {loop ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2.5 sm:bottom-5">
          {slides.map((slide, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={slide.desktopSrc}
                type="button"
                aria-label={`Banner ${index + 1}`}
                aria-current={active ? "true" : undefined}
                className={`pointer-events-auto cursor-pointer rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-[width,height,background-color] ${
                  active
                    ? "h-2.5 w-2.5 bg-white"
                    : "h-2 w-2 bg-white/55 hover:bg-white/80"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  goToReal(index);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
