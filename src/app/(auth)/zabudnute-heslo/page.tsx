import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { listAuthSideSlides } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Zabudnuté heslo",
  description: "Obnova hesla k účtu PACIDEKOR.",
  path: "/zabudnute-heslo",
  noIndex: true,
});

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string; odkaz?: string }>;
}) {
  const params = await searchParams;
  const accountType =
    params.typ === "velkoobchod" ? "velkoobchod" : "maloobchod";
  const invalidLink = params.odkaz === "neplatny";
  const sideSlides = await listAuthSideSlides();

  return (
    <ForgotPasswordForm
      sideSlides={sideSlides}
      accountType={accountType}
      invalidLink={invalidLink}
    />
  );
}
