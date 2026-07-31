import type { Metadata } from "next";
import { RetailRegisterForm } from "@/components/auth/RetailRegisterForm";
import { listAuthSideSlides } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Registrácia",
  description: "Vytvorte si zákaznícky účet PACIDEKOR.",
};

export default async function RetailRegisterPage() {
  const sideSlides = await listAuthSideSlides();
  return <RetailRegisterForm sideSlides={sideSlides} />;
}
