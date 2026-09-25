import { NextResponse } from "next/server";
import { getOrderByNumberFromDb } from "@/lib/orders.server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdminApi() {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const ok = await requireAdminApi();
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Nie ste prihlásený." },
      { status: 401 },
    );
  }

  const { orderNumber } = await context.params;
  const decoded = decodeURIComponent(orderNumber || "").trim();
  if (!decoded) {
    return NextResponse.json(
      { ok: false, error: "Chýba číslo objednávky." },
      { status: 400 },
    );
  }

  try {
    const order = await getOrderByNumberFromDb(decoded);
    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Objednávka sa nenašla." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    console.error("GET /api/admin/orders/[orderNumber]", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Načítanie objednávky zlyhalo.",
      },
      { status: 500 },
    );
  }
}
