import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { listAuthSideSlides } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Nové heslo",
  description: "Nastavenie nového hesla k účtu PACIDEKOR.",
  path: "/obnova-hesla",
  noIndex: true,
});

export default async function ResetPasswordPage() {
  const sideSlides = await listAuthSideSlides();
  return <ResetPasswordForm sideSlides={sideSlides} />;
}
