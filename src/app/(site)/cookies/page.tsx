import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { OpenCookieSettingsButton } from "@/components/cookies/OpenCookieSettingsButton";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";
import { COMPANY } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Nastavenia Cookies",
  description:
    "Informácie o cookies a podobných technológiách používaných na webe PACIDEKOR a o možnostiach ich nastavenia.",
  path: "/cookies",
});

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const sections: LegalSection[] = [
  {
    id: "co-su-cookies",
    title: "Čo sú cookies",
    content: (
      <>
        <P>
          Cookies sú malé textové súbory, ktoré sa ukladajú vo vašom
          prehliadači pri návšteve webovej stránky. Pomáhajú zabezpečiť
          fungovanie e-shopu, zapamätať si nastavenia a v niektorých prípadoch
          aj merať návštevnosť alebo prispôsobiť obsah.
        </P>
        <P>
          Podobné technológie môžu zahŕňať aj lokálne úložisko prehliadača
          (localStorage) používané napríklad na košík, preferencie alebo
          dočasné údaje rozhrania.
        </P>
      </>
    ),
  },
  {
    id: "prevadzkovatel",
    title: "Prevádzkovateľ",
    content: (
      <>
        <P>
          Cookies na webe pacidekor.sk spravuje spoločnosť{" "}
          <strong>{COMPANY.name}</strong>, {COMPANY.address}, IČO {COMPANY.ico},
          IČ DPH {COMPANY.icDph}, e-mail{" "}
          <a
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-[#75825B]"
          >
            {COMPANY.email}
          </a>
          .
        </P>
        <P>
          Bližšie informácie o spracúvaní osobných údajov nájdete v{" "}
          <Link href="/ochrana-udajov" className="font-medium text-[#75825B]">
            Zásadách spracúvania osobných údajov
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "typy",
    title: "Typy cookies, ktoré používame",
    content: (
      <>
        <P>
          <strong>1. Nevyhnutné (technické) cookies</strong>
        </P>
        <P>
          Sú potrebné na základné fungovanie webu a e-shopu. Bez nich nie je
          možné spoľahlivo poskytnúť služby, napríklad:
        </P>
        <Ul
          items={[
            "prihlásenie a správa relácie (session),",
            "zabezpečenie a ochrana proti zneužitiu,",
            "zapamätanie obsahu košíka a základných nastavení rozhrania,",
            "správne zobrazenie stránky a navigácie.",
          ]}
        />
        <P>
          Tieto cookies neukladáme na základe marketingového súhlasu - ide o
          technicky nevyhnutné spracovanie súvisiace s poskytovaním služby.
        </P>

        <P>
          <strong>2. Funkčné cookies</strong>
        </P>
        <P>
          Umožňujú zapamätať si voliteľné preferencie (napr. zobrazenie
          katalógu, uložené šablóny košíka v prehliadači, nastavenia účtu v
          rozhraní). Môžu zlepšiť pohodlie používania, ale nie sú vždy striktne
          nevyhnutné na načítanie stránky.
        </P>

        <P>
          <strong>3. Analytické cookies</strong>
        </P>
        <P>
          Pomáhajú pochopiť, ako návštevníci web používajú (napr. ktoré stránky
          sú navštevované najčastejšie). Ak ich nasadíme, budú používané len so
          súhlasom, pokiaľ právne predpisy nestanovujú inak.
        </P>

        <P>
          <strong>4. Marketingové cookies</strong>
        </P>
        <P>
          Slúžia na meranie účinnosti kampaní alebo na zobrazovanie relevantnej
          reklamy. Aktuálne ich nemusíme aktívne používať; ak ich nasadíme,
          aktivujú sa len so súhlasom.
        </P>
      </>
    ),
  },
  {
    id: "doba",
    title: "Doba uloženia",
    content: (
      <>
        <P>Podľa typu cookies rozlišujeme najmä:</P>
        <Ul
          items={[
            "cookies relácie - zmazané po zatvorení prehliadača,",
            "trvalé cookies - zostávajú uložené po dobu uvedenú pri ich vytvorení alebo do ich vymazania v prehliadači,",
            "údaje v localStorage - do ich vymazania používateľom alebo aplikáciou.",
          ]}
        />
      </>
    ),
  },
  {
    id: "nastavenia",
    title: "Ako cookies spravovať",
    content: (
      <>
        <P>
          Preferencie cookies môžete kedykoľvek upraviť cez panel nižšie. Okrem
          toho ich môžete spravovať aj priamo vo svojom prehliadači (blokovanie,
          mazanie, režim súkromného prehliadania).
        </P>
        <div className="pt-1">
          <OpenCookieSettingsButton />
        </div>
        <P>
          Upozorňujeme, že vypnutie nevyhnutných cookies môže obmedziť
          funkčnosť e-shopu (napr. prihlásenie, košík alebo dokončenie
          objednávky).
        </P>
      </>
    ),
  },
  {
    id: "sutretie",
    title: "Súhlas a zmeny",
    content: (
      <>
        <P>
          Cookies, ktoré nie sú nevyhnutné (najmä analytické alebo marketingové),
          aktivujeme len so súhlasom. Preferencie môžete kedykoľvek zmeniť cez
          tlačidlo vyššie alebo cez banner cookies pri prvej návšteve.
        </P>
        <P>
          Tieto informácie môžeme aktualizovať podľa zmien technológií alebo
          právnych požiadaviek. Aktuálna verzia je vždy zverejnená tu.
        </P>
      </>
    ),
  },
  {
    id: "kontakt",
    title: "Kontakt",
    content: (
      <P>
        Otázky k cookies a ochrane údajov nám napíšte na{" "}
        <a
          href="mailto:info@pacidekor.sk"
          className="font-medium text-[#75825B]"
        >
          info@pacidekor.sk
        </a>{" "}
        alebo cez stránku{" "}
        <Link href="/kontakt" className="font-medium text-[#75825B]">
          Kontakt
        </Link>
        .
      </P>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Nastavenia Cookies"
      subtitle="Informácie o cookies a podobných technológiách na webe PACIDEKOR a o tom, ako ich môžete spravovať."
      updatedAt="18. 8. 2026"
      sections={sections}
    />
  );
}
