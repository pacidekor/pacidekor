"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ImageLightboxProps = {
  images: string[];
  index: number;
  alt?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ImageLightbox({
  images,
  index,
  alt = "Obrázok produktu",
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const count = images.length;
  const showNav = count > 1;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const src = images[safeIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (!showNav) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onIndexChange((safeIndex - 1 + count) % count);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onIndexChange((safeIndex + 1) % count);
    }
  });

  useEffect(() => {
    if (!mounted || count === 0) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, count]);

  if (!mounted || !src || count === 0) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] bg-black/92"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Zavrieť"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
      >
        <X className="size-5" strokeWidth={1.75} aria-hidden />
      </button>

      {showNav ? (
        <p className="pointer-events-none absolute top-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-xs font-medium tracking-wide text-white/90 tabular-nums">
          {safeIndex + 1} / {count}
        </p>
      ) : null}

      <div
        className="relative flex h-full w-full items-center justify-center px-4 py-16 sm:px-16"
        onClick={(event) => event.stopPropagation()}
      >
        {showNav ? (
          <>
            <button
              type="button"
              aria-label="Predchádzajúci obrázok"
              onClick={() => onIndexChange((safeIndex - 1 + count) % count)}
              className="absolute top-1/2 left-3 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 sm:left-6"
            >
              <ChevronLeft className="size-6" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Ďalší obrázok"
              onClick={() => onIndexChange((safeIndex + 1) % count)}
              className="absolute top-1/2 right-3 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 sm:right-6"
            >
              <ChevronRight className="size-6" strokeWidth={1.75} aria-hidden />
            </button>
          </>
        ) : null}

        <div className="relative h-full w-full max-w-5xl">
          <LightboxImage src={src} alt={`${alt} (${safeIndex + 1})`} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LightboxImage({ src, alt }: { src: string; alt: string }) {
  const isLocalPath = src.startsWith("/");

  if (isLocalPath) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        quality={90}
        className="object-contain"
        priority
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 size-full object-contain"
    />
  );
}
