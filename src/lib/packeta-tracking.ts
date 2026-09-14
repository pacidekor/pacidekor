import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { OrderStatus } from "@/lib/orders";

/**
 * Packeta push-tracking status codes:
 * https://docs.packeta.com/docs/packet-tracking/status-codes
 */
export const PACKETA_STATUS = {
  receivedData: 1,
  arrived: 2,
  preparedForDeparture: 3,
  departed: 4,
  readyForPickup: 5,
  handedToCarrier: 6,
  delivered: 7,
  collected: 12,
} as const;

/** Zásielka je v sieti Packetý / u dopravcu. */
const HANDED_OVER_CODES = new Set<number>([
  PACKETA_STATUS.arrived,
  PACKETA_STATUS.preparedForDeparture,
  PACKETA_STATUS.departed,
  PACKETA_STATUS.handedToCarrier,
  PACKETA_STATUS.collected,
]);

/** Zásielka doručená / pripravená na výdajnom mieste. */
const DELIVERED_CODES = new Set<number>([
  PACKETA_STATUS.readyForPickup,
  PACKETA_STATUS.delivered,
]);

const STATUS_RANK: Record<OrderStatus, number> = {
  nova: 10,
  nezaplatena: 10,
  zaplatena: 20,
  pripravuje_sa: 30,
  pripravena_na_odoslanie: 40,
  predana_dopravcovi: 50,
  dorucena: 60,
  stornovana: 0,
};

export type PacketaWebhookEvent = {
  packetId: string | null;
  barcode: string | null;
  statusCode: number | null;
  codeText: string | null;
  statusText: string | null;
  eventId: string | null;
  dateTime: string | null;
};

export function mapPacketaStatusToOrderStatus(
  statusCode: number,
): Extract<OrderStatus, "predana_dopravcovi" | "dorucena"> | null {
  if (DELIVERED_CODES.has(statusCode)) return "dorucena";
  if (HANDED_OVER_CODES.has(statusCode)) return "predana_dopravcovi";
  return null;
}

/** Only advance forward — never regress (except ignore storno). */
export function canAdvanceOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
): boolean {
  if (current === "stornovana") return false;
  if (next === "stornovana") return true;
  return STATUS_RANK[next] > STATUS_RANK[current];
}

export function statusAfterLabelPrint(
  current: OrderStatus,
): "pripravena_na_odoslanie" | null {
  if (canAdvanceOrderStatus(current, "pripravena_na_odoslanie")) {
    return "pripravena_na_odoslanie";
  }
  return null;
}

export function verifyPacketaWebhookSignature(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  signingKey: string;
  toleranceSeconds?: number;
}): boolean {
  const { rawBody, timestamp, signature, signingKey } = input;
  if (!timestamp?.trim() || !signature?.trim() || !signingKey.trim()) {
    return false;
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  const tolerance = input.toleranceSeconds ?? 300;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > tolerance) return false;

  const expected = createHmac("sha256", signingKey)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signature.trim(), "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function readNumber(
  record: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function parsePacketaWebhookPayload(
  rawBody: string,
): PacketaWebhookEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  const root = asRecord(parsed);
  if (!root) return null;

  // Some Packeta payloads nest under `data` / `packet`.
  const nested =
    asRecord(root.data) ??
    asRecord(root.packet) ??
    asRecord(root.payload) ??
    root;

  return {
    packetId: readString(
      nested,
      "packetId",
      "packet_id",
      "id",
      "packetID",
    ),
    barcode: readString(nested, "barcode", "Barcode"),
    statusCode: readNumber(nested, "statusCode", "status_code", "code"),
    codeText: readString(nested, "codeText", "code_text"),
    statusText: readString(nested, "statusText", "status_text"),
    eventId: readString(nested, "eventId", "event_id", "id"),
    dateTime: readString(nested, "dateTime", "date_time", "datetime"),
  };
}
