import type { Metadata } from "next";
import { WholesaleLoginForm } from "@/components/auth/WholesaleLoginForm";

export const metadata: Metadata = {
  title: "Prihlásenie veľkoobchod",
  description: "Prihlásenie do veľkoobchodného účtu PACIDEKOR.",
};

export default function WholesaleLoginPage() {
  return <WholesaleLoginForm />;
}
