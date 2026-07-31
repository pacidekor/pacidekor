"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { AuthSideSlide } from "@/lib/products";
import { productHref } from "@/lib/products";

const ROTATE_MS = 5000;
const FADE_MS = 1100;
const FALLBACK_IMAGE = "/banner1.webp";

export function AuthSplitShell({
  children,
  sideSlides = [],
  sideTitle = "Veľkoobchod pre kvetinárstva",
  sideBody = "Partnerské ceny, spoľahlivé dodávky a sortiment umelých kvetov.",
}: {
  children: ReactNode;
  /** Product slides from the live catalog */
  sideSlides?: AuthSideSlide[];
  sideTitle?: string;
  sideBody?: string;
}) {
  const slides =
    sideSlides.length > 0
      ? sideSlides
      : [{ image: FALLBACK_IMAGE, name: "", slug: "" }];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides[index] ?? slides[0]!;
  const canLink = Boolean(active.slug && active.name);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  return (
    <div className="flex min-h-dvh w-full bg-white">
      <div className="flex w-full items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:w-1/2 lg:px-12 xl:px-16">
        <div className="my-auto w-full max-w-lg shrink-0">{children}</div>
      </div>

      <div className="sticky top-0 hidden h-dvh p-4 sm:p-5 lg:flex lg:w-1/2 lg:py-5 lg:pr-5 lg:pl-2">
        <div
          className="group relative w-full overflow-hidden rounded-[1.75rem] bg-[#e8ebe2]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {slides.map((slide, i) => {
            const visible = i === index;
            return (
              <Image
                key={`${slide.image}-${i}`}
                src={slide.image}
                alt={slide.name || ""}
                fill
                priority={i === 0}
                sizes="50vw"
                quality={85}
                className="object-cover transition-opacity ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transitionDuration: `${FADE_MS}ms`,
                }}
              />
            );
          })}

          {canLink ? (
            <div className="pointer-events-none absolute top-0 right-0 z-10 p-5 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 xl:p-6">
              <div className="inline-grid max-w-[min(20rem,calc(100vw-3rem))] grid-cols-[auto] rounded-2xl bg-[#2f2924]/80 px-4 py-3 text-white shadow-[0_12px_32px_rgba(47,41,36,0.28)] backdrop-blur-sm">
                <p className="font-heading text-base font-semibold leading-snug xl:text-lg">
                  {active.name}
                </p>
                <Link
                  href={productHref(active.slug)}
                  className="mt-2.5 flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium whitespace-nowrap text-[#2f2924] transition-opacity hover:opacity-90"
                >
                  Prejsť na produkt
                  <ArrowUpRight
                    className="size-3.5 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-10 p-8 xl:p-10">
            <div className="max-w-md overflow-hidden rounded-2xl bg-[#2f2924]/80 px-5 py-4 text-white xl:max-w-lg">
              <div
                key={`${sideTitle}|${sideBody}`}
                className="animate-[auth-rise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
              >
                <p className="font-heading text-2xl font-semibold leading-[1.2] text-balance xl:text-3xl">
                  {sideTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-white/85">
                  {sideBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthBrandLink() {
  return (
    <Link
      href="/"
      className="inline-flex font-heading text-xl tracking-[0.1em] text-[#75825B] transition-opacity hover:opacity-80"
    >
      PACIDEKOR
    </Link>
  );
}
