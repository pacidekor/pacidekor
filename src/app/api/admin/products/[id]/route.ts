import { NextResponse } from "next/server";
import { getProductById } from "@/lib/products-server";
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
  context: { params: Promise<{ id: string }> },
) {
  const ok = await requireAdminApi();
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Nie ste prihlásený." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Chýba ID produktu." },
      { status: 400 },
    );
  }

  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Produkt sa nenašiel." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: product });
}
