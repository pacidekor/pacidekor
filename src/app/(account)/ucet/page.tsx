import type { Metadata } from "next";
import { ClientAccountSettings } from "@/components/account/ClientAccountSettings";

export const metadata: Metadata = {
  title: "Môj účet",
  description: "Nastavenie účtu, objednávky a šablóny PACIDEKOR.",
};

export default function UcetPage() {
  return <ClientAccountSettings />;
}
