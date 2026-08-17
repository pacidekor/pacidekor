import { notFound } from "next/navigation";
import { EmailPreviewStudio } from "@/components/dev/EmailPreviewStudio";
import { getNewsletterCatalogProducts } from "@/lib/emails/newsletter-data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "E-mail preview | Dev",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ id?: string }>;

export default async function DevEmailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const params = await searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const defaultTestTo = process.env.BREVO_TEST_TO?.trim() ?? "";
  const newsletter = await getNewsletterCatalogProducts(siteUrl);

  return (
    <main className="flex min-h-full flex-1 flex-col bg-[#faf8f5] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#75825B] uppercase">
              Localhost · Dev only
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
              E-mail preview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#2f2924]/60 sm:text-base">
              Náhľad e-mailových šablón a odoslanie testovacieho e-mailu cez
              Brevo. Newsletter berie aktuálne novinky a akcie z katalógu.
            </p>
          </div>
          <p className="rounded-full bg-[#e8ebe2] px-3 py-1 text-xs font-medium text-[#5a6648]">
            NODE_ENV=development
          </p>
        </div>

        <EmailPreviewStudio
          siteUrl={siteUrl}
          initialId={params.id}
          defaultTestTo={defaultTestTo}
          newsletter={newsletter}
        />
      </div>
    </main>
  );
}
