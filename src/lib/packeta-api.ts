import "server-only";

const PACKETA_REST_URL = "https://www.zasilkovna.cz/api/rest";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parsePacketaFault(text: string) {
  const faultCode =
    text.match(/<status>fault<\/status>\s*<fault>([^<]+)<\/fault>/i)?.[1]?.trim() ??
    text.match(/<fault>(PacketAttributesFault|PacketIdFault|PacketIdsFault|NotSupportedFault|SenderNotExists|UnknownError|[^<]+)<\/fault>/i)?.[1]?.trim();

  const details: string[] = [];
  const detailPattern =
    /<fault>\s*<name>([^<]*)<\/name>\s*<fault>([^<]+)<\/fault>\s*<\/fault>/gi;
  let match: RegExpExecArray | null;
  while ((match = detailPattern.exec(text)) !== null) {
    const field = match[1]?.trim();
    const message = match[2]?.trim();
    if (!message) continue;
    details.push(field ? `${field}: ${message}` : message);
  }

  const summary = text.match(/<string>([^<]+)<\/string>/i)?.[1]?.trim();
  const message = text.match(/<message>([^<]+)<\/message>/i)?.[1]?.trim();

  const parts = [
    faultCode,
    details.length > 0 ? details.join(" | ") : message || summary,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" — ");
  return "Packeta API vrátila chybu.";
}

function sanitizePacketaOrderNumber(orderNumber: string) {
  const normalized = orderNumber.replace(/[^0-9A-Za-z]/g, "");
  return normalized.slice(0, 36) || "order";
}

function sanitizePacketaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(0, 20);
}

function sanitizePacketaName(value: string) {
  return value.trim().slice(0, 32);
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { name: "Zákazník", surname: "." };
  }
  if (parts.length === 1) {
    return { name: parts[0], surname: "." };
  }
  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

async function packetaRequest(xmlBody: string) {
  const password = process.env.PACKETA_API_PASSWORD?.trim();
  if (!password) {
    throw new Error("Chýba PACKETA_API_PASSWORD.");
  }

  const response = await fetch(PACKETA_REST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml; charset=utf-8" },
    body: xmlBody,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Packeta API HTTP ${response.status}`);
  }

  const statusMatch = text.match(/<status>([^<]+)<\/status>/i);
  if (statusMatch?.[1]?.toLowerCase() !== "ok") {
    throw new Error(parsePacketaFault(text));
  }

  return text;
}

export type PacketaCreatePacketInput = {
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  company?: string;
  addressId: string;
  valueEur: number;
  codEur?: number;
  weightKg?: number;
  note?: string;
};

export async function createPacketaPacket(
  input: PacketaCreatePacketInput,
): Promise<{ packetId: string; barcode?: string }> {
  const password = process.env.PACKETA_API_PASSWORD?.trim();
  if (!password) {
    throw new Error("Chýba PACKETA_API_PASSWORD.");
  }

  const { name, surname } = splitName(input.customerName);
  const eshop = process.env.PACKETA_ESHOP_INDICATION?.trim() || "pacidekor.sk";
  const weight = Math.max(0.1, input.weightKg ?? 1).toFixed(2);
  const value = Math.max(0, input.valueEur).toFixed(2);
  const cod = Math.max(0, input.codEur ?? 0).toFixed(2);
  const orderNumber = sanitizePacketaOrderNumber(input.orderNumber);
  const phone = sanitizePacketaPhone(input.phone);

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<createPacket>
  <apiPassword>${escapeXml(password)}</apiPassword>
  <packetAttributes>
    <number>${escapeXml(orderNumber)}</number>
    <name>${escapeXml(sanitizePacketaName(name))}</name>
    <surname>${escapeXml(sanitizePacketaName(surname))}</surname>
    ${input.company ? `<company>${escapeXml(sanitizePacketaName(input.company))}</company>` : ""}
    <email>${escapeXml(input.email.trim())}</email>
    <phone>${escapeXml(phone)}</phone>
    <addressId>${escapeXml(input.addressId)}</addressId>
    <cod>${cod}</cod>
    <value>${value}</value>
    <currency>EUR</currency>
    <weight>${weight}</weight>
    <eshop>${escapeXml(eshop)}</eshop>
    ${input.note ? `<note>${escapeXml(input.note)}</note>` : ""}
  </packetAttributes>
</createPacket>`;

  const response = await packetaRequest(xml);
  const packetId = response.match(/<id>([^<]+)<\/id>/i)?.[1];
  if (!packetId) {
    throw new Error("Packeta nevrátila ID zásielky.");
  }

  const barcode = response.match(/<barcode>([^<]+)<\/barcode>/i)?.[1];
  return { packetId, barcode };
}

export async function fetchPacketaLabelPdfBase64(
  packetId: string,
): Promise<string> {
  const password = process.env.PACKETA_API_PASSWORD?.trim();
  if (!password) {
    throw new Error("Chýba PACKETA_API_PASSWORD.");
  }

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<packetLabelPdf>
  <apiPassword>${escapeXml(password)}</apiPassword>
  <packetId>${escapeXml(packetId)}</packetId>
  <format>A6 on A6</format>
  <offset>0</offset>
</packetLabelPdf>`;

  const response = await packetaRequest(xml);
  const base64 = response.match(/<result>([^<]+)<\/result>/i)?.[1];
  if (!base64) {
    throw new Error("Packeta nevrátila PDF štítok.");
  }
  return base64;
}
