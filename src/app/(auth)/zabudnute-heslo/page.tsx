import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { listAuthSideSlides } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Zabudnuté heslo",
  description: "Obnova hesla k účtu PACIDEKOR.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string }>;
}) {
  const params = await searchParams;
  const accountType =
    params.typ === "velkoobchod" ? "velkoobchod" : "maloobchod";
  const sideSlides = await listAuthSideSlides();

  return (
    <ForgotPasswordForm sideSlides={sideSlides} accountType={accountType} />
  );
}
