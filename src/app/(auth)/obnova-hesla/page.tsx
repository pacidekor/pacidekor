import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { listAuthSideSlides } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Nové heslo",
  description: "Nastavenie nového hesla k účtu PACIDEKOR.",
};

export default async function ResetPasswordPage() {
  const sideSlides = await listAuthSideSlides();
  return <ResetPasswordForm sideSlides={sideSlides} />;
}
