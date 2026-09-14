import type { Metadata } from "next";
import { AkciaSection } from "@/components/AkciaSection";
import { BenefitsBar } from "@/components/BenefitsBar";
import { BestsellerySection } from "@/components/BestsellerySection";
import { HeroBanner } from "@/components/HeroBanner";
import { NewsletterSection } from "@/components/NewsletterSection";
import { NovinkySection } from "@/components/NovinkySection";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
  image: "/banner2.webp",
});

export default function Home() {
  return (
    <main className="flex flex-1 flex-col py-6">
      <h1 className="sr-only">
        PACIDEKOR - veľkoobchod a maloobchod s umelými kvetmi, dekoráciami a
        aranžérskym materiálom
      </h1>
      <HeroBanner />
      <NovinkySection />
      <BenefitsBar />
      <AkciaSection />
      <BestsellerySection />
      <NewsletterSection />
    </main>
  );
}
