import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { getEmailPreviewById } from "@/lib/emails/catalog";
import { getNewsletterCatalogProducts } from "@/lib/emails/newsletter-data";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Raw HTML preview jednej šablóny.
 * Dev: /emails/preview/welcome-retail
 */
export async function GET(request: Request, context: RouteContext) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { id } = await context.params;
  const definition = getEmailPreviewById(id);
  if (!definition) {
    return new NextResponse("Email template not found", { status: 404 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const newsletter =
    definition.id === "newsletter"
      ? await getNewsletterCatalogProducts(siteUrl)
      : undefined;
  const email = definition.build(siteUrl, { newsletter });

  return new NextResponse(email.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Email-Subject": email.subject,
    },
  });
}
