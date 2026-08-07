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
      "Uveďte len firmu PACIDEKOR (adresa, telefón, e-mail). Nespomínajte predajne ani kvetinárstvá Mia. Na záver odkážte na stránku /kontakt pre viac informácií.",
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
    ],
  };
}

export function getShippingHelpForChat() {
  return getShippingInfoForChat();
}
