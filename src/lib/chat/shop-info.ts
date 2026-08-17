import "server-only";

import { seedSiteContent } from "@/lib/site-content";
import { getShippingInfoForChat } from "@/lib/shipping";

export function getShopInfoForChat() {
  const { contact } = seedSiteContent();
  return {
    company: contact.company,
    phone: contact.phone,
    email: contact.email,
    address: contact.address,
    contactPage: "/kontakt",
    reply_hint:
      "Odpovedzte stručne (2–3 vety), bez ** a odrážok. Uveďte len firmu PACIDEKOR (adresa, telefón, e-mail). Na záver odkážte cez [stránke Kontakt](/kontakt). Nespomínajte predajne ani Mia.",
  };
}

export function getAccountHelpForChat() {
  return {
    steps: [
      "Prihlásenie: otvorte stránku Prihlásenie a zadajte e-mail a heslo.",
      "Registrácia maloobchod: vytvorte účet na stránke Registrácia.",
      "Registrácia veľkoobchod: použite veľkoobchodnú registráciu (firemné údaje).",
      "Zabudnuté heslo: použite odkaz na obnovenie hesla na stránke prihlásenia — v chate heslá neriešime.",
    ],
    favorites: {
      summary:
        "Obľúbené: na produkte kliknite na srdiečko. Zoznam je na stránke Obľúbené. Na sync medzi zariadeniami je potrebné byť prihlásený.",
      link: "/oblubene",
    },
    newsletter: {
      summary:
        "Newsletter: na homepage dole môžete zadať e-mail a odoberať novinky. Odhlásiť sa dá odkazom v každom newsletteri.",
      link: "/",
      example_reply:
        "Áno, máme newsletter. Prihlásiť sa môžete dole na [úvodnej stránke](/). Odhlásenie je odkazom v e-maile.",
    },
    links: [
      { label: "Prihlásenie", href: "/prihlasenie" },
      { label: "Registrácia", href: "/registracia" },
      {
        label: "Veľkoobchodné prihlásenie",
        href: "/prihlasenie/velkoobchod",
      },
      {
        label: "Veľkoobchodná registrácia",
        href: "/registracia/velkoobchod",
      },
      { label: "Obľúbené", href: "/oblubene" },
      { label: "Môj účet", href: "/ucet" },
    ],
    reply_hint:
      "Odpovedzte stručne (2–4 vety), bez ** a odrážok. Odkazy vždy ako [viditeľný text](/cesta), napr. [tejto stránke](/ucet), [prihlásení](/prihlasenie), [Obľúbené](/oblubene). Nikdy nepíšte holé /ucet.",
  };
}

export function getShippingHelpForChat() {
  return getShippingInfoForChat();
}
