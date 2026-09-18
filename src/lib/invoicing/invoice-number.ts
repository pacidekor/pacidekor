import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

/** FA-2026-0001 → VS 20260001 */
export function invoiceNumberToVariableSymbol(invoiceNumber: string) {
  const digits = invoiceNumber.replace(/\D/g, "");
  return digits || invoiceNumber;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("next_invoice_number");
  if (error || !data) {
    throw new Error(error?.message ?? "Nepodarilo sa vygenerovať číslo faktúry.");
  }
  return String(data);
}
