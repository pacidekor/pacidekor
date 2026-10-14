import type { Metadata } from "next";
import { AkciaSection } from "@/components/AkciaSection";
import { BenefitsBar } from "@/components/BenefitsBar";
import { BestsellerySection } from "@/components/BestsellerySection";
import { HeroBanner } from "@/components/HeroBanner";
import { NewsletterSection } from "@/components/NewsletterSection";
import { NovinkySection } from "@/components/NovinkySection";
import { listPricedProducts } from "@/lib/products-server";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/seo";

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
  image: "/banner2.webp",
});

export default async function Home() {
  // One priced catalog for homepage sections (shares React.cache with layout).
  const products = await listPricedProducts();

  return (
    <main className="flex flex-1 flex-col py-6">
      <h1 className="sr-only">
        PACIDEKOR - veľkoobchod a maloobchod s umelými kvetmi, dekoráciami a
        aranžérskym materiálom
      </h1>
      <HeroBanner />
      <NovinkySection products={products} />
      <BenefitsBar />
      <AkciaSection />
      <BestsellerySection products={products} />
      <NewsletterSection />
    </main>
  );
}
