import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "O nás",
  description:
    "PACIDEKOR - dovoz, predaj a distribúcia umelých kvetov, rastlín, sušiny, stúh, aranžérskeho materiálu a keramiky.",
};

const paragraphs = [
  "Špecializujeme sa na dovoz, predaj a distribúciu umelých kvetov a rastlín, sušiny, stúh, aranžérskeho a obalového materiálu či keramiky.",
  "Náš sortiment pravidelne rozširujeme o nové produkty, ktoré starostlivo vyberáme s dôrazom nielen na detail, estetiku a moderný dizajn, ale predovšetkým na vysokú kvalitu spracovania.",
  "Spolupracujeme s overenými dodávateľmi z viacerých krajín Európy a Ázie - najmä z Holandska, Maďarska, Poľska a Česka - aby sme vám mohli ponúknuť spoľahlivé produkty za atraktívne ceny.",
] as const;

const origins = ["Holandsko", "Maďarsko", "Poľsko", "Česko", "Ázia"] as const;

export default function ONasPage() {
  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">O nás</span>
      </nav>

      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
        <div className="flex flex-col">
          <header>
            <h1 className="text-3xl text-[#2f2924] sm:text-4xl">O nás</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
              Kto sme a čomu sa v PACIDEKORe venujeme.
            </p>
          </header>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-[#2f2924]/80 sm:text-lg sm:leading-8">
            {paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          <div className="mt-8 border-t border-[#2f2924]/10 pt-6">
            <p className="text-xs font-medium tracking-[0.14em] text-[#75825B] uppercase">
              Dodávatelia
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#2f2924]/70 sm:text-base">
              {origins.map((origin) => (
                <li key={origin}>{origin}</li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-10">
            <p className="text-sm text-[#2f2924]/55">
              Máte otázky alebo chcete spolupracovať?
            </p>
            <Link
              href="/kontakt"
              className="mt-3 inline-flex items-center gap-2 text-base font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
            >
              Prejsť na kontakt
              <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-[#e8ebe2] lg:h-full lg:w-auto">
          <Image
            src="/onasimg.webp"
            alt="Umelé kvety PACIDEKOR"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            quality={90}
            className="object-cover"
            priority
          />
        </div>
      </div>
    </main>
  );
}
