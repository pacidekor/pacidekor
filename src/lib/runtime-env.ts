/**
 * Read env on Node/Vercel (`process.env`) and Cloudflare Workers
 * (`getCloudflareContext().env`) — dashboard secrets often land only on `env`.
 */
export function getRuntimeEnv(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;

  try {
    // Lazy require so local/Vercel builds don't hard-depend on CF at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: () => { env?: Record<string, unknown> };
    };
    const value = getCloudflareContext().env?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Not running in OpenNext/CF request context
  }

  return undefined;
}
