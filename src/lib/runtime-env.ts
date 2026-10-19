/**
 * Read env on Node/Vercel (`process.env`) and optionally Cloudflare Workers
 * (`getCloudflareContext().env`). Never load OpenNext on Vercel.
 *
 * Note: do NOT skip on NEXT_RUNTIME=edge — OpenNext on CF may set that, and
 * Worker Variables still live on getCloudflareContext().env.
 */
export function getRuntimeEnv(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;

  // Vercel — only process.env (OpenNext must not load there)
  if (process.env.VERCEL) {
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
