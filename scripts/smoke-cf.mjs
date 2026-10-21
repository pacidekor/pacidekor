/** Quick smoke against Cloudflare workers.dev (or SMOKE_BASE_URL). */
const base = (process.env.SMOKE_BASE_URL || "https://pacidekor.tomas-8a7.workers.dev").replace(
  /\/$/,
  "",
);

async function check(path, opts = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  const text = opts.body ? await res.text() : null;
  return { path, status: res.status, ok: res.ok, len: text?.length ?? null };
}

async function main() {
  const results = [];
  for (const path of ["/", "/api/health/env", "/kosik", "/admin"]) {
    results.push(await check(path, { body: true }));
  }

  const home = await fetch(`${base}/`, { signal: AbortSignal.timeout(60_000) });
  const html = await home.text();
  const imgMatch = html.match(
    /https:\/\/[^"'\s]+\/storage\/v1\/object\/public\/product-images\/[^"'\s]+/,
  );
  let img = { path: "product-image", status: 0, ok: false, len: null };
  if (imgMatch) {
    const ir = await fetch(imgMatch[0], {
      method: "HEAD",
      signal: AbortSignal.timeout(30_000),
    });
    img = { path: "product-image", status: ir.status, ok: ir.ok, len: null };
  }
  results.push(img);

  for (const r of results) {
    console.log(`${r.ok ? "OK" : "FAIL"} ${r.status} ${r.path}${r.len != null ? ` (${r.len}b)` : ""}`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    process.exitCode = 1;
    console.error(`Smoke failed: ${failed.map((r) => r.path).join(", ")}`);
  } else {
    console.log(`Smoke OK against ${base}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
