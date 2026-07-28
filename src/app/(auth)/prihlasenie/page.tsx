import type { Metadata } from "next";
import { RetailLoginForm } from "@/components/auth/RetailLoginForm";

export const metadata: Metadata = {
  title: "Prihlásenie",
  description: "Prihlásenie do zákazníckeho účtu PACIDEKOR.",
};

export default function RetailLoginPage() {
  return <RetailLoginForm />;
}
