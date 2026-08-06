import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";
import { WithdrawalOrderForm } from "@/components/legal/WithdrawalOrderForm";

export const metadata: Metadata = {
  title: "Odstúpenie od zmluvy",
  description:
    "Informácie o práve spotrebiteľa odstúpiť od zmluvy uzavretej na diaľku v e-shope PACIDEKOR.",
};

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
    id: "pravo",
    title: "Právo na odstúpenie od zmluvy",
    content: (
      <>
        <P>
          Ak ste spotrebiteľ a uzavreli ste s nami kúpnu zmluvu na diaľku
          prostredníctvom e-shopu pacidekor.sk, máte právo odstúpiť od zmluvy
          bez uvedenia dôvodu v lehote <strong>14 dní</strong>.
        </P>
        <P>
          Lehota na odstúpenie začína plynúť odo dňa, keď ste tovar prevzali vy
          alebo vami určená tretia osoba iná ako dopravca. Pri objednávke
          viacerých druhov tovaru dodávaných samostatne začína lehota plynúť
          odo dňa prevzatia poslednej dodávky.
        </P>
        <P>
          Lehota je zachovaná, ak oznámenie o odstúpení odošlete pred jej
          uplynutím.
        </P>
      </>
    ),
  },
  {
    id: "ako",
    title: "Ako odstúpiť od zmluvy",
    content: (
      <>
        <P>
          Odstúpenie oznámte jednoznačným vyhlásením. Najjednoduchšie je napísať
          e-mail na{" "}
          <a
            href="mailto:info@pacidekor.sk"
            className="font-medium text-[#75825B]"
          >
            info@pacidekor.sk
          </a>{" "}
          alebo zaslať písomné oznámenie na adresu:
        </P>
        <Ul
          items={[
            "PACIDEKOR s.r.o.",
            "Kráľová nad Váhom 283, Slovenská republika",
          ]}
        />
        <P>V oznámení uveďte najmä:</P>
        <Ul
          items={[
            "meno a priezvisko,",
            "adresu a kontakt (e-mail, telefón),",
            "číslo objednávky,",
            "popis / názov vráteného tovaru,",
            "dátum objednávky a prevzatia tovaru,",
            "číslo účtu na vrátenie peňazí (ak ste platili inak ako prevodom).",
          ]}
        />
        <P>
          Po prijatí oznámenia vám potvrdíme jeho prijatie. Bližšie obchodné
          pravidlá nájdete aj v{" "}
          <Link
            href="/obchodne-podmienky"
            className="font-medium text-[#75825B]"
          >
            Obchodných podmienkach
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "vzot",
    title: "Vzory oznámenia",
    content: (
      <>
        <P>
          Môžete použiť napríklad tento text (doplňte svoje údaje):
        </P>
        <P>
          „Týmto oznamujem / oznamujeme*, že odstupujem / odstupujeme* od
          kúpnej zmluvy na tento tovar: … Dátum objednávky / prevzatia: …
          Meno a priezvisko spotrebiteľa: … Adresa spotrebiteľa: … Podpis
          spotrebiteľa (len pri papierovej forme): … Dátum: …“
        </P>
        <P>* Nehodiace sa prečiarknite.</P>
      </>
    ),
  },
  {
    id: "vratenie",
    title: "Vrátenie tovaru",
    content: (
      <>
        <P>
          Po odstúpení ste povinný tovar bez zbytočného odkladu, najneskôr do
          14 dní od odstúpenia, odoslať alebo odovzdať predávajúcemu na adresu
          uvedenú vyššie, pokiaľ sa nedohodneme inak.
        </P>
        <P>
          Tovar vráťte v pôvodnom stave, nepoškodený, kompletný a podľa možnosti
          v pôvodnom obale. Môžete tovar vyskúšať v rozsahu potrebnom na zistenie
          jeho povahy, vlastností a funkčnosti - podobne ako v kamennom obchode.
        </P>
        <P>
          Zodpovedáte za zníženie hodnoty tovaru, ktoré vzniklo zaobchádzaním
          nad rámec tohto nevyhnutného skúšania.
        </P>
        <P>
          Náklady na vrátenie tovaru znášate vy ako spotrebiteľ, ak nie je
          výslovne dohodnuté inak.
        </P>
      </>
    ),
  },
  {
    id: "peniaze",
    title: "Vrátenie platieb",
    content: (
      <>
        <P>
          Po odstúpení vám vrátime všetky platby, ktoré ste uhradili v súvislosti
          s tovarom, vrátane nákladov na doručenie (okrem dodatočných nákladov
          vzniknutých zvolením iného ako najlacnejšieho štandardného spôsobu
          doručenia, ktorý sme ponúkali).
        </P>
        <P>
          Platby vrátime bez zbytočného odkladu, najneskôr do 14 dní odo dňa, keď
          nám bolo doručené oznámenie o odstúpení. Peniaze vrátime rovnakým
          spôsobom, akým ste platbu uskutočnili, pokiaľ výslovne nesúhlasíte s
          iným spôsobom a nevzniknú vám tým ďalšie náklady.
        </P>
        <P>
          Nie sme povinní vrátiť peniaze skôr, ako nám bude tovar doručený alebo
          kým nepreukážete, že ste tovar odoslali späť.
        </P>
      </>
    ),
  },
  {
    id: "vynimky",
    title: "Kedy právo na odstúpenie nevzniká",
    content: (
      <>
        <P>
          Právo na odstúpenie od zmluvy nemusí vzniknúť najmä, ak ide o:
        </P>
        <Ul
          items={[
            "tovar zhotovený podľa vašich osobitných požiadaviek alebo určený osobne pre vás,",
            "tovar, ktorý podlieha rýchlemu zníženiu kvality alebo skaze,",
            "tovar v uzavretom obale, ktorý nie je vhodné vrátiť z dôvodu ochrany zdravia alebo z hygienických dôvodov a ktorého obal bol po dodaní porušený,",
            "ďalšie prípady podľa osobitných predpisov o ochrane spotrebiteľa.",
          ]}
        />
        <P>
          Toto právo na odstúpenie sa vzťahuje na spotrebiteľov. Na nákupy
          uskutočnené v rámci podnikateľskej činnosti (napr. veľkoobchod) sa
          spotrebiteľské pravidlá o odstúpení od zmluvy na diaľku v plnom
          rozsahu nevzťahujú, pokiaľ nie je dohodnuté inak.
        </P>
      </>
    ),
  },
  {
    id: "kontakt",
    title: "Kontakt",
    content: (
      <P>
        Otázky k odstúpeniu od zmluvy nám napíšte na{" "}
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

export default function OdstupenieOdZmluvyPage() {
  return (
    <LegalDocument
      title="Odstúpenie od zmluvy"
      subtitle="Informácie pre spotrebiteľov o práve odstúpiť od zmluvy uzavretej na diaľku, vrátení tovaru a refundácii."
      updatedAt="6. 8. 2026"
      beforeSections={<WithdrawalOrderForm />}
      sections={sections}
    />
  );
}
