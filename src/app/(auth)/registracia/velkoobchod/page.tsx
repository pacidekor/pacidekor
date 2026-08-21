import type { Metadata } from "next";
import { WholesaleRegisterForm } from "@/components/auth/WholesaleRegisterForm";
import { listAuthSideSlides } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Registrácia veľkoobchod",
  description:
    "Požiadajte o veľkoobchodný účet PACIDEKOR - partnerské ceny pre kvetinárstva a firmy.",
  path: "/registracia/velkoobchod",
  noIndex: true,
});

export default async function WholesaleRegisterPage() {
  const sideSlides = await listAuthSideSlides();
  return <WholesaleRegisterForm sideSlides={sideSlides} />;
}
