"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ProductImageGalleryProps = {
  images: string[];
  alt: string;
  discount?: number;
};

const SWIPE_THRESHOLD_RATIO = 0.18;
const TRANSITION = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
const AUTO_MS = 5000;

type DragState = {
  startX: number;
  deltaX: number;
  pointerId: number;
};

type NavCommand = {
  index: number;
  dir: -1 | 0 | 1;
  seq: number;
};

export function ProductImageGallery({
  images,
  alt,
  discount,
}: ProductImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [nav, setNav] = useState<NavCommand>({ index: 0, dir: 0, seq: 0 });
  const galleryRef = useRef<HTMLDivElement>(null);

  const showNav = images.length > 1;
  const activeIndex = nav.index;

  const goTo = useCallback(
    (index: number) => {
      const count = images.length;
      if (count === 0) return;
      const next = ((index % count) + count) % count;
      setNav((prev) => ({ index: next, dir: 0, seq: prev.seq + 1 }));
    },
    [images.length],
  );

  const goPrev = useCallback(() => {
    const count = images.length;
    if (count === 0) return;
    setNav((prev) => ({
      index: (prev.index - 1 + count) % count,
      dir: -1,
      seq: prev.seq + 1,
    }));
  }, [images.length]);

  const goNext = useCallback(() => {
    const count = images.length;
    if (count === 0) return;
    setNav((prev) => ({
      index: (prev.index + 1) % count,
      dir: 1,
      seq: prev.seq + 1,
    }));
  }, [images.length]);

  const onCarouselIndexChange = useCallback((index: number) => {
    setNav((prev) =>
      prev.index === index ? prev : { index, dir: 0, seq: prev.seq + 1 },
    );
  }, []);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") setLightboxOpen(false);
    if (!showNav) return;
    if (event.key === "ArrowLeft") goPrev();
    if (event.key === "ArrowRight") goNext();
  });

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen]);

  // Mobile-only autoplay (arrows stay on desktop; swipe still works on phone)
  useEffect(() => {
    if (!showNav || lightboxOpen) return;

    const gallery = galleryRef.current;
    const mq = window.matchMedia("(max-width: 767px)");
    let paused = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      clear();
      if (!mq.matches) return;
      timer = setInterval(() => {
        if (paused || document.hidden) return;
        goNext();
      }, AUTO_MS);
    };

    const pause = () => {
      paused = true;
      clear();
    };

    const resume = () => {
      paused = false;
      start();
    };

    const onVisibility = () => {
      if (document.hidden) pause();
      else resume();
    };

    start();
    mq.addEventListener("change", start);
    document.addEventListener("visibilitychange", onVisibility);
    gallery?.addEventListener("pointerdown", pause);
    gallery?.addEventListener("pointerup", resume);
    gallery?.addEventListener("pointercancel", resume);

    return () => {
      clear();
      mq.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", onVisibility);
      gallery?.removeEventListener("pointerdown", pause);
      gallery?.removeEventListener("pointerup", resume);
      gallery?.removeEventListener("pointercancel", resume);
    };
  }, [showNav, lightboxOpen, goNext]);

  return (
    <>
      <div
        ref={galleryRef}
        className="relative aspect-square overflow-hidden rounded-3xl bg-white"
      >
        <ImageCarousel
          images={images}
          alt={alt}
          nav={nav}
          onIndexChange={onCarouselIndexChange}
          objectFit="cover"
          sizes="(max-width: 1024px) 100vw, 40vw"
          priority
          onSlideClick={() => setLightboxOpen(true)}
        />

        {discount ? (
          <span className="pointer-events-none absolute top-4 left-4 z-10 rounded-full bg-[#c45c4a] px-3 py-1.5 text-sm font-bold text-white">
            -{discount}%
          </span>
        ) : null}

        {showNav ? (
          <>
            <GalleryNavButton
              direction="prev"
              onClick={goPrev}
              className="left-3 hidden md:flex"
              variant="light"
            />
            <GalleryNavButton
              direction="next"
              onClick={goNext}
              className="right-3 hidden md:flex"
              variant="light"
            />
          </>
        ) : null}

        <GalleryDots
          images={images}
          activeIndex={activeIndex}
          onSelect={goTo}
        />
      </div>

      {lightboxOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 bg-black/92"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Zavrieť"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>

          <div
            className="relative flex h-full w-full items-center justify-center px-14 py-16 sm:px-20"
            onClick={(event) => event.stopPropagation()}
          >
            {showNav ? (
              <>
                <GalleryNavButton
                  direction="prev"
                  onClick={goPrev}
                  className="left-3 hidden md:flex md:left-6"
                  variant="dark"
                />
                <GalleryNavButton
                  direction="next"
                  onClick={goNext}
                  className="right-3 hidden md:flex md:right-6"
                  variant="dark"
                />
              </>
            ) : null}

            <div className="relative h-full w-full max-w-5xl overflow-hidden">
              <ImageCarousel
                images={images}
                alt={alt}
                nav={nav}
                onIndexChange={onCarouselIndexChange}
                objectFit="contain"
                sizes="100vw"
                priority
              />
            </div>

            <GalleryDots
              images={images}
              activeIndex={activeIndex}
              onSelect={goTo}
              className="bottom-6 sm:bottom-8"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

type ImageCarouselProps = {
  images: string[];
  alt: string;
  nav: NavCommand;
  onIndexChange: (index: number) => void;
  objectFit: "cover" | "contain";
  sizes: string;
  priority?: boolean;
  onSlideClick?: () => void;
};

function ImageCarousel({
  images,
  alt,
  nav,
  onIndexChange,
  objectFit,
  sizes,
  priority = false,
  onSlideClick,
}: ImageCarouselProps) {
  const loop = images.length > 1;
  const slides = loop ? [images[images.length - 1], ...images, images[0]] : images;
  const lastTrack = slides.length - 1;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const trackIndexRef = useRef(loop ? nav.index + 1 : nav.index);
  const lastSeqRef = useRef(nav.seq);
  const didDragRef = useRef(false);
  const ignoreNextNavRef = useRef(false);
  const animatingRef = useRef(false);

  const toRealIndex = useCallback(
    (trackIndex: number) => {
      if (!loop) return trackIndex;
      if (trackIndex <= 0) return images.length - 1;
      if (trackIndex >= lastTrack) return 0;
      return trackIndex - 1;
    },
    [images.length, lastTrack, loop],
  );

  const applyTransform = useCallback(
    (trackIndex: number, offsetPx: number, animate: boolean) => {
      const track = trackRef.current;
      const width = widthRef.current;
      if (!track || !width) return;

      // Force reflow so browsers honor transition toggling after clone jumps
      if (animate) {
        track.style.transition = "none";
        void track.offsetHeight;
      }

      track.style.transition = animate ? TRANSITION : "none";
      track.style.transform = `translate3d(${-trackIndex * width + offsetPx}px, 0, 0)`;
      animatingRef.current = animate;
    },
    [],
  );

  const normalizeClone = useCallback(() => {
    if (!loop) return false;
    const trackIndex = trackIndexRef.current;

    if (trackIndex === 0) {
      trackIndexRef.current = images.length;
      applyTransform(images.length, 0, false);
      return true;
    }

    if (trackIndex === lastTrack) {
      trackIndexRef.current = 1;
      applyTransform(1, 0, false);
      return true;
    }

    return false;
  }, [applyTransform, images.length, lastTrack, loop]);

  const measure = useCallback(() => {
    const width = viewportRef.current?.clientWidth ?? 0;
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

  useEffect(() => {
    if (nav.seq === lastSeqRef.current) return;
    lastSeqRef.current = nav.seq;

    if (ignoreNextNavRef.current) {
      ignoreNextNavRef.current = false;
      return;
    }

    if (dragRef.current) return;

    // Finish any pending clone jump before stepping again
    normalizeClone();

    if (!loop) {
      trackIndexRef.current = nav.index;
      applyTransform(nav.index, 0, true);
      return;
    }

    if (nav.dir === 1) {
      trackIndexRef.current = Math.min(lastTrack, trackIndexRef.current + 1);
      applyTransform(trackIndexRef.current, 0, true);
      return;
    }

    if (nav.dir === -1) {
      trackIndexRef.current = Math.max(0, trackIndexRef.current - 1);
      applyTransform(trackIndexRef.current, 0, true);
      return;
    }

    // Dots / external sync: land on real slide slot
    trackIndexRef.current = nav.index + 1;
    applyTransform(trackIndexRef.current, 0, true);
  }, [applyTransform, lastTrack, loop, nav, normalizeClone]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    // Block native image / file drag
    event.preventDefault();
    didDragRef.current = false;

    if (!loop) return;

    // If a wrap animation just finished visually but clone jump is pending,
    // or user interrupts mid-animation on a clone edge — settle first.
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
    if (Math.abs(deltaX) > 8) didDragRef.current = true;

    drag.deltaX = deltaX;
    applyTransform(trackIndexRef.current, deltaX, false);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;

    const width = widthRef.current || 1;
    const threshold = width * SWIPE_THRESHOLD_RATIO;
    const deltaX = drag.deltaX;
    let nextTrack = trackIndexRef.current;

    if (deltaX <= -threshold) nextTrack += 1;
    else if (deltaX >= threshold) nextTrack -= 1;

    nextTrack = Math.min(lastTrack, Math.max(0, nextTrack));
    trackIndexRef.current = nextTrack;

    const nextReal = toRealIndex(nextTrack);
    if (nextReal !== nav.index) {
      ignoreNextNavRef.current = true;
      onIndexChange(nextReal);
    }

    applyTransform(nextTrack, 0, true);
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    applyTransform(trackIndexRef.current, 0, true);
  }

  return (
    <div
      ref={viewportRef}
      tabIndex={onSlideClick ? 0 : undefined}
      aria-label={onSlideClick ? `Zobraziť ${alt} na celú obrazovku` : undefined}
      className={`absolute inset-0 overflow-hidden outline-none select-none [-webkit-user-drag:none] ${
        loop
          ? "cursor-grab touch-none active:cursor-grabbing"
          : onSlideClick
            ? "cursor-zoom-in"
            : ""
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDragStart={(event) => event.preventDefault()}
      onClick={() => {
        if (didDragRef.current) return;
        onSlideClick?.();
      }}
      onKeyDown={(event) => {
        if (!onSlideClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSlideClick();
        }
      }}
    >
      <div
        ref={trackRef}
        className="flex h-full will-change-transform select-none [-webkit-user-drag:none]"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      >
        {slides.map((src, index) => {
          const realIndex = toRealIndex(index);
          return (
            <div
              key={`${src}-${index}`}
              className="relative h-full w-full shrink-0 select-none [-webkit-user-drag:none]"
              aria-hidden={realIndex !== nav.index}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
            >
              <Image
                src={src}
                alt={realIndex === nav.index ? alt : ""}
                fill
                priority={priority && realIndex === 0 && index <= 1}
                quality={90}
                sizes={sizes}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className={`pointer-events-none select-none [-webkit-user-drag:none] ${
                  objectFit === "cover" ? "object-cover" : "object-contain"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GalleryNavButton({
  direction,
  onClick,
  className = "",
  variant,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
  variant: "light" | "dark";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const variantClass =
    variant === "light"
      ? "bg-white/90 text-[#2f2924] hover:bg-white"
      : "bg-white/15 text-white hover:bg-white/25";

  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Predchádzajúci obrázok" : "Ďalší obrázok"}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.18)] transition-colors ${variantClass} ${className}`}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function GalleryDots({
  images,
  activeIndex,
  className = "",
}: {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  if (images.length <= 1) return null;

  return (
    <div
      className={`absolute inset-x-0 bottom-4 z-10 flex items-center justify-center sm:bottom-5 ${className}`}
    >
      <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium tabular-nums text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-sm">
        {activeIndex + 1}&nbsp;/&nbsp;{images.length}
      </span>
    </div>
  );
}
