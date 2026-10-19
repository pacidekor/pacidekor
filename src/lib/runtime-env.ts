/**
 * Read env on Node/Vercel (`process.env`) and optionally Cloudflare Workers
 * (`getCloudflareContext().env`). Never load OpenNext on Vercel.
 */
export function getRuntimeEnv(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;

  // Vercel / local Node — only process.env
  if (process.env.VERCEL || process.env.NEXT_RUNTIME === "edge") {
    return undefined;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: () => { env?: Record<string, unknown> };
    };
    const value = getCloudflareContext().env?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Not on OpenNext / CF
  }

  return undefined;
}
