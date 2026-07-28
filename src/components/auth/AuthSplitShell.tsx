"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const AUTH_SIDE_IMAGE = "/produkty_new/2.jpg";

export function AuthSplitShell({
  children,
  sideTitle = "Veľkoobchod pre kvetinárstva",
  sideBody = "Partnerské ceny, spoľahlivé dodávky a sortiment umelých kvetov.",
}: {
  children: ReactNode;
  sideTitle?: string;
  sideBody?: string;
}) {
  return (
    <div className="flex min-h-dvh w-full bg-white">
      <div className="flex w-full items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:w-1/2 lg:px-12 xl:px-16">
        <div className="my-auto w-full max-w-lg shrink-0">{children}</div>
      </div>

      <div className="sticky top-0 hidden h-dvh p-4 sm:p-5 lg:flex lg:w-1/2 lg:py-5 lg:pr-5 lg:pl-2">
        <div className="relative w-full overflow-hidden rounded-[1.75rem] bg-[#e8ebe2]">
          <Image
            src={AUTH_SIDE_IMAGE}
            alt=""
            fill
            priority
            sizes="50vw"
            quality={90}
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
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
