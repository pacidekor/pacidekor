/**
 * Category LCP network + PerformanceObserver diagnosis (local next start).
 * Separates first-visit vs dismissed-before-navigation.
 * Usage: node scripts/diagnose-category-lcp-network.mjs [baseUrl] [categoryPath]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3471").replace(/\/$/, "");
const CAT =
  process.argv[3] || "/kategorie/umele-kvety";
const outDir = path.join(process.cwd(), "tmp", "lcp-diag");
fs.mkdirSync(outDir, { recursive: true });

const DISMISS_INIT = () => {
  try {
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
  } catch {
    /* ignore */
  }
};

const HOOK = () => {
  window.__catLcp = {
    lcp: [],
    marks: [],
  };
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const el = e.element;
        window.__catLcp.lcp.push({
          time: e.startTime,
          size: e.size,
          url: e.url || null,
          tag: el?.tagName || null,
          className:
            typeof el?.className === "string" ? el.className.slice(0, 140) : null,
          src: el?.currentSrc || el?.getAttribute?.("src") || null,
          alt: el?.getAttribute?.("alt") || null,
          loading: el?.getAttribute?.("loading") || null,
          fetchPriority: el?.getAttribute?.("fetchpriority") || el?.fetchPriority || null,
          decoding: el?.getAttribute?.("decoding") || null,
          complete: el?.complete ?? null,
          naturalWidth: el?.naturalWidth ?? null,
        });
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (err) {
    window.__catLcp.poError = String(err);
  }
};

