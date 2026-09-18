import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { generateInvoicePdfBuffer } from "@/lib/invoicing/generate-invoice-pdf";
import { buildSampleInvoicePdfData } from "@/lib/invoicing/sample-invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ variant: string }>;
};

/** Dev-only PDF preview: /dev/invoices/paid.pdf alebo /dev/invoices/cod.pdf */
export async function GET(_request: Request, context: RouteContext) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { variant: raw } = await context.params;
  const key = raw.replace(/\.pdf$/i, "").toLowerCase();
  if (key !== "paid" && key !== "cod") {
    return NextResponse.json(
      { error: "Použi paid alebo cod." },
      { status: 404 },
    );
  }

  const data = buildSampleInvoicePdfData(key);
  const pdf = await generateInvoicePdfBuffer(data);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="preview-${key}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
