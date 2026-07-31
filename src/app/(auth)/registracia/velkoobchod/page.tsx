import type { Metadata } from "next";
import { WholesaleRegisterForm } from "@/components/auth/WholesaleRegisterForm";
import { listAuthSideSlides } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Registrácia veľkoobchod",
  description:
    "Požiadajte o veľkoobchodný účet PACIDEKOR – partnerské ceny pre kvetinárstva a firmy.",
};

export default async function WholesaleRegisterPage() {
  const sideSlides = await listAuthSideSlides();
  return <WholesaleRegisterForm sideSlides={sideSlides} />;
}
