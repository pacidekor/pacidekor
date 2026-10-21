import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProductImagesBucket,
  publicUrlForProductImageKey,
} from "@/lib/r2-product-images";
import { isMediaCdnEnabled } from "@/lib/media-url";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

async function requireAdmin() {
  const supabase = await createClient("admin");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nie ste prihlásený.", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nie ste administrátor.", status: 403 };
  }

  return { ok: true as const, userId: user.id };
}

export async function POST(request: Request) {
  if (!isMediaCdnEnabled()) {
    return NextResponse.json(
      { ok: false, error: "R2 media CDN nie je zapnuté (NEXT_PUBLIC_MEDIA_BASE_URL)." },
      { status: 503 },
    );
  }

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const bucket = await getProductImagesBucket();
  if (!bucket) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "R2 binding PRODUCT_IMAGES nie je dostupný. Spusťte cf:setup-r2 a redeploy Worker.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Chýba súbor." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Obrázok je prázdny alebo príliš veľký (max. 10 MB)." },
      { status: 400 },
    );
  }

  const type = file.type || "image/webp";
  const ext =
    type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  const key = `${auth.userId}/${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const url = publicUrlForProductImageKey(key);
  return NextResponse.json({ ok: true, url, key });
}
