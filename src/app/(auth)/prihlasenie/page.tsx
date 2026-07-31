import type { Metadata } from "next";
import { RetailLoginForm } from "@/components/auth/RetailLoginForm";
import { listAuthSideSlides } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Prihlásenie",
  description: "Prihlásenie do zákazníckeho účtu PACIDEKOR.",
};

export default async function RetailLoginPage() {
  const sideSlides = await listAuthSideSlides();
  return <RetailLoginForm sideSlides={sideSlides} />;
}
