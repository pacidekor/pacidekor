import type { Metadata } from "next";
import { WholesaleLoginForm } from "@/components/auth/WholesaleLoginForm";
import { listAuthSideSlides } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Prihlásenie - veľkoobchod",
  description: "Prihlásenie do veľkoobchodného účtu PACIDEKOR.",
  path: "/prihlasenie/velkoobchod",
  noIndex: true,
});

export default async function WholesaleLoginPage() {
  const sideSlides = await listAuthSideSlides();
  return <WholesaleLoginForm sideSlides={sideSlides} />;
}
