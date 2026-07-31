import type { Metadata } from "next";
import { WholesaleLoginForm } from "@/components/auth/WholesaleLoginForm";
import { listAuthSideSlides } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Prihlásenie – veľkoobchod",
};

export default async function WholesaleLoginPage() {
  const sideSlides = await listAuthSideSlides();
  return <WholesaleLoginForm sideSlides={sideSlides} />;
}
