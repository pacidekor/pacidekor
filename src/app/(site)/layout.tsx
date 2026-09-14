import { AccountDataSync } from "@/components/AccountDataSync";
import { ChatFab } from "@/components/ChatFab";
import { ConstructionNoticeModal } from "@/components/ConstructionNoticeModal";
import { CookieConsent } from "@/components/cookies/CookieConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { NavBar } from "@/components/NavBar";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { listTaxonomy } from "@/lib/categories-server";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, discounts, taxonomy] = await Promise.all([
    listProducts(),
    listDiscounts(),
    listTaxonomy(),
  ]);

  return (
    <ProductCatalogProvider
      products={products}
      discounts={discounts}
      taxonomy={taxonomy}
    >
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <AccountDataSync />
      <ScrollToTop />
      <div className="md:sticky md:top-0 md:z-50">
        <Header />
        <NavBar />
      </div>
      <div className="mx-auto flex w-[var(--content-width)] flex-1 flex-col">
        {children}
      </div>
      <Footer />
      <ChatFab />
      <CookieConsent />
      <ConstructionNoticeModal />
    </ProductCatalogProvider>
  );
}
