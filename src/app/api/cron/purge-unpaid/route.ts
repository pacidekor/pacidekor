import { NextResponse } from "next/server";
import { purgeUnpaidOrdersOlderThan24h } from "@/lib/purge-unpaid-orders";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Každú hodinu: zmaže nezaplatené GoPay objednávky staršie ako 24 h.
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await purgeUnpaidOrdersOlderThan24h();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("cron purge-unpaid:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Purge unpaid cron failed",
      },
      { status: 500 },
    );
  }
}
