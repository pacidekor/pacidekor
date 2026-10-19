/**
 * Read env on Node/Vercel (`process.env`) and optionally Cloudflare Workers
 * (`getCloudflareContext().env`). Never load OpenNext on Vercel.
 *
 * OpenNext copies Worker vars/secrets into `process.env` on the first request,
 * but Server Actions can still miss them if sync context is empty — use
 * `ensureCloudflareEnv()` / `getRuntimeEnvAsync()` before reading secrets.
 */

function readProcessEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function readEnvRecord(
  env: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Copy string bindings from Cloudflare `env` into `process.env` (idempotent).
 * Safe no-op on Vercel / local Node without OpenNext.
 */
export async function ensureCloudflareEnv(): Promise<void> {
  if (process.env.VERCEL) return;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    // async:true is required in Server Actions / some RSC paths
    const { env } = await getCloudflareContext({ async: true });
    for (const [key, value] of Object.entries(env ?? {})) {
      if (typeof value === "string" && value.length > 0) {
        process.env[key] ??= value;
      }
    }
  } catch {
    // Not on OpenNext / CF, or context unavailable
  }
}

export function getRuntimeEnv(name: string): string | undefined {
  const fromProcess = readProcessEnv(name);
  if (fromProcess) return fromProcess;

  if (process.env.VERCEL) return undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: (opts?: { async?: boolean }) => {
        env?: Record<string, unknown>;
      };
    };
    return readEnvRecord(getCloudflareContext().env, name);
  } catch {
    return undefined;
  }
}

/** Prefer this in Server Actions / async server code on Cloudflare. */
export async function getRuntimeEnvAsync(
  name: string,
): Promise<string | undefined> {
  const existing = readProcessEnv(name);
  if (existing) return existing;

  await ensureCloudflareEnv();
  return readProcessEnv(name) || getRuntimeEnv(name);
}
