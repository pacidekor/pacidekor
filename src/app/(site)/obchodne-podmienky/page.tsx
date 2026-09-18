import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";
import { COMPANY, COMPANY_IDENTIFICATION_ITEMS } from "@/lib/company";
import { MIN_ORDER_TOTAL } from "@/lib/price";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Všeobecné obchodné podmienky",
  description:
    "Všeobecné obchodné podmienky e-shopu PACIDEKOR - informácie o objednávkach, platbe, doprave a reklamáciách.",
  path: "/obchodne-podmienky",
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
    id: "uvodne",
    title: "Úvodné ustanovenia",
    content: (
      <>
        <P>
          Tieto všeobecné obchodné podmienky (ďalej len „VOP“) upravujú práva a
          povinnosti predávajúceho a kupujúceho pri kúpe tovaru prostredníctvom
          internetového obchodu dostupného na doméne pacidekor.sk (ďalej len
          „e-shop“).
        </P>
        <P>
          VOP sú neoddeliteľnou súčasťou kúpnej zmluvy uzavretej medzi
          predávajúcim a kupujúcim. Odoslaním objednávky kupujúci potvrdzuje, že
          sa s týmito VOP oboznámil a súhlasí s nimi.
        </P>
      </>
    ),
  },
  {
    id: "predavajuci",
    title: "Identifikačné údaje predávajúceho",
    content: (
      <>
        <P>
          Predávajúcim je obchodná spoločnosť <strong>{COMPANY.name}</strong>
        </P>
        <Ul items={[...COMPANY_IDENTIFICATION_ITEMS]} />
        <P>
          Aktuálne kontaktné údaje sú uvedené aj na stránke{" "}
          <Link href="/kontakt" className="font-medium text-[#75825B]">
            Kontakt
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "definicie",
    title: "Základné pojmy",
    content: (
      <Ul
        items={[
          "Kupujúci - fyzická alebo právnická osoba, ktorá uzatvára kúpnu zmluvu s predávajúcim prostredníctvom e-shopu.",
          "Spotrebiteľ - fyzická osoba, ktorá pri uzatváraní a plnení spotrebiteľskej zmluvy nekoná v rámci predmetu svojej podnikateľskej činnosti alebo povolania.",
          "Tovar - produkty ponúkané na predaj v e-shope (najmä umelé kvety, dekorácie a súvisiaci sortiment).",
          "Objednávka - návrh na uzavretie kúpnej zmluvy odoslaný kupujúcim cez e-shop.",
          "Kúpna zmluva - zmluva medzi predávajúcim a kupujúcim vzniknutá potvrdením objednávky predávajúcim.",
        ]}
      />
    ),
  },
  {
    id: "objednavka",
    title: "Objednávka a uzavretie zmluvy",
    content: (
      <>
        <P>
          Objednávku môže kupujúci vytvoriť vložením tovaru do košíka a
          odoslaním objednávky v pokladni. Pred odoslaním má možnosť skontrolovať
          a upraviť obsah košíka, fakturačné údaje, spôsob dopravy a platby.
        </P>
        <P>
          Minimálna hodnota objednávky je {MIN_ORDER_TOTAL.toFixed(2).replace(".", ",")}{" "}
          €. Odoslaním objednávky vzniká návrh na uzavretie kúpnej zmluvy.
          Kúpna zmluva je uzavretá okamihom, keď predávajúci potvrdí prijatie
          objednávky e-mailom alebo iným preukázateľným spôsobom.
        </P>
        <P>
          Predávajúci si vyhradzuje právo objednávku odmietnuť, najmä ak tovar
          nie je dostupný, údaje kupujúceho sú neúplné alebo nesprávne, alebo
          ak existuje podozrenie zo zneužitia.
        </P>
      </>
    ),
  },
  {
    id: "cena",
    title: "Ceny tovaru",
    content: (
      <>
        <P>
          Všetky ceny tovaru v e-shope sú uvedené v eurách (€). Ak nie je uvedené
          inak, ide o konečné ceny vrátane DPH. Cena platná v okamihu odoslania
          objednávky je záväzná pre danú objednávku.
        </P>
        <P>
          Akciové ceny a zľavy platia len v období a za podmienok uvedených pri
          konkrétnom tovare. Predávajúci si vyhradzuje právo ceny priebežne
          upravovať; zmena sa netýka už potvrdených objednávok.
        </P>
      </>
    ),
  },
  {
    id: "platba",
    title: "Spôsoby platby",
    content: (
      <>
        <P>Kupujúci môže za tovar zaplatiť najmä týmito spôsobmi:</P>
        <Ul
          items={[
            "online platbou cez platobnú bránu GoPay (platobná karta alebo bankový prevod v rámci brány),",
            "dobierkou pri doručení tovaru (ak je táto možnosť pri objednávke dostupná).",
          ]}
        />
        <P>
          Pri online platbe cez GoPay je tovar expedovaný spravidla po úspešnom
          pripísaní platby. Pri dobierke môže byť účtovaný príplatok podľa
          aktuálnej ponuky v pokladni; sumu vyberie dopravca pri prevzatí
          zásielky.
        </P>
      </>
    ),
  },
  {
    id: "doprava",
    title: "Doprava a dodanie",
    content: (
      <>
        <P>
          Tovar dodávame na území Slovenskej republiky, prípadne do ďalších
          krajín, ak to predávajúci výslovne umožní. Dostupné spôsoby dopravy a
          ich ceny sú uvedené v pokladni pri dokončení objednávky.
        </P>
        <P>Aktuálne bežné spôsoby dopravy zahŕňajú najmä:</P>
        <Ul
          items={[
            "Packeta / Zásielkovňa - výdajné miesto alebo Z-BOX (cena od 2,30 €),",
            "osobný odber po dohode (zadarmo).",
          ]}
        />
        <P>
          Pri objednávke nad 100 € môže byť doprava podľa aktuálnych podmienok
          e-shopu zdarma. Presný termín dodania závisí od dostupnosti tovaru a
          zvoleného dopravcu; orientačne expedujeme objednávky v čo najkratšom
          čase, často do 24 hodín od potvrdenia / úhrady.
        </P>
        <P>
          Nebezpečenstvo škody na tovare prechádza na kupujúceho jeho prevzatím.
          Ak kupujúci tovar neprevezme bezdôvodne, môže predávajúci požadovať
          náhradu nákladov spojených s dopravou a uskladnením.
        </P>
      </>
    ),
  },
  {
    id: "odstupenie",
    title: "Odstúpenie od zmluvy (spotrebiteľ)",
    content: (
      <>
        <P>
          Spotrebiteľ má právo odstúpiť od zmluvy uzavretej na diaľku bez
          uvedenia dôvodu v lehote 14 dní odo dňa prevzatia tovaru. Lehota je
          zachovaná, ak oznámenie o odstúpení bolo odoslané pred jej uplynutím.
        </P>
        <P>
          Odstúpenie je možné oznámiť e-mailom na info@pacidekor.sk alebo
          písomne na adresu predávajúceho. V oznámení uveďte číslo objednávky,
          meno, kontakt a prípadne popis tovaru.
        </P>
        <P>
          Po odstúpení spotrebiteľ tovar bez zbytočného odkladu, najneskôr do 14
          dní, odošle alebo odovzdá predávajúcemu. Náklady na vrátenie tovaru
          znáša spotrebiteľ, ak nie je dohodnuté inak.
        </P>
        <P>
          Predávajúci vráti platby spotrebiteľovi do 14 dní od odstúpenia, a to
          rovnakým spôsobom, akým bola platba prijatá, pokiaľ spotrebiteľ
          výslovne nesúhlasí s iným spôsobom. Predávajúci nie je povinný vrátiť
          peniaze skôr, ako mu je tovar doručený alebo preukázané jeho odoslanie.
        </P>
        <P>
          Tovar by mal byť vrátený v pôvodnom stave, nepoškodený, kompletý a
          podľa možnosti v pôvodnom obale. Spotrebiteľ zodpovedá za zníženie
          hodnoty tovaru, ktoré vzniklo zaobchádzaním nad rámec nevyhnutného na
          zistenie povahy a vlastností tovaru.
        </P>
        <P>
          Právo na odstúpenie nemusí vzniknúť pri tovare zhotovenom podľa
          osobitných požiadaviek spotrebiteľa, tovare podliehajúcom rýchlemu
          zníženiu kvality, alebo v ďalších prípadoch podľa osobitných predpisov.
        </P>
      </>
    ),
  },
  {
    id: "reklamacie",
    title: "Reklamácie a záruka",
    content: (
      <>
        <P>
          Predávajúci zodpovedá za vady, ktoré má tovar pri prevzatí, a za vady,
          ktoré sa vyskytnú v záručnej dobe. Pri spotrebiteľskom predaji tovaru
          platí zákonná záruka v dĺžke 24 mesiacov, ak osobitný predpis alebo
          záručný list nestanovuje inak.
        </P>
        <P>
          Reklamáciu uplatnite bez zbytočného odkladu po zistení vady, ideálne
          e-mailom na info@pacidekor.sk s popisom vady, fotodokumentáciou,
          číslom objednávky a kontaktom. Predávajúci potvrdí prijatie reklamácie
          a vybaví ju v zákonných lehotách.
        </P>
        <P>
          Pri oprávnenej reklamácii má kupujúci podľa okolností nárok najmä na
          odstránenie vady, výmenu tovaru, primeranú zľavu z ceny alebo odstúpenie
          od zmluvy, v súlade s platnými právnymi predpismi.
        </P>
        <P>
          Podrobný postup reklamácií môže byť doplnený samostatným reklamačným
          poriadkom. Do jeho zverejnenia sa postupuje podľa týchto VOP a
          príslušných zákonov Slovenskej republiky.
        </P>
      </>
    ),
  },
  {
    id: "velkoobchod",
    title: "Veľkoobchodní zákazníci",
    content: (
      <>
        <P>
          Pre registrovaných veľkoobchodných partnerov môžu platiť osobitné ceny,
          minimálne odbery a obchodné podmienky dohodnuté individuálne. Ak nie
          je dohodnuté inak, primerane sa použijú tieto VOP.
        </P>
        <P>
          Na veľkoobchodný vzťah medzi podnikateľmi sa spotrebiteľské ustanovenia
          o odstúpení od zmluvy na diaľku nevzťahujú v rozsahu, v akom to
          právne predpisy neumožňujú.
        </P>
      </>
    ),
  },
  {
    id: "ochrana",
    title: "Ochrana osobných údajov",
    content: (
      <P>
        Spracúvanie osobných údajov kupujúceho sa riadi osobitným dokumentom
        o ochrane súkromia / GDPR, ktorý je dostupný na stránke e-shopu. Odoslaním
        objednávky kupujúci berie na vedomie spracovanie údajov nevyhnutných na
        vybavenie objednávky.
      </P>
    ),
  },
  {
    id: "riesenie-sporov",
    title: "Riešenie sporov",
    content: (
      <>
        <P>
          Vzájomné spory sa predávajúci a kupujúci pokúsia vyriešiť prednostne
          dohodou. Spotrebiteľ má právo obrátiť sa so sťažnosťou na predávajúceho
          a následne na príslušný orgán dohľadu alebo na subjekt alternatívneho
          riešenia sporov.
        </P>
        <P>
          Spotrebiteľ môže na riešenie spotrebiteľského sporu využiť platformu
          Európskej komisie na riešenie sporov online (ODR) dostupnú na{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#75825B]"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </P>
        <P>
          Dozorným orgánom pre ochranu spotrebiteľa je najmä Slovenská
          obchodná inšpekcia (SOI).
        </P>
      </>
    ),
  },
  {
    id: "zaver",
    title: "Záverečné ustanovenia",
    content: (
      <>
        <P>
          Právne vzťahy neupravené týmito VOP sa riadia právnym poriadkom
          Slovenskej republiky, najmä Občianskym zákonníkom, zákonom o ochrane
          spotrebiteľa a súvisiacimi predpismi.
        </P>
        <P>
          Predávajúci môže VOP aktualizovať. Pre konkrétnu objednávku sú
          rozhodujúce VOP platné a účinné v čase jej odoslania. Neplatnosť
          niektorého ustanovenia nemá vplyv na platnosť ostatných ustanovení.
        </P>
        <P>
          Tieto VOP nadobúdajú účinnosť dňom ich zverejnenia v e-shope.
        </P>
      </>
    ),
  },
];

export default function ObchodnePodmienkyPage() {
  return (
    <LegalDocument
      title="Všeobecné obchodné podmienky"
      subtitle="Pravidlá nákupu v e-shope PACIDEKOR - objednávky, platba, doprava, odstúpenie od zmluvy a reklamácie."
      updatedAt="18. 8. 2026"
      sections={sections}
    />
  );
}
