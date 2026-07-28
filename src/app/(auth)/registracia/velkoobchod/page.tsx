import type { Metadata } from "next";
import { WholesaleRegisterForm } from "@/components/auth/WholesaleRegisterForm";

export const metadata: Metadata = {
  title: "Registrácia veľkoobchod",
  description:
    "Požiadajte o veľkoobchodný účet PACIDEKOR – partnerské ceny pre kvetinárstva a firmy.",
};

export default function WholesaleRegisterPage() {
  return <WholesaleRegisterForm />;
}
