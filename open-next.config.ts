import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

// ISR for PDP/catalog. Without a cache backend every /produkt/* fully SSR
// and intermittently hits Cloudflare Error 1102 (CPU/memory limits).
// Switch to R2 later when product images also move to R2.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
