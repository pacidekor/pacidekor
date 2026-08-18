import "server-only";

import sharp from "sharp";

/** Max long edge – same as scripts/process-paci-kvety.mjs */
const MAX_EDGE = 1800;
/** Squoosh-like quality: small files, still sharp on product cards */
const WEBP_QUALITY = 82;

export type CompressedProductImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
  bytesIn: number;
  bytesOut: number;
};

/**
 * Normalize EXIF orientation, downscale, convert to WebP.
 * Used by all admin image uploads (products, categories, blog).
 */
export async function compressProductImage(
  input: Buffer | Uint8Array,
): Promise<CompressedProductImage> {
  const bytesIn = input.byteLength;
  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    contentType: "image/webp",
    extension: "webp",
    width: info.width,
    height: info.height,
    bytesIn,
    bytesOut: data.byteLength,
  };
}