function round(n, d = 1) {
  if (n == null || Number.isNaN(n)) return null;
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function fileOf(url) {
  if (!url) return null;
  try {
    return decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
  } catch {
    return String(url).split("/").pop() || null;
  }
}

function summarizeScenario(label, harvest, networkLog) {
  const lcp = harvest.lcp?.[harvest.lcp.length - 1] || null;
  const nav = harvest.nav;
  const resources = harvest.resources || [];

  const html = resources.find(
    (r) =>
      r.initiatorType === "navigation" ||
      (r.name === harvest.href && r.initiatorType === "other"),
  );
  // Playwright nav timing is more reliable for document
  const doc = {
    ttfbMs: nav ? round(nav.responseStart) : null,
    responseEndMs: nav ? round(nav.responseEnd) : null,
    domContentLoadedMs: nav ? round(nav.domContentLoadedEventEnd) : null,
    loadEventEndMs: nav ? round(nav.loadEventEnd) : null,
    transferSize: nav?.transferSize ?? null,
    encodedBodySize: nav?.encodedBodySize ?? null,
  };

  const productImgs = resources
    .filter(
      (r) =>
        r.name.includes("product-images") ||
        (/\.(webp|jpg|jpeg|png)(\?|$)/i.test(r.name) &&
          !r.name.includes("/bannery/") &&
          !r.name.includes("rezitsignature")),
    )
    .map((r) => ({
      file: fileOf(r.name),
      name: r.name,
      initiatorType: r.initiatorType,
      startTime: round(r.startTime),
      responseEnd: round(r.responseEnd),
      duration: round(r.duration),
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize,
      renderBlockingStatus: r.renderBlockingStatus,
    }))
    .sort((a, b) => a.startTime - b.startTime);

  let matchedImg = null;
  if (lcp?.src || lcp?.url) {
    const key = lcp.src || lcp.url;
    const fname = fileOf(key);
    matchedImg =
      productImgs.find((r) => r.name === key) ||
      productImgs.find((r) => fname && r.file === fname) ||
      resources
        .map((r) => ({
          file: fileOf(r.name),
          name: r.name,
          initiatorType: r.initiatorType,
          startTime: round(r.startTime),
          responseEnd: round(r.responseEnd),
          duration: round(r.duration),
          transferSize: r.transferSize,
          encodedBodySize: r.encodedBodySize,
        }))
        .find((r) => fname && r.file === fname);
  }

  const concurrentAtLcpImageStart = matchedImg
    ? resources.filter(
        (r) =>
          r.startTime <= matchedImg.startTime &&
          r.responseEnd >= matchedImg.startTime &&
          r.name !== matchedImg.name,
      ).length
    : null;

  const concurrentDuringTransfer = matchedImg
    ? resources.filter((r) => {
        const overlap =
          r.startTime < matchedImg.responseEnd &&
          r.responseEnd > matchedImg.startTime &&
          r.name !== matchedImg.name;
        return overlap && (r.initiatorType === "img" || r.name.includes("product-images"));
      }).length
    : null;

  const downloadToPaintMs =
    lcp && matchedImg?.responseEnd != null
      ? round(lcp.time - matchedImg.responseEnd)
      : null;

  const htmlWaitMs = doc.responseEndMs;
  const imageStartAfterHtmlMs =
    matchedImg && doc.responseEndMs != null
      ? round(matchedImg.startTime - doc.responseEndMs)
      : matchedImg
        ? round(matchedImg.startTime)
        : null;

  // Network log from CDP-ish request events (bytes when available)
  const netForLcp = matchedImg
    ? networkLog.filter((n) => n.url.includes(matchedImg.file || "___"))
    : [];

  return {
    label,
    constructionVisible: harvest.constructionVisible,
    cookieVisible: harvest.cookieVisible,
    href: harvest.href,
    document: doc,
    lcp: lcp
      ? {
          timeMs: round(lcp.time),
          size: lcp.size,
          tag: lcp.tag,
          className: lcp.className,
          file: fileOf(lcp.src || lcp.url),
          src: lcp.src || lcp.url,
          alt: lcp.alt,
          loading: lcp.loading,
          fetchPriority: lcp.fetchPriority,
          decoding: lcp.decoding,
          complete: lcp.complete,
          naturalWidth: lcp.naturalWidth,
          allCandidates: (harvest.lcp || []).map((e) => ({
            timeMs: round(e.time),
            tag: e.tag,
            file: fileOf(e.src || e.url),
            size: e.size,
            loading: e.loading,
            fetchPriority: e.fetchPriority,
          })),
        }
      : null,
    breakdown: {
      waitHtmlMs: htmlWaitMs,
      imageRequestStartMs: matchedImg?.startTime ?? null,
      imageStartAfterHtmlMs,
      imageTransferMs: matchedImg?.duration ?? null,
      imageResponseEndMs: matchedImg?.responseEnd ?? null,
      downloadToPaintMs,
      concurrentResourcesAtImageStart: concurrentAtLcpImageStart,
      concurrentProductImagesDuringTransfer: concurrentDuringTransfer,
      matchedResource: matchedImg,
    },
    firstProductImages: productImgs.slice(0, 12),
    productImageCount: productImgs.length,
    topResourcesByStart: resources
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 25)
      .map((r) => ({
        file: fileOf(r.name) || r.name.slice(0, 80),
        type: r.initiatorType,
        start: round(r.startTime),
        end: round(r.responseEnd),
        dur: round(r.duration),
        transfer: r.transferSize,
      })),
    networkEventsForLcpFile: netForLcp,
    viewportProductImgs: harvest.viewportProductImgs,
  };
}

