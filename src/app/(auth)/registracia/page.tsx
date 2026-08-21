import type { Metadata } from "next";
import { RetailRegisterForm } from "@/components/auth/RetailRegisterForm";
import { listAuthSideSlides } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Registrácia",
  description: "Vytvorte si zákaznícky účet PACIDEKOR.",
  path: "/registracia",
  noIndex: true,
});

export default async function RetailRegisterPage() {
  const sideSlides = await listAuthSideSlides();
  return <RetailRegisterForm sideSlides={sideSlides} />;
}
