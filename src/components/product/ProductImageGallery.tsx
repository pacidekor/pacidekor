"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const LOUPE_SIZE_PX = 168;
const LOUPE_ZOOM = 2.35;

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

type LoupeState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ZoomState = {
  scale: number;
  x: number;
  y: number;
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_EPSILON = 0.02;

type TouchPoint = { clientX: number; clientY: number };

function touchDistance(a: TouchPoint, b: TouchPoint) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchMidpoint(a: TouchPoint, b: TouchPoint) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  };
}

export function ProductImageGallery({
  images,
  alt,
  discount,
}: ProductImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMounted, setLightboxMounted] = useState(false);
  const [nav, setNav] = useState<NavCommand>({ index: 0, dir: 0, seq: 0 });
  const [loupe, setLoupe] = useState<LoupeState | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLightboxMounted(true);
  }, []);

  const showNav = images.length > 1;
  const activeIndex = nav.index;
  const activeSrc = images[activeIndex] ?? images[0];

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

  function updateLoupe(event: React.MouseEvent<HTMLDivElement>) {
    if (lightboxOpen) return;
    // Touch / coarse pointers — no loupe
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setLoupe(null);
      return;
    }
    // Don't show loupe over controls
    const target = event.target as HTMLElement | null;
    if (target?.closest("button")) {
      setLoupe(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setLoupe({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  return (
    <>
      <div
        ref={galleryRef}
        className="relative aspect-square overflow-hidden rounded-3xl bg-white"
        onMouseMove={updateLoupe}
        onMouseLeave={() => setLoupe(null)}
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

        {activeSrc && loupe ? <ImageLoupe src={activeSrc} loupe={loupe} /> : null}

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

      {lightboxMounted && lightboxOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              className="fixed inset-0 z-[100] bg-black/95"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                type="button"
                aria-label="Zavrieť"
                onClick={() => setLightboxOpen(false)}
                className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 sm:top-4 sm:right-4"
              >
                <X className="size-5" strokeWidth={1.75} aria-hidden />
              </button>

              <div
                className="relative flex h-full w-full items-center justify-center px-1 pt-14 pb-12 sm:px-10 sm:py-16 md:px-16"
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

                {/* Near-fullscreen on mobile — preview must be larger than the page gallery. */}
                <div className="relative h-full w-full max-w-none overflow-hidden sm:max-w-5xl">
                  <ImageCarousel
                    images={images}
                    alt={alt}
                    nav={nav}
                    onIndexChange={onCarouselIndexChange}
                    objectFit="contain"
                    sizes="100vw"
                    priority
                    enableZoom
                  />
                </div>

                <GalleryDots
                  images={images}
                  activeIndex={activeIndex}
                  onSelect={goTo}
                  className="bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-8"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ImageLoupe({
  src,
  loupe,
}: {
  src: string;
  loupe: LoupeState;
}) {
  const { x, y, width, height } = loupe;
  const half = LOUPE_SIZE_PX / 2;
  // Keep the lens fully inside the frame
  const left = Math.min(width - half, Math.max(half, x));
  const top = Math.min(height - half, Math.max(half, y));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[6] hidden overflow-hidden rounded-full border-2 border-white/95 shadow-[0_8px_28px_rgba(0,0,0,0.28)] md:block"
      style={{
        width: LOUPE_SIZE_PX,
        height: LOUPE_SIZE_PX,
        left: left - half,
        top: top - half,
      }}
    >
      {/* Same cover framing as the gallery slide, scaled around the cursor */}
      <div
        className="absolute"
        style={{
          width,
          height,
          left: half - x,
          top: half - y,
          transform: `scale(${LOUPE_ZOOM})`,
          transformOrigin: `${x}px ${y}px`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- mirrors cover crop; already in browser cache */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="size-full object-cover select-none"
        />
      </div>
    </div>
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
  enableZoom?: boolean;
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
  enableZoom = false,
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
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    pointerId: number;
  } | null>(null);
  const multiTouchRef = useRef(false);

  const clampPan = useCallback((scale: number, x: number, y: number) => {
    const width = widthRef.current || viewportRef.current?.clientWidth || 0;
    const height = viewportRef.current?.clientHeight || 0;
    if (!width || !height || scale <= 1) return { x: 0, y: 0 };
    const maxX = ((scale - 1) * width) / 2;
    const maxY = ((scale - 1) * height) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const resetZoom = useCallback(() => {
    pinchRef.current = null;
    panRef.current = null;
    setZoom({ scale: 1, x: 0, y: 0 });
  }, []);

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

  // Non-passive touchmove so preventDefault actually blocks browser scroll/gestures.
  useEffect(() => {
    if (!enableZoom) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const block = (event: TouchEvent) => {
      if (event.touches.length >= 2 || zoomRef.current.scale > 1 + ZOOM_EPSILON) {
        event.preventDefault();
      } else if (dragRef.current) {
        event.preventDefault();
      }
    };

    viewport.addEventListener("touchmove", block, { passive: false });
    return () => viewport.removeEventListener("touchmove", block);
  }, [enableZoom]);

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
    resetZoom();

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
  }, [applyTransform, lastTrack, loop, nav, normalizeClone, resetZoom]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (multiTouchRef.current) return;

    // Touch pinch/pan is handled via touch events when zoom is enabled.
    if (enableZoom && event.pointerType === "touch") return;

    didDragRef.current = false;

    // Pan when already zoomed (mouse / pen)
    if (enableZoom && zoomRef.current.scale > 1 + ZOOM_EPSILON) {
      event.preventDefault();
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: zoomRef.current.x,
        originY: zoomRef.current.y,
        pointerId: event.pointerId,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (!loop) {
      // Block native image drag on click-to-open
      if (onSlideClick) event.preventDefault();
      return;
    }

    event.preventDefault();

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
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      event.preventDefault();
      const next = clampPan(
        zoomRef.current.scale,
        pan.originX + (event.clientX - pan.startX),
        pan.originY + (event.clientY - pan.startY),
      );
      if (Math.hypot(event.clientX - pan.startX, event.clientY - pan.startY) > 8) {
        didDragRef.current = true;
      }
      setZoom((prev) => ({ ...prev, ...next }));
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 8) didDragRef.current = true;

    drag.deltaX = deltaX;
    applyTransform(trackIndexRef.current, deltaX, false);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      panRef.current = null;
      return;
    }

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
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      panRef.current = null;
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    applyTransform(trackIndexRef.current, 0, true);
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!enableZoom) return;

    if (event.touches.length >= 2) {
      multiTouchRef.current = true;
      dragRef.current = null;
      panRef.current = null;
      didDragRef.current = true;
      const [a, b] = [event.touches[0], event.touches[1]];
      const mid = touchMidpoint(a, b);
      const rect = viewportRef.current?.getBoundingClientRect();
      pinchRef.current = {
        startDist: Math.max(1, touchDistance(a, b)),
        startScale: zoomRef.current.scale,
        startX: zoomRef.current.x,
        startY: zoomRef.current.y,
        originX: mid.x - (rect?.left ?? 0),
        originY: mid.y - (rect?.top ?? 0),
      };
      return;
    }

    if (event.touches.length === 1 && zoomRef.current.scale > 1 + ZOOM_EPSILON) {
      const t = event.touches[0];
      panRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        originX: zoomRef.current.x,
        originY: zoomRef.current.y,
        pointerId: -1,
      };
      didDragRef.current = false;
      return;
    }

    // Single finger at scale 1 — keep carousel swipe via touch→synthetic path below
    if (event.touches.length === 1 && loop && zoomRef.current.scale <= 1 + ZOOM_EPSILON) {
      if (animatingRef.current) {
        const track = trackRef.current;
        if (track) track.style.transition = "none";
        animatingRef.current = false;
      }
      normalizeClone();
      dragRef.current = {
        startX: event.touches[0].clientX,
        deltaX: 0,
        pointerId: -1,
      };
      didDragRef.current = false;
      applyTransform(trackIndexRef.current, 0, false);
    }
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!enableZoom) return;

    if (event.touches.length >= 2 && pinchRef.current) {
      event.preventDefault();
      const [a, b] = [event.touches[0], event.touches[1]];
      const pinch = pinchRef.current;
      const dist = Math.max(1, touchDistance(a, b));
      const rawScale = pinch.startScale * (dist / pinch.startDist);
      const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rawScale));
      const mid = touchMidpoint(a, b);
      const rect = viewportRef.current?.getBoundingClientRect();
      const midX = mid.x - (rect?.left ?? 0);
      const midY = mid.y - (rect?.top ?? 0);
      const ratio = scale / Math.max(pinch.startScale, ZOOM_MIN);
      const next = clampPan(
        scale,
        pinch.startX * ratio + (midX - pinch.originX),
        pinch.startY * ratio + (midY - pinch.originY),
      );
      setZoom({ scale, ...next });
      return;
    }

    if (event.touches.length === 1 && panRef.current && zoomRef.current.scale > 1 + ZOOM_EPSILON) {
      event.preventDefault();
      const t = event.touches[0];
      const pan = panRef.current;
      if (Math.hypot(t.clientX - pan.startX, t.clientY - pan.startY) > 8) {
        didDragRef.current = true;
      }
      const next = clampPan(
        zoomRef.current.scale,
        pan.originX + (t.clientX - pan.startX),
        pan.originY + (t.clientY - pan.startY),
      );
      setZoom((prev) => ({ ...prev, ...next }));
      return;
    }

    const drag = dragRef.current;
    if (event.touches.length === 1 && drag && drag.pointerId === -1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - drag.startX;
      if (Math.abs(deltaX) > 8) didDragRef.current = true;
      drag.deltaX = deltaX;
      applyTransform(trackIndexRef.current, deltaX, false);
    }
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!enableZoom) return;

    if (event.touches.length < 2) {
      multiTouchRef.current = false;
      pinchRef.current = null;
      if (zoomRef.current.scale <= 1 + ZOOM_EPSILON) {
        setZoom({ scale: 1, x: 0, y: 0 });
      } else {
        setZoom((prev) => ({
          scale: prev.scale,
          ...clampPan(prev.scale, prev.x, prev.y),
        }));
      }
    }

    if (event.touches.length === 0) {
      panRef.current = null;

      const drag = dragRef.current;
      if (drag && drag.pointerId === -1) {
        dragRef.current = null;
        const width = widthRef.current || 1;
        const threshold = width * SWIPE_THRESHOLD_RATIO;
        const deltaX = drag.deltaX;
        let nextTrack = trackIndexRef.current;

        if (zoomRef.current.scale <= 1 + ZOOM_EPSILON) {
          if (deltaX <= -threshold) nextTrack += 1;
          else if (deltaX >= threshold) nextTrack -= 1;
        }

        nextTrack = Math.min(lastTrack, Math.max(0, nextTrack));
        trackIndexRef.current = nextTrack;

        const nextReal = toRealIndex(nextTrack);
        if (nextReal !== nav.index) {
          ignoreNextNavRef.current = true;
          resetZoom();
          onIndexChange(nextReal);
        }

        applyTransform(nextTrack, 0, true);
      }
    } else if (event.touches.length === 1 && zoomRef.current.scale > 1 + ZOOM_EPSILON) {
      const t = event.touches[0];
      panRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        originX: zoomRef.current.x,
        originY: zoomRef.current.y,
        pointerId: -1,
      };
    }
  }

  const zoomed = zoom.scale > 1 + ZOOM_EPSILON;

  return (
    <div
      ref={viewportRef}
      tabIndex={onSlideClick ? 0 : undefined}
      aria-label={onSlideClick ? `Zobraziť ${alt} na celú obrazovku` : undefined}
      className={`absolute inset-0 overflow-hidden outline-none select-none [-webkit-user-drag:none] ${
        loop || zoomed
          ? "cursor-grab touch-none active:cursor-grabbing"
          : onSlideClick
            ? "cursor-zoom-in"
            : enableZoom
              ? "touch-none"
              : ""
      }`}
      style={enableZoom ? { touchAction: "none" } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
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
        className="h-full w-full will-change-transform"
        style={
          enableZoom
            ? {
                transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
                transformOrigin: "center center",
              }
            : undefined
        }
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
