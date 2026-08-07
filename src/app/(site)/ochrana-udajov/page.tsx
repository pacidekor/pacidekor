import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Zásady spracúvania osobných údajov",
  description:
    "Informácie o spracúvaní osobných údajov v e-shope PACIDEKOR podľa GDPR a zákona o ochrane osobných údajov.",
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
    id: "uvod",
    title: "Úvod",
    content: (
      <>
        <P>
          Tieto zásady spracúvania osobných údajov (ďalej len „Zásady“)
          popisujú, ako spoločnosť PACIDEKOR s.r.o. (ďalej len „prevádzkovateľ“)
          spracúva osobné údaje návštevníkov a zákazníkov e-shopu na doméne
          pacidekor.sk.
        </P>
        <P>
          Spracúvanie osobných údajov sa riadi nariadením Európskeho parlamentu
          a Rady (EÚ) 2016/679 (GDPR), zákonom č. 18/2018 Z. z. o ochrane
          osobných údajov a súvisiacimi predpismi Slovenskej republiky.
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
          Prevádzkovateľom osobných údajov je obchodná spoločnosť{" "}
          <strong>PACIDEKOR s.r.o.</strong>
        </P>
        <Ul
          items={[
            "Sídlo / prevádzka: Kráľová nad Váhom 283, Slovenská republika",
            "E-mail: info@pacidekor.sk",
            "Telefón: +421 910 592 948",
            "IČO: [doplniť podľa ORSR]",
            "DIČ / IČ DPH: [doplniť podľa daňovej registrácie]",
          ]}
        />
        <P>
          V otázkach ochrany osobných údajov nás môžete kontaktovať na e-maile{" "}
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
      </>
    ),
  },
  {
    id: "rozsah",
    title: "Aké údaje spracúvame",
    content: (
      <>
        <P>Podľa okolností môžeme spracúvať najmä tieto kategórie údajov:</P>
        <Ul
          items={[
            "identifikačné a kontaktné údaje (meno, priezvisko, e-mail, telefón, adresa, firemné údaje, IČO),",
            "údaje súvisiace s objednávkou (obsah košíka, doprava, platba, história objednávok),",
            "údaje o používateľskom účte (prihlasovacie údaje, preferencie, veľkoobchodný / maloobchodný režim),",
            "komunikácia s nami (správy, reklamácie, žiadosti o restock / dostupnosť tovaru),",
            "údaje o newsletteri a marketingovom súhlase,",
            "technické údaje o návšteve webu (IP adresa, typ prehliadača, cookies a podobné technológie - bližšie v zásade cookies).",
          ]}
        />
      </>
    ),
  },
  {
    id: "ucely",
    title: "Účely a právne základy",
    content: (
      <>
        <P>Osobné údaje spracúvame najmä na tieto účely:</P>
        <Ul
          items={[
            "vybavenie objednávky, dodanie tovaru, fakturácia a komunikácia o objednávke - právny základ: plnenie zmluvy (čl. 6 ods. 1 písm. b) GDPR),",
            "vedenie používateľského účtu a súvisiace služby - právny základ: plnenie zmluvy,",
            "plnenie zákonných povinností (účtovníctvo, daňové predpisy, reklamácie) - právny základ: zákonná povinnosť (čl. 6 ods. 1 písm. c) GDPR),",
            "ochrana našich právnych nárokov, prevencia podvodov a bezpečnosť e-shopu - právny základ: oprávnený záujem (čl. 6 ods. 1 písm. f) GDPR),",
            "zasielanie newslettera a marketingových správ - právny základ: súhlas (čl. 6 ods. 1 písm. a) GDPR), ktorý môžete kedykoľvek odvolať,",
            "notifikácie o dostupnosti tovaru (restock) - právny základ: súhlas alebo kroky pred uzavretím zmluvy podľa okolností,",
            "štatistiky a zlepšovanie webu prostredníctvom cookies - podľa typu cookies súhlas alebo oprávnený záujem; podrobnosti sú v dokumente o cookies.",
          ]}
        />
      </>
    ),
  },
  {
    id: "prijemcovia",
    title: "Príjemcovia údajov",
    content: (
      <>
        <P>
          Osobné údaje môžeme v nevyhnutnom rozsahu sprístupniť dôveryhodným
          sprostredkovateľom a partnerom, ktorí nám pomáhajú prevádzkovať e-shop,
          najmä:
        </P>
        <Ul
          items={[
            "dopravcom a výdajným sieťam (napr. Packeta / Zásielkovňa) na doručenie tovaru,",
            "poskytovateľom platobných a bankových služieb,",
            "poskytovateľom hostingu, cloudových a IT služieb,",
            "účtovným, daňovým a právnym poradcom,",
            "orgánom verejnej moci, ak to vyžaduje zákon.",
          ]}
        />
        <P>
          Sprostredkovatelia spracúvajú údaje len podľa našich pokynov a na
          základe zmluvy o spracúvaní osobných údajov, ak to GDPR vyžaduje.
        </P>
      </>
    ),
  },
  {
    id: "prenos",
    title: "Prenos mimo EÚ / EHP",
    content: (
      <P>
        Ak by niektorý poskytovateľ služieb spracúval údaje mimo Európskej únie
        alebo Európskeho hospodárskeho priestoru, zabezpečíme primerané záruky
        podľa GDPR (napr. štandardné zmluvné doložky), pokiaľ osobitný predpis
        alebo rozhodnutie o primeranosti nestanovuje inak.
      </P>
    ),
  },
  {
    id: "doba",
    title: "Doba uchovávania",
    content: (
      <>
        <P>Údaje uchovávame len po dobu nevyhnutnú na daný účel:</P>
        <Ul
          items={[
            "údaje o objednávkach a fakturácii - spravidla po dobu požadovanú účtovnými a daňovými predpismi (zvyčajne 10 rokov),",
            "údaje o účte - po dobu existencie účtu a primeranú dobu po jeho zrušení,",
            "marketingový súhlas - do jeho odvolania, prípadne do ukončenia newslettera,",
            "žiadosti o dostupnosť tovaru - do vybavenia alebo odvolania žiadosti,",
            "cookies - podľa doby uvedenej v nastaveniach cookies / v dokumente o cookies.",
          ]}
        />
      </>
    ),
  },
  {
    id: "prava",
    title: "Vaše práva",
    content: (
      <>
        <P>V súvislosti so spracúvaním osobných údajov máte právo najmä:</P>
        <Ul
          items={[
            "na prístup k osobným údajom,",
            "na opravu nesprávnych alebo neúplných údajov,",
            "na vymazanie (právo byť zabudnutý), ak sú splnené zákonné podmienky,",
            "na obmedzenie spracúvania,",
            "na prenosnosť údajov,",
            "namietať proti spracúvaniu založenému na oprávnenom záujme,",
            "kedykoľvek odvolať súhlas, ak je spracúvanie založené na súhlase (bez vplyvu na zákonnosť spracúvania pred odvolaním),",
            "podať sťažnosť na Úrad na ochranu osobných údajov SR.",
          ]}
        />
        <P>
          Žiadosť o uplatnenie práv môžete zaslať na info@pacidekor.sk. Na
          overenie totožnosti môžeme vyžadovať dodatočné informácie.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <P>
        Na webe používame cookies a podobné technológie. Podrobnosti o typoch
        cookies, účeloch a nastaveniach nájdete na stránke{" "}
        <Link href="/cookies" className="font-medium text-[#75825B]">
          Nastavenia Cookies
        </Link>
        .
      </P>
    ),
  },
  {
    id: "bezpecnost",
    title: "Bezpečnosť",
    content: (
      <P>
        Osobné údaje chránime primeranými technickými a organizačnými
        opatreniami proti neoprávnenému prístupu, strate, zničeniu alebo
        zneužitiu. Prístup k údajom majú len osoby, ktoré ich potrebujú na
        plnenie svojich úloh.
      </P>
    ),
  },
  {
    id: "zaver",
    title: "Záverečné ustanovenia",
    content: (
      <>
        <P>
          Tieto Zásady môžeme podľa potreby aktualizovať. Aktuálna verzia je
          vždy zverejnená na tejto stránke spolu s dátumom poslednej
          aktualizácie.
        </P>
        <P>
          Bližšie obchodné pravidlá nákupu upravujú{" "}
          <Link
            href="/obchodne-podmienky"
            className="font-medium text-[#75825B]"
          >
            Obchodné podmienky
          </Link>
          .
        </P>
      </>
    ),
  },
];

export default function OchranaUdajovPage() {
  return (
    <LegalDocument
      title="Zásady spracúvania osobných údajov"
      subtitle="Informácie o tom, aké osobné údaje v e-shope PACIDEKOR spracúvame, na aké účely a aké máte práva."
      updatedAt="6. 8. 2026"
      sections={sections}
    />
  );
}
