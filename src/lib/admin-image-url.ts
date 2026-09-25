/**
 * Admin preview URLs — never replace the original in DB/storage.
 * Uses Supabase image render endpoint for small on-the-fly thumbs.
 */

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

export function adminImageThumbUrl(
  src: string,
  width = 160,
  quality = 55,
): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (src.startsWith("/")) return src;

  try {
    const url = new URL(src);
    if (!url.hostname.includes("supabase.co")) return src;

    let path = url.pathname;
    if (path.includes(OBJECT_PUBLIC)) {
      path = path.replace(OBJECT_PUBLIC, RENDER_PUBLIC);
    } else if (!path.includes(RENDER_PUBLIC)) {
      return src;
    }

    url.pathname = path;
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(width));
    url.searchParams.set("resize", "cover");
    url.searchParams.set("quality", String(quality));
    return url.toString();
  } catch {
    return src;
  }
}
