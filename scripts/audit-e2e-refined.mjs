/**
 * Refined functional checks: color→image→cart, console/network with explicit noise log.
 * Usage: node scripts/audit-e2e-refined.mjs [baseUrl] [productSlug]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3460").replace(/\/$/, "");
const SLUG = process.argv[3] || "";
const outDir = path.join(process.cwd(), "tmp", "audit-e2e-refined");
fs.mkdirSync(outDir, { recursive: true });

function loadEnv() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    const k = t.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const NOISE_PATTERNS = [
  { id: "vercel-insights", test: (s) => s.includes("_vercel/insights") },
  {
    id: "rsc-aborted-nav",
    test: (s) =>
      (s.includes("ERR_ABORTED") && s.includes("_rsc=")) ||
      (s.includes("ERR_ABORTED") && /\/(kosik|produkt|kategorie)\b/.test(s)),
  },
  { id: "favicon", test: (s) => s.includes("favicon") },
  { id: "react-devtools", test: (s) => s.includes("Download the React DevTools") },
  {
    id: "generic-404-status-text",
    test: (s) =>
      s.includes("404 (Not Found)") &&
      (s.includes("_vercel") || s.includes("favicon") || s.includes(".map")),
  },
];

function classifyNoise(messages) {
  const filtered = [];
  const kept = [];
  for (const msg of messages) {
    const hit = NOISE_PATTERNS.find((p) => p.test(msg));
    if (hit) filtered.push({ pattern: hit.id, msg });
    else kept.push(msg);
  }
  return { filtered, kept };
}

function fileName(url) {
  if (!url) return null;
  try {
    return decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
  } catch {
    return String(url).split("/").pop() || null;
  }
}

async function fetchProductVariantPlan(slug) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const res = await fetch(
    `${url}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=id,slug,name,images,color_ids,color_image_map&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const rows = await res.json();
  const p = Array.isArray(rows) ? rows[0] : null;
  if (!p) return null;
  const imgs = p.images || [];
  const map = p.color_image_map || {};
  const colors = [];
  for (const colorId of p.color_ids || []) {
    const idxs = map[colorId];
    if (!Array.isArray(idxs) || !idxs.length) continue;
    const imageUrl = imgs[idxs[0]];
    if (!imageUrl) continue;
    colors.push({ colorId, imageUrl, file: fileName(imageUrl) });
  }
  const distinct = new Set(colors.map((c) => c.file));
  if (distinct.size < 2) return null;
  return { slug: p.slug, name: p.name, colors };
}

async function dismiss(page) {
  const cont = page.locator('button:has-text("Pokračovať na e-shop")').first();
  if (await cont.isVisible({ timeout: 1200 }).catch(() => false)) {
    await cont.click({ force: true });
    await page.waitForTimeout(300);
  }
  const accept = page.locator('button:has-text("Prijať")').first();
  if (await accept.isVisible({ timeout: 600 }).catch(() => false)) {
    await accept.click({ force: true });
  }
}

async function main() {
  const results = [];
  const record = (id, result, detail) => {
    results.push({ id, result, detail });
    console.log(`[${result}] ${id} — ${detail}`);
  };

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "sk-SK",
  });
  await ctx.addInitScript(() => {
    localStorage.setItem(
      "pacidekor-cookie-consent",
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        preferences: {
          necessary: true,
          functional: true,
          analytics: true,
          marketing: true,
        },
      }),
    );
  });

  const consoleMsgs = [];
  const failedReqs = [];
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleMsgs.push(m.text());
  });
  page.on("pageerror", (err) => {
    consoleMsgs.push(`pageerror: ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    failedReqs.push(
      `${req.failure()?.errorText ?? "fail"} ${req.url()}`,
    );
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedReqs.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });

  let slug = SLUG;
  let plan = slug ? await fetchProductVariantPlan(slug) : null;
  if (!plan) {
    // Prefer product with ≥2 distinct color primary photos
    const candidates = [
      "kytica-ruzi-36-cm",
      "jutova-stuha-s-bodkami",
      "hortenzia-na-stopke-2",
      "ihlicovita-protea",
      "rypsova-stuha-s-volanikom",
    ];
    for (const c of candidates) {
      plan = await fetchProductVariantPlan(c);
      if (plan) {
        slug = plan.slug;
        break;
      }
    }
  }
  if (!plan || !slug) {
    record(
      "color-variant-switch",
      "BLOCKED",
      "no product with ≥2 distinct color_image_map primaries",
    );
  } else {
    const colorA = plan.colors[0];
    const colorB = plan.colors[1];

    await page.goto(`${BASE}/produkt/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await dismiss(page);

    // Visible purchase pills only (exclude aria-hidden measure row + card swatches)
    const pills = page.locator(
      'p:text-is("Farba") ~ div div.flex.flex-wrap.gap-2 > button[aria-pressed]',
    );
    const pillCount = await pills.count();

    if (pillCount < 2) {
      record(
        "color-variant-switch",
        "BLOCKED",
        `product ${slug} has <2 color swatch pills (${pillCount})`,
      );
    } else {
      // Gallery loop clones sit first in DOM; real slide has product alt text
      const mainImg = page
        .locator(`main img[alt="${plan.name}"]`)
        .first();
      await mainImg.waitFor({ state: "visible", timeout: 15000 });

      async function gallerySrc() {
        return mainImg.getAttribute("src");
      }
      async function waitGalleryFile(file) {
        await page
          .waitForFunction(
            ({ alt, file: f }) => {
              const img = document.querySelector(`main img[alt="${alt}"]`);
              const src = img?.currentSrc || img?.getAttribute("src") || "";
              return src.includes(f);
            },
            { alt: plan.name, file },
            { timeout: 8000 },
          )
          .catch(() => null);
      }

      async function selectPill(index) {
        // Mobile gallery is tall; Playwright scroll can leave pills "outside viewport".
        // DOM click bypasses actionability and still fires React onClick.
        await pills.nth(index).evaluate((el) => {
          el.scrollIntoView({ block: "center", inline: "nearest" });
          el.click();
        });
        await page
          .waitForFunction(
            (i) => {
              const farba = [...document.querySelectorAll("p")].find(
                (p) => p.textContent?.trim() === "Farba",
              );
              const btns = farba
                ? [
                    ...farba.parentElement.querySelectorAll(
                      "div.flex.flex-wrap.gap-2 > button[aria-pressed]",
                    ),
                  ]
                : [];
              return btns[i]?.getAttribute("aria-pressed") === "true";
            },
            index,
            { timeout: 5000 },
          )
          .catch(() => null);
      }

      await selectPill(0);
      await waitGalleryFile(colorA.file);
      const srcA = await gallerySrc();
      const labelA = (await pills.nth(0).innerText()).trim();

      await selectPill(1);
      await waitGalleryFile(colorB.file);
      const srcB = await gallerySrc();
      const labelB = (await pills.nth(1).innerText()).trim();
      const pressedB = await pills.nth(1).getAttribute("aria-pressed");

      const matchesA = Boolean(srcA && colorA.file && srcA.includes(colorA.file));
      const matchesB = Boolean(srcB && colorB.file && srcB.includes(colorB.file));
      const changed = Boolean(srcA && srcB && srcA !== srcB);

      record(
        "color-variant-switch",
        changed && matchesA && matchesB && pressedB === "true"
          ? "PASS"
          : "FAIL",
        `slug=${slug} srcChanged=${changed} matchesA=${matchesA} matchesB=${matchesB} pressedB=${pressedB} expectA=${colorA.file} expectB=${colorB.file} gotA=${fileName(srcA)} gotB=${fileName(srcB)} labels=${labelA}|${labelB} colorIds=${colorA.colorId}|${colorB.colorId}`,
      );

      await dismiss(page);
      const add = page.locator('button[aria-label*="do košíka"]').first();
      await add.click({ force: true });
      await page.waitForTimeout(600);
      const confirm = page
        .locator('button:has-text("Do košíka"), button:has-text("Pridať")')
        .last();
      if (await confirm.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirm.click({ force: true });
        await page.waitForTimeout(400);
      }

      await page.goto(`${BASE}/kosik`, { waitUntil: "domcontentloaded" });
      await dismiss(page);
      await page.waitForTimeout(800);
      const empty = await page
        .locator("text=Váš košík je prázdny")
        .isVisible()
        .catch(() => false);
      const cartDump = await page.evaluate(() => {
        try {
          return localStorage.getItem("pacidekor-cart");
        } catch {
          return null;
        }
      });
      let colorIdInCart = null;
      let imageInCart = null;
      try {
        const parsed = cartDump ? JSON.parse(cartDump) : null;
        const line = Array.isArray(parsed) ? parsed[0] : null;
        colorIdInCart = line?.colorId ?? null;
        imageInCart = line?.image ?? null;
      } catch {
        /* ignore */
      }

      const colorIdOk = colorIdInCart === colorB.colorId;
      // CartView currently thumbnails product.image (base), not color preview —
      // variant proof is colorId. Still record whether stored image equals B.
      const storedImageIsVariantB =
        Boolean(imageInCart) &&
        Boolean(colorB.file) &&
        String(imageInCart).includes(colorB.file);

      record(
        "color-variant-in-cart",
        !empty && colorIdOk ? "PASS" : "FAIL",
        `empty=${empty} colorIdOk=${colorIdOk} expectColorId=${colorB.colorId} gotColorId=${colorIdInCart} labelB=${labelB} storedImageIsVariantB=${storedImageIsVariantB} cartImage=${fileName(imageInCart)} note=CartView/localStorage.image uses product.image base; variant identity is colorId`,
      );
    }
  }

  const net = classifyNoise(failedReqs);
  // Chrome console 404s omit URL — if every HTTP 404 was noise, treat bare
  // "Failed to load resource: 404" console lines as the same noise bucket.
  const http404 = failedReqs.filter((m) => m.startsWith("HTTP 404"));
  const http404AllNoise =
    http404.length > 0 &&
    http404.every((m) => NOISE_PATTERNS.some((p) => p.test(m)));
  const consRaw = classifyNoise(consoleMsgs);
  const cons = {
    filtered: [...consRaw.filtered],
    kept: [],
  };
  for (const msg of consRaw.kept) {
    if (
      http404AllNoise &&
      msg.includes("Failed to load resource") &&
      msg.includes("404 (Not Found)")
    ) {
      cons.filtered.push({ pattern: "console-404-matched-noise-http", msg });
    } else {
      cons.kept.push(msg);
    }
  }

  const criticalKept = cons.kept.filter(
    (m) =>
      /TypeError|ReferenceError|pageerror|api\/|auth|supabase|product-images|Unauthorized|401|403|500/i.test(
        m,
      ),
  );
  const criticalNet = net.kept.filter(
    (m) =>
      /api\/|auth|supabase|product-images|HTTP 4|HTTP 5/i.test(m) &&
      !m.includes("_vercel/insights"),
  );

  record(
    "console-errors-refined",
    criticalKept.length === 0 ? "PASS" : "FAIL",
    `kept=${cons.kept.length} filtered=${cons.filtered.length} critical=${criticalKept.length} sampleKept=${JSON.stringify(cons.kept.slice(0, 5))} filteredBy=${JSON.stringify([...new Set(cons.filtered.map((f) => f.pattern))])} filteredSample=${JSON.stringify(cons.filtered.slice(0, 5))}`,
  );
  record(
    "network-errors-refined",
    criticalNet.length === 0 ? "PASS" : "FAIL",
    `kept=${net.kept.length} filtered=${net.filtered.length} critical=${criticalNet.length} sampleKept=${JSON.stringify(net.kept.slice(0, 8))} filteredBy=${JSON.stringify([...new Set(net.filtered.map((f) => f.pattern))])} filteredSample=${JSON.stringify(net.filtered.slice(0, 6))}`,
  );

  record(
    "auth-cart-merge",
    "BLOCKED",
    "no authorized non-production test account — mock/unit not run as E2E",
  );
  record(
    "b2b-b2c-prices-ui",
    "BLOCKED",
    "no authorized wholesale/retail test accounts — mock/unit not run as E2E",
  );

  const summary = {
    base: BASE,
    at: new Date().toISOString(),
    product: plan
      ? {
          slug: plan.slug,
          colorsCompared: plan.colors.slice(0, 2).map((c) => ({
            colorId: c.colorId,
            file: c.file,
          })),
        }
      : null,
    noisePatterns: NOISE_PATTERNS.map((p) => p.id),
    results,
    pass: results.filter((r) => r.result === "PASS").length,
    fail: results.filter((r) => r.result === "FAIL").length,
    blocked: results.filter((r) => r.result === "BLOCKED").length,
  };
  fs.writeFileSync(
    path.join(outDir, "results.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(
    `\nSummary PASS=${summary.pass} FAIL=${summary.fail} BLOCKED=${summary.blocked}`,
  );
  await browser.close();
  if (summary.fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
