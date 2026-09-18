import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterUnsubscribeForm } from "@/components/newsletter/NewsletterUnsubscribeForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Odhlásenie z newslettera",
  description: "Potvrdenie odhlásenia z newslettera PACIDEKOR.",
  path: "/odhlasenie-newsletter",
  noIndex: true,
});

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; t?: string }>;
}) {
  const params = await searchParams;
  const email = params.email?.trim() || undefined;
  const token = params.t?.trim() || undefined;

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Odhlásenie z newslettera</span>
      </nav>

      <NewsletterUnsubscribeForm email={email} token={token} />
    </main>
  );
}
