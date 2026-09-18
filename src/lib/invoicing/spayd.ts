/**
 * SPAYD (Short Payment Descriptor) pre QR Platba — SK/CZ banky.
 * https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 */
export function buildSpaydString(input: {
  iban: string;
  amountEur: number;
  variableSymbol: string;
  message?: string;
  currency?: string;
}) {
  const iban = input.iban.replace(/\s+/g, "").toUpperCase();
  const amount = Math.max(0, input.amountEur).toFixed(2);
  const vs = input.variableSymbol.replace(/\D/g, "").slice(0, 10);
  const msg = (input.message ?? "").replace(/[*\n\r]/g, " ").trim().slice(0, 60);
  const currency = input.currency ?? "EUR";

  const parts = [
    "SPD*1.0",
    `ACC:${iban}`,
    `AM:${amount}`,
    `CC:${currency}`,
  ];
  if (vs) parts.push(`X-VS:${vs}`);
  if (msg) parts.push(`MSG:${msg}`);
  return parts.join("*");
}
