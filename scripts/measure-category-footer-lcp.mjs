/**
 * Category LCP A/B helper: dismissed dialogs, cold cache, 3 runs.
 * Usage: node scripts/measure-category-footer-lcp.mjs [baseUrl] [label]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3472").replace(/\/$/, "");
const LABEL = process.argv[3] || "run";
const CAT = "/kategorie/umele-kvety";
const RUNS = 3;
const outDir = path.join(process.cwd(), "tmp", "lcp-diag");
fs.mkdirSync(outDir, { recursive: true });

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function fileOf(url) {
  if (!url) return null;
  return decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
}

async function oneRun(browser) {
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "sk-SK",
    // Cold cache: no storage state, new context each run
  });
  await ctx.addInitScript(() => {
    sessionStorage.setItem("pacidekor-construction-notice-dismissed", "1");
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
  await ctx.addInitScript(() => {
    window.__lcp = [];
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const el = e.element;
          window.__lcp.push({
            time: e.startTime,
            size: e.size,
            tag: el?.tagName || null,
            src: el?.currentSrc || el?.getAttribute?.("src") || null,
            alt: el?.getAttribute?.("alt") || null,
            loading: el?.getAttribute?.("loading") || null,
            fetchPriority:
              el?.getAttribute?.("fetchpriority") || el?.fetchPriority || null,
          });
        }
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (err) {
      window.__lcpError = String(err);
    }
  });

  const consoleErrors = [];
  const failed = [];
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    failed.push(`${r.failure()?.errorText || "fail"} ${r.url()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url()}`);
  });

  // Ensure CDNs don't use HTTP cache from prior contexts in same browser —
  // Playwright contexts share browser HTTP cache unless we disable it.
  await ctx.route("**/*", async (route) => {
    const headers = {
      ...route.request().headers(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
    await route.continue({ headers });
  });

  await page.goto(`${BASE}${CAT}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(3500);

  const early = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const sigs = resources.filter((r) =>
      r.name.includes("rezitsignature"),
    );
    const product = resources.filter((r) => r.name.includes("product-images"));
    const lcp = window.__lcp?.[window.__lcp.length - 1] || null;
    let matched = null;
    if (lcp?.src) {
      const fname = lcp.src.split("/").pop();
      const r = resources.find((x) => x.name.includes(fname));
      if (r) {
        matched = {
          startTime: r.startTime,
          responseEnd: r.responseEnd,
          duration: r.duration,
          transferSize: r.transferSize,
          initiatorType: r.initiatorType,
        };
      }
    }
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      lcp: lcp
        ? {
            time: lcp.time,
            tag: lcp.tag,
            file: lcp.src ? lcp.src.split("/").pop() : null,
            alt: lcp.alt,
            loading: lcp.loading,
            fetchPriority: lcp.fetchPriority,
            size: lcp.size,
          }
        : null,
      matched,
      sigEarly: sigs.map((r) => ({
        file: r.name.split("/").pop(),
        startTime: r.startTime,
        responseEnd: r.responseEnd,
        transferSize: r.transferSize,
        initiatorType: r.initiatorType,
      })),
      productEarlyCount: product.filter((r) => r.startTime < 500).length,
      productCount: product.length,
      htmlResponseEnd: nav?.responseEnd ?? null,
      layoutShiftEntries: performance
        .getEntriesByType("layout-shift")
        .filter((e) => !e.hadRecentInput)
        .map((e) => e.value),
    };
  });

  // Scroll to footer — load + hover check
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1200);

  const footer = await page.evaluate(async () => {
    const link = document.querySelector('a[aria-label="REZIT"]');
    if (!link) return { found: false };
    const imgs = [...link.querySelectorAll("img")];
    const before = imgs.map((i) => ({
      src: i.getAttribute("src"),
      loading: i.loading,
      decoding: i.decoding,
      fetchPriority: i.fetchPriority || i.getAttribute("fetchpriority"),
      complete: i.complete,
      naturalWidth: i.naturalWidth,
      opacity: getComputedStyle(i).opacity,
    }));
    link.dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: true, view: window }),
    );
    // CSS group-hover needs :hover — force via class simulation by checking styles after hover media isn't available;
    // use computed style after programmatic hover class on parent
    link.classList.add("force-hover-test");
    await new Promise((r) => setTimeout(r, 100));
    // Trigger :hover via CDP isn't here — check attributes and that both images exist/loaded
    const afterHoverAttempt = imgs.map((i) => ({
      src: i.getAttribute("src"),
      opacity: getComputedStyle(i).opacity,
      complete: i.complete,
      naturalWidth: i.naturalWidth,
    }));
    const resources = performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes("rezitsignature"))
      .map((r) => ({
        file: r.name.split("/").pop(),
        startTime: r.startTime,
        responseEnd: r.responseEnd,
        transferSize: r.transferSize,
      }));
    const cls = performance
      .getEntriesByType("layout-shift")
      .filter((e) => !e.hadRecentInput)
      .reduce((a, e) => a + e.value, 0);
    return {
      found: true,
      imgCount: imgs.length,
      before,
      afterHoverAttempt,
      sigResourcesAfterScroll: resources,
      cls,
      box: link
        ? {
            w: Math.round(link.getBoundingClientRect().width),
            h: Math.round(link.getBoundingClientRect().height),
          }
        : null,
    };
  });

  const rezit = page.locator('a[aria-label="REZIT"]');
  await rezit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  let hoverOk = false;
  try {
    await rezit.hover({ force: true });
    await page.waitForTimeout(700);
    hoverOk = await page.evaluate(() => {
      const link = document.querySelector('a[aria-label="REZIT"]');
      const imgs = [...(link?.querySelectorAll("img") || [])];
      if (imgs.length < 2) return false;
      const o0 = parseFloat(getComputedStyle(imgs[0]).opacity);
      const o1 = parseFloat(getComputedStyle(imgs[1]).opacity);
      // group-hover swaps opacities
      return o0 < 0.15 && o1 > 0.85;
    });
  } catch {
    hoverOk = false;
  }
  // Both signatures visible/loaded after scroll (even if hover CSS fails in headless)
  const bothLoaded = await page.evaluate(() => {
    const link = document.querySelector('a[aria-label="REZIT"]');
    const imgs = [...(link?.querySelectorAll("img") || [])];
    return (
      imgs.length === 2 &&
      imgs.every((i) => i.complete && i.naturalWidth > 0) &&
      imgs.every((i) => i.loading === "lazy" || i.getAttribute("loading") === "lazy")
    );
  });

  await ctx.close();

  const clsSum = (early.layoutShiftEntries || []).reduce((a, b) => a + b, 0);
  return {
    lcp: early.lcp,
    matched: early.matched,
    sigEarlyBeforeScroll: early.sigEarly,
    signaturesRequestedInFirst500ms: early.sigEarly.filter((s) => s.startTime < 500)
      .length,
    productEarlyCount: early.productEarlyCount,
    footer,
    hoverOk,
    bothSignaturesLoadedAfterScroll: bothLoaded,
    clsEarly: clsSum,
    clsAfterScroll: footer.cls ?? null,
    consoleErrors,
    failed: failed.filter(
      (m) =>
        !m.includes("_vercel/insights") &&
        !m.includes("favicon") &&
        !(m.includes("ERR_ABORTED") && m.includes("_rsc=")),
    ),
  };
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  const runs = [];
  try {
    for (let i = 0; i < RUNS; i++) {
      process.stderr.write(`${LABEL} run ${i + 1}/${RUNS}…\n`);
      runs.push(await oneRun(browser));
    }
  } finally {
    await browser.close();
  }

  const lcpTimes = runs.map((r) => r.lcp?.time).filter((n) => n != null);
  const summary = {
    label: LABEL,
    base: BASE,
    at: new Date().toISOString(),
    metricKind: "PerformanceObserver + Resource Timing (not Lighthouse)",
    runs,
    median: {
      lcpMs: lcpTimes.length ? Math.round(median(lcpTimes)) : null,
      imageStartMs: (() => {
        const v = runs.map((r) => r.matched?.startTime).filter((n) => n != null);
        return v.length ? Math.round(median(v)) : null;
      })(),
      imageEndMs: (() => {
        const v = runs
          .map((r) => r.matched?.responseEnd)
          .filter((n) => n != null);
        return v.length ? Math.round(median(v)) : null;
      })(),
      imageTransferMs: (() => {
        const v = runs.map((r) => r.matched?.duration).filter((n) => n != null);
        return v.length ? Math.round(median(v)) : null;
      })(),
      signaturesInFirst500ms: median(
        runs.map((r) => r.signaturesRequestedInFirst500ms),
      ),
      clsEarly: Number(
        median(runs.map((r) => r.clsEarly || 0)).toFixed(4),
      ),
    },
    lcpFiles: runs.map((r) => r.lcp?.file),
    hoverOkAll: runs.every((r) => r.hoverOk),
    bothLoadedAll: runs.every((r) => r.bothSignaturesLoadedAfterScroll),
    anyNetworkErrors: runs.some((r) => r.failed.length > 0),
    failedSamples: runs.flatMap((r) => r.failed).slice(0, 8),
  };

  const out = path.join(outDir, `footer-lcp-${LABEL}.json`);
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.median, null, 2));
  console.log(
    JSON.stringify({
      label: LABEL,
      lcpFiles: summary.lcpFiles,
      hoverOkAll: summary.hoverOkAll,
      signaturesInFirst500ms_median: summary.median.signaturesInFirst500ms,
      anyNetworkErrors: summary.anyNetworkErrors,
    }),
  );
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
