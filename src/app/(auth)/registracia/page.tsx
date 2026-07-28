import type { Metadata } from "next";
import { RetailRegisterForm } from "@/components/auth/RetailRegisterForm";

export const metadata: Metadata = {
  title: "Registrácia",
  description: "Vytvorte si zákaznícky účet PACIDEKOR.",
};

export default function RetailRegisterPage() {
  return <RetailRegisterForm />;
}
