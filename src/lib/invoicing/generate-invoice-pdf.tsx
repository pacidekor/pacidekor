import "server-only";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/lib/invoicing/invoice-pdf";
import { loadInvoiceLogoDataUrl } from "@/lib/invoicing/invoice-logo";
import { registerInvoicePdfFonts } from "@/lib/invoicing/register-pdf-fonts";
import type { InvoicePdfData } from "@/lib/invoicing/types";

export async function generateInvoicePdfBuffer(
  data: InvoicePdfData,
): Promise<Buffer> {
  registerInvoicePdfFonts();

  const logoDataUrl =
    data.logoDataUrl !== undefined
      ? data.logoDataUrl
      : await loadInvoiceLogoDataUrl();

  const payload: InvoicePdfData = {
    ...data,
    logoDataUrl,
  };

  const buffer = await renderToBuffer(
    (<InvoicePdfDocument data={payload} />) as Parameters<
      typeof renderToBuffer
    >[0],
  );
  return Buffer.from(buffer);
}
