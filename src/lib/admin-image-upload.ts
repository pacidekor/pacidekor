"use client";

import { compressImageInBrowser } from "@/lib/compress-image-client";
import { createAdminClient } from "@/lib/supabase/client";

/** Supabase bucket limit (product-images). */
const MAX_BYTES = 10 * 1024 * 1024;

export type AdminImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Compress in the browser, then upload straight to Supabase Storage with the
 * admin session. Files never pass through Vercel Server Actions (4.5 MB cap).
 */
export async function uploadCompressedAdminImage(
  file: File,
): Promise<AdminImageUploadResult> {
  try {
    const looksLikeImage =
      file.type.startsWith("image/") ||
      file.type === "" ||
      file.type === "application/octet-stream";
    if (!looksLikeImage) {
      return { ok: false, error: "Nahrajte obrázok (JPG, PNG, WEBP…)." };
    }

    let toUpload: File;
    try {
      toUpload = await compressImageInBrowser(file);
    } catch {
      if (file.size > MAX_BYTES) {
        return {
          ok: false,
          error:
            "Obrázok sa nepodarilo zmenšiť a je príliš veľký. Skúste menší súbor alebo iný formát (JPG/PNG).",
        };
      }
      toUpload = file;
    }

    if (toUpload.size === 0) {
      return { ok: false, error: "Súbor obrázka je prázdny." };
    }

    if (toUpload.size > MAX_BYTES) {
      return {
        ok: false,
        error: "Obrázok je príliš veľký (max. 10 MB). Skúste menší súbor.",
      };
    }

    const supabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Nie ste prihlásený." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return { ok: false, error: "Nemáte oprávnenie administrátora." };
    }

    const ext =
      toUpload.type === "image/jpeg"
        ? "jpg"
        : toUpload.type === "image/png"
          ? "png"
          : "webp";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, toUpload, {
        contentType: toUpload.type || "image/webp",
        upsert: false,
        cacheControl: "31536000",
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (error) {
    console.error("uploadCompressedAdminImage", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Nahrávanie obrázka zlyhalo. Skúste to znova.",
    };
  }
}