async function runScenario(browser, { seedDismissed, label }) {
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "sk-SK",
  });
  if (seedDismissed) await ctx.addInitScript(DISMISS_INIT);
  await ctx.addInitScript(HOOK);

  const networkLog = [];
  const page = await ctx.newPage();
  page.on("request", (req) => {
    if (
      req.resourceType() === "document" ||
      req.resourceType() === "image" ||
      req.url().includes("product-images") ||
      req.url().includes("/api/")
    ) {
      networkLog.push({
        phase: "request",
        at: Date.now(),
        type: req.resourceType(),
        url: req.url(),
        priority: req.headers()["priority"] || null,
      });
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (
      res.request().resourceType() === "document" ||
      res.request().resourceType() === "image" ||
      url.includes("product-images")
    ) {
      const req = res.request();
      let timing = null;
      try {
        timing = req.timing();
      } catch {
        /* ignore */
      }
      networkLog.push({
        phase: "response",
        at: Date.now(),
        status: res.status(),
        url,
        timing,
      });
    }
  });

  const client = await ctx.newCDPSession(page);
  await client.send("Performance.enable");
  await client.send("Network.enable");

  const navStart = Date.now();
  const response = await page.goto(`${BASE}${CAT}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  const navHttp = response?.status() ?? null;

  // Let LCP settle + images start
  await page.waitForTimeout(3500);

  const harvest = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource").map((r) => ({
      name: r.name,
      initiatorType: r.initiatorType,
      startTime: r.startTime,
      responseEnd: r.responseEnd,
      duration: r.duration,
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize,
      decodedBodySize: r.decodedBodySize,
      renderBlockingStatus: r.renderBlockingStatus,
    }));
    // Synthetic nav-like entry from PerformanceNavigationTiming fields
    const navObj = nav
      ? {
          responseStart: nav.responseStart,
          responseEnd: nav.responseEnd,
          domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
          loadEventEnd: nav.loadEventEnd,
          transferSize: nav.transferSize,
          encodedBodySize: nav.encodedBodySize,
          decodedBodySize: nav.decodedBodySize,
          startTime: nav.startTime,
        }
      : null;

    const constructionVisible = [...document.querySelectorAll("button")].some(
      (b) => b.textContent?.includes("Pokračovať na e-shop"),
    );
    const cookieVisible = [...document.querySelectorAll("button")].some((b) =>
      b.textContent?.includes("Prijať"),
    );

    const vh = window.innerHeight;
    const viewportProductImgs = [...document.querySelectorAll("main img")]
      .filter((img) => {
        const src = img.currentSrc || img.src || "";
        return src.includes("product-images");
      })
      .map((img) => {
        const r = img.getBoundingClientRect();
        return {
          file: (img.currentSrc || img.src || "").split("/").pop(),
          alt: img.alt,
          loading: img.loading,
          fetchPriority: img.fetchPriority || img.getAttribute("fetchpriority"),
          decoding: img.decoding,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          top: Math.round(r.top),
          inViewport: r.top < vh && r.bottom > 0 && r.width > 40,
        };
      })
      .filter((x) => x.inViewport)
      .slice(0, 8);

    return {
      href: location.href,
      lcp: window.__catLcp?.lcp || [],
      poError: window.__catLcp?.poError || null,
      nav: navObj,
      resources,
      constructionVisible,
      cookieVisible,
      viewportProductImgs,
    };
  });

  // Chrome performance metrics snapshot
  let perfMetrics = null;
  try {
    const metrics = await client.send("Performance.getMetrics");
    perfMetrics = Object.fromEntries(
      (metrics.metrics || []).map((m) => [m.name, m.value]),
    );
  } catch {
    /* ignore */
  }

  await ctx.close();

  const summary = summarizeScenario(label, harvest, networkLog);
  summary.navHttpStatus = navHttp;
  summary.wallClockNavMs = Date.now() - navStart;
  summary.perfMetrics = perfMetrics
    ? {
        DomContentLoaded: perfMetrics.DomContentLoaded,
        FirstMeaningfulPaint: perfMetrics.FirstMeaningfulPaint,
        LargestContentfulPaintTime: perfMetrics.LargestContentfulPaintTime,
      }
    : null;
  return summary;
}

function interpret(first, dismissed) {
  const pick = dismissed?.lcp?.tag === "IMG" ? dismissed : first;
  const b = pick?.breakdown || {};
  const lcp = pick?.lcp;

  const causes = [];
  if (first?.lcp?.tag === "P" || first?.lcp?.tag === "H1") {
    causes.push({
      id: "construction-dialog-text-wins-lcp",
      detail: `First-visit LCP is ${first.lcp.tag} (construction/UI text), size=${first.lcp.size}, not a product image.`,
    });
  }
  if (lcp?.tag === "IMG") {
    if ((b.imageStartAfterHtmlMs ?? 0) > 200) {
      causes.push({
        id: "late-image-request-start",
        detail: `LCP image request started ${b.imageStartAfterHtmlMs}ms after HTML responseEnd (start@${b.imageRequestStartMs}ms).`,
      });
    }
    if ((b.imageTransferMs ?? 0) > 400) {
      causes.push({
        id: "slow-or-contended-image-transfer",
        detail: `Transfer ${b.imageTransferMs}ms, concurrent product images during transfer=${b.concurrentProductImagesDuringTransfer}, transferSize=${b.matchedResource?.transferSize}.`,
      });
    }
    if ((b.downloadToPaintMs ?? 0) > 100) {
      causes.push({
        id: "download-to-paint-delay",
        detail: `Paint ${b.downloadToPaintMs}ms after responseEnd (decode/layout/overlay/hydration).`,
      });
    }
    if ((b.waitHtmlMs ?? 0) > 500) {
      causes.push({
        id: "html-document-wait",
        detail: `HTML responseEnd ${b.waitHtmlMs}ms (TTFB ${pick.document?.ttfbMs}ms, body ~${pick.document?.encodedBodySize}B).`,
      });
    }
    if (lcp.loading === "lazy") {
      causes.push({
        id: "lcp-image-lazy",
        detail: "LCP image has loading=lazy.",
      });
    }
  }

  // Primary cause ranking
  let primary = causes[0] || {
    id: "unknown",
    detail: "Insufficient signal",
  };
  if (first?.lcp?.tag && first.lcp.tag !== "IMG" && first.constructionVisible) {
    primary = causes.find((c) => c.id === "construction-dialog-text-wins-lcp") || primary;
  } else if (dismissed?.lcp?.tag === "IMG") {
    // Prefer the largest contributor numerically
    const scored = [
      { id: "html-document-wait", v: dismissed.breakdown.waitHtmlMs || 0 },
      {
        id: "late-image-request-start",
        v: Math.max(0, dismissed.breakdown.imageStartAfterHtmlMs || 0),
      },
      {
        id: "slow-or-contended-image-transfer",
        v: dismissed.breakdown.imageTransferMs || 0,
      },
      {
        id: "download-to-paint-delay",
        v: Math.max(0, dismissed.breakdown.downloadToPaintMs || 0),
      },
    ].sort((a, b) => b.v - a.v);
    primary =
      causes.find((c) => c.id === scored[0].id) ||
      {
        id: scored[0].id,
        detail: `Largest slice ~${scored[0].v}ms`,
      };
  }

  return { primary, all: causes, analyzedScenario: pick?.label };
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const firstVisit = await runScenario(browser, {
      seedDismissed: false,
      label: "firstVisit-with-dialogs",
    });
    const dismissed = await runScenario(browser, {
      seedDismissed: true,
      label: "dismissed-before-navigation",
    });
    const interpretation = interpret(firstVisit, dismissed);

    const report = {
      base: BASE,
      category: CAT,
      at: new Date().toISOString(),
      metricKind:
        "PerformanceObserver + Resource Timing + Playwright request timing (NOT Lighthouse simulate)",
      firstVisit,
      dismissed,
      interpretation,
    };

    const out = path.join(outDir, "category-network-lcp.json");
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      category: CAT,
      firstVisit: {
        lcpTag: firstVisit.lcp?.tag,
        lcpFile: firstVisit.lcp?.file,
        lcpMs: firstVisit.lcp?.timeMs,
        construction: firstVisit.constructionVisible,
        breakdown: firstVisit.breakdown,
      },
      dismissed: {
        lcpTag: dismissed.lcp?.tag,
        lcpFile: dismissed.lcp?.file,
        lcpMs: dismissed.lcp?.timeMs,
        construction: dismissed.constructionVisible,
        breakdown: dismissed.breakdown,
        doc: dismissed.document,
      },
      interpretation,
    }, null, 2));
    console.log("Wrote", out);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
