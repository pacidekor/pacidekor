import "server-only";

import { getMediaBaseUrl } from "@/lib/media-url";

export type ProductImagesBucket = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  delete: (keys: string | string[]) => Promise<unknown>;
};

/** R2 binding from Worker, or null on Vercel / before setup. */
export async function getProductImagesBucket(): Promise<ProductImagesBucket | null> {
  if (process.env.VERCEL) return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (env as { PRODUCT_IMAGES?: ProductImagesBucket })
      ?.PRODUCT_IMAGES;
    return bucket ?? null;
  } catch {
    return null;
  }
}

export function publicUrlForProductImageKey(key: string): string {
  const base = getMediaBaseUrl();
  if (!base) {
    throw new Error("NEXT_PUBLIC_MEDIA_BASE_URL is not set");
  }
  return `${base}/${key.replace(/^\//, "")}`;
}

export async function deleteProductImageKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const bucket = await getProductImagesBucket();
  if (!bucket) return;
  await bucket.delete(keys);
}
