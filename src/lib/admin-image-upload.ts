"use client";

import { compressImageInBrowser } from "@/lib/compress-image-client";
import { createAdminClient } from "@/lib/supabase/client";

/** Bucket / upload size limit. */
const MAX_BYTES = 10 * 1024 * 1024;

export type AdminImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function mediaCdnEnabled(): boolean {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim(),
  );
}

async function uploadToR2(file: File): Promise<AdminImageUploadResult> {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/admin/product-image", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; url: string }
    | { ok: false; error?: string }
    | null;
  if (!res.ok || !json || json.ok !== true) {
    return {
      ok: false,
      error:
        (json && "error" in json && json.error) ||
        `Nahrávanie na R2 zlyhalo (${res.status}).`,
    };
  }
  return { ok: true, url: json.url };
}

async function uploadToSupabase(file: File): Promise<AdminImageUploadResult> {
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
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, {
      contentType: file.type || "image/webp",
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

/**
 * Compress in the browser, then upload to R2 (when media CDN env is set)
 * or Supabase Storage. Files never pass through Server Actions (4.5 MB cap).
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

    if (mediaCdnEnabled()) {
      return uploadToR2(toUpload);
    }

    return uploadToSupabase(toUpload);
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
