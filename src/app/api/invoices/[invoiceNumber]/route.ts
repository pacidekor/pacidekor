import { NextResponse } from "next/server";
import {
  getInvoiceByNumber,
  renderInvoicePdf,
  verifyInvoiceViewToken,
} from "@/lib/invoicing/order-invoice";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ invoiceNumber: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { invoiceNumber: raw } = await context.params;
  const invoiceNumber = decodeURIComponent(raw || "").trim();
  const token = new URL(request.url).searchParams.get("t") || "";

  if (!invoiceNumber || !verifyInvoiceViewToken(invoiceNumber, token)) {
    return NextResponse.json({ error: "Neplatný odkaz." }, { status: 403 });
  }

  try {
    const invoice = await getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return NextResponse.json({ error: "Faktúra neexistuje." }, { status: 404 });
    }

    const pdf = await renderInvoicePdf(invoice);
    const filename = `${invoice.invoice_number}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/invoices:", error);
    return NextResponse.json(
      { error: "Faktúru sa nepodarilo vygenerovať." },
      { status: 500 },
    );
  }
}
