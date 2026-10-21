/**
 * Public product-image CDN: media.pacidekor.sk/{objectKey}
 * Serves objects from R2 pacidekor-product-images (same keys as Supabase Storage).
 */
export interface Env {
  PRODUCT_IMAGES: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (!key || key.endsWith("/")) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await env.PRODUCT_IMAGES.get(key);
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set(
      "cache-control",
      headers.get("cache-control") || "public, max-age=31536000, immutable",
    );
    headers.set("access-control-allow-origin", "*");

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(object.body, { status: 200, headers });
  },
};
