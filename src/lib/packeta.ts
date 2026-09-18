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
  const street = point.street?.trim() || "";
  const city = point.city?.trim() || "";
  const address = [street, city].filter(Boolean).join(", ");

  // Avoid "Z-BOX · Z-BOX Foo, Street — Street, City" (widget often puts address in name).
  const titleLooksLikeAddress =
    Boolean(street) &&
    (title.includes(street) ||
      (city ? title.toLowerCase().includes(city.toLowerCase()) : false));

  if (point.group === "zbox") {
    const headed = title.toLowerCase().startsWith("z-box")
      ? title
      : `Z-BOX · ${title}`;
    if (!address || titleLooksLikeAddress) return headed;
    return `${headed}, ${address}`;
  }

  if (!address || titleLooksLikeAddress) return title;
  return `${title}, ${address}`;
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
