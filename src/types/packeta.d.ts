/** Packeta widget v6 — https://docs.packeta.com/cs/docs/pudo-delivery/widget */

export type PacketaGpsCoordinates = {
  lat: number;
  lon: number;
};

export type PacketaPoint = {
  id?: string;
  name?: string;
  country?: string;
  place?: string;
  special?: string;
  street?: string;
  city?: string;
  zip?: string;
  gps?: PacketaGpsCoordinates;
  group?: string;
  externalId?: string;
  carrierId?: string;
  carrierPickupPointId?: string;
  pickupPointType?: "internal" | "external";
};

export type PacketaWidgetOptions = {
  webUrl?: string;
  appIdentity?: string;
  country?: string;
  language?: string;
  vendors?: Array<{
    carrierId?: string;
    country?: string;
    group?: string;
  }>;
};

type PacketaWidget = {
  pick: (
    apiKey: string,
    callback: (point: PacketaPoint | null) => void,
    options?: PacketaWidgetOptions,
    inElement?: HTMLElement | null,
  ) => void;
  close: () => void;
};

declare global {
  interface Window {
    Packeta?: {
      Widget: PacketaWidget;
    };
  }
}

export {};
