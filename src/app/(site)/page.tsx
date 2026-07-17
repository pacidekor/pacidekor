import type { Metadata } from "next";
import { AkciaSection } from "@/components/AkciaSection";
import { BenefitsBar } from "@/components/BenefitsBar";
import { HeroBanner } from "@/components/HeroBanner";
import { NewsletterSection } from "@/components/NewsletterSection";
import { NovinkySection } from "@/components/NovinkySection";

export const metadata: Metadata = {
  title: {
    absolute: "PACIDEKOR | Veľkoobchod a dodávateľ kvetov",
  },
  description:
    "Veľkoobchod a dodávateľ umelých kvetov, dekorácií a aranžérskeho materiálu. Kvalita a inšpirácia pre floristov aj firmy.",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col py-6">
      <HeroBanner />
      <NovinkySection />
      <BenefitsBar />
      <AkciaSection />
      <NewsletterSection />
    </main>
  );
}
