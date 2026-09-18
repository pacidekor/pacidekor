import { NextResponse } from "next/server";
import { sendBirthdayEmailsForToday } from "@/lib/birthday-emails";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Denný cron: narodeninové e-maily + jednorazový promo kód.
 * Vercel: Authorization Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await sendBirthdayEmailsForToday();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("cron birthday:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Birthday cron failed",
      },
      { status: 500 },
    );
  }
}
