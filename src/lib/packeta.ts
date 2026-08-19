import type { PacketaPoint } from "@/types/packeta";

export const PACKETA_WIDGET_SCRIPT_URL =
  "https://widget.packeta.com/v6/www/js/library.js";

export type PacketaWidgetConfig = {
  apiKey: string;
  language: string;
  country: string;
  webUrl: string;
  appIdentity: string;
};

export type PacketaPointSelection = {
  id: string;
  name: string;
};

export function getPacketaWidgetConfig(): PacketaWidgetConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_PACKETA_API_KEY?.trim() ?? "",
    language: process.env.NEXT_PUBLIC_PACKETA_WIDGET_LANGUAGE?.trim() || "sk",
    country: process.env.NEXT_PUBLIC_PACKETA_WIDGET_COUNTRY?.trim() || "sk",
    webUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "",
    appIdentity: "pacidekor-nextjs",
  };
}

export function resolvePacketaPointId(point: PacketaPoint): string {
  if (point.id) return String(point.id);
  if (point.externalId) return point.externalId;
  if (point.carrierId && point.carrierPickupPointId) {
    return `${point.carrierId}:${point.carrierPickupPointId}`;
  }
  return "";
}

export function formatPacketaPointLabel(point: PacketaPoint): string {
  const title = point.name?.trim() || point.place?.trim() || "Výdajné miesto";
  const address = [point.street, point.city].filter(Boolean).join(", ");

  if (point.group === "zbox") {
    return address ? `Z-BOX · ${title} — ${address}` : `Z-BOX · ${title}`;
  }

  return address ? `${title} — ${address}` : title;
}

export function toPacketaPointSelection(
  point: PacketaPoint,
): PacketaPointSelection | null {
  const id = resolvePacketaPointId(point);
  if (!id) return null;

  return {
    id,
    name: formatPacketaPointLabel(point),
  };
}
