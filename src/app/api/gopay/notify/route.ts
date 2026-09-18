import { NextResponse } from "next/server";
import { syncOrderPaidFromGopayPayment } from "@/lib/gopay-orders";

export const runtime = "nodejs";

/**
 * GoPay async notification — GET with ?id={paymentId}
 * https://doc.gopay.com/
 */
export async function GET(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("id")?.trim();
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  try {
    const result = await syncOrderPaidFromGopayPayment(paymentId, {
      revalidate: true,
    });
    return NextResponse.json({
      ok: true,
      orderNumber: result.orderNumber,
      state: result.state,
      markedPaid: result.markedPaid,
    });
  } catch (error) {
    console.error("gopay notify:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Notify failed",
      },
      { status: 500 },
    );
  }
}
