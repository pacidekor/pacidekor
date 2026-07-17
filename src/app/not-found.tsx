import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    absolute: "404 | PACIDEKOR",
  },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-heading text-[7rem] leading-none font-semibold tracking-tight text-[#75825B] sm:text-[9rem]">
        404
      </p>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
        Jejda! Táto stránka (možno zatiaľ) neexistuje
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
        Možno bola presunutá alebo ste zadali nesprávnu adresu.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-[#75825B] px-7 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Späť na domovskú stránku
      </Link>
    </main>
  );
}
