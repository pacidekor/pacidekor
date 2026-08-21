import type { Metadata } from "next";
import { RetailLoginForm } from "@/components/auth/RetailLoginForm";
import { listAuthSideSlides } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Prihlásenie",
  description: "Prihlásenie do zákazníckeho účtu PACIDEKOR.",
  path: "/prihlasenie",
  noIndex: true,
});

export default async function RetailLoginPage() {
  const sideSlides = await listAuthSideSlides();
  return <RetailLoginForm sideSlides={sideSlides} />;
}
