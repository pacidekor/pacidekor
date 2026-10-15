/**
 * Lighthouse mobile runs (3×) against production `next start`.
 * Separates first-visit (dialogs) vs dismissed (storage seeded BEFORE navigation).
 * Usage: node scripts/audit-lighthouse.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lighthouse = require("lighthouse").default || require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const puppeteer = require("puppeteer-core");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const BASE = (args[0] || "http://127.0.0.1:3470").replace(/\/$/, "");
const onlyMode = flags.has("--dismissed-only")
  ? "dismissed"
  : flags.has("--first-only")
    ? "firstVisit"
    : "both";
const outDir = path.join(process.cwd(), "tmp", "lighthouse");
fs.mkdirSync(outDir, { recursive: true });

const PATHS = [
  { id: "home", path: "/" },
  { id: "produkty", path: "/produkty" },
  { id: "category", path: "/kategorie/umele-kvety" },
  { id: "search", path: "/vyhladavanie?q=ruza" },
];

const DISMISS_SCRIPT = () => {
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

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function attachDismissSeed(browser) {
  const seedPage = async (page) => {
    if (!page) return;
    try {
      await page.evaluateOnNewDocument(DISMISS_SCRIPT);
    } catch {
      /* closed */
    }
  };
  for (const page of await browser.pages()) await seedPage(page);
  browser.on("targetcreated", async (target) => {
    if (target.type() !== "page") return;
    try {
      const page = await target.page();
      await seedPage(page);
    } catch {
      /* ignore */
    }
  });
}

async function runOnce(chromePort, url) {
  const result = await lighthouse(url, {
    port: chromePort,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance"],
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      disabled: false,
    },
    throttlingMethod: "simulate",
    // Match prior local runs: clear storage each run. Dismissed mode still works
    // because evaluateOnNewDocument re-seeds sessionStorage on the measured navigation.
    disableStorageReset: false,
  });
  const lhr = result.lhr;
  const audits = lhr.audits;
  return {
    score: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbt: audits["total-blocking-time"]?.numericValue ?? null,
    lcpElement: audits["largest-contentful-paint-element"]?.displayValue ?? null,
    lcpNode:
      audits["largest-contentful-paint-element"]?.details?.items?.[0]?.node
        ?.snippet ?? null,
  };
}

async function runMode(modeId, seedDismissed, paths) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${chrome.port}`,
      defaultViewport: null,
    });
    if (seedDismissed) await attachDismissSeed(browser);

    const pages = {};
    for (const page of paths) {
      const url = BASE + page.path;
      const runs = [];
      for (let i = 0; i < 3; i++) {
        process.stderr.write(`LH ${modeId}/${page.id} run ${i + 1}/3…\n`);
        runs.push(await runOnce(chrome.port, url));
      }
      const med = {
        score: median(runs.map((r) => r.score)),
        lcpMs: Math.round(median(runs.map((r) => r.lcp ?? 0))),
        cls: Number(median(runs.map((r) => r.cls ?? 0)).toFixed(3)),
        tbtMs: Math.round(median(runs.map((r) => r.tbt ?? 0))),
        lcpElement: runs.map((r) => r.lcpElement).find(Boolean) ?? null,
        lcpNode: runs.map((r) => r.lcpNode).find(Boolean) ?? null,
        runs,
      };
      pages[page.id] = { path: page.path, ...med };
      console.log(
        JSON.stringify({
          mode: modeId,
          id: page.id,
          score: med.score,
          lcpMs: med.lcpMs,
          cls: med.cls,
          tbtMs: med.tbtMs,
        }),
      );
    }
    return pages;
  } finally {
    try {
      browser?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      await Promise.resolve(chrome.kill());
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  const paths = [...PATHS];
  const listRes = await fetch(`${BASE}/api/products/list?limit=1`);
  const listJson = await listRes.json();
  const slug = listJson.products?.[0]?.slug;
  if (slug) paths.push({ id: "pdp", path: `/produkt/${slug}` });

  let previousLocal = null;
  const prevPath = path.join(outDir, "summary-baseline-pre-lcp-fix.json");
  const legacyPath = path.join(outDir, "summary.json");
  for (const p of [prevPath, legacyPath]) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
        // Only treat flat pages shape as comparable baseline (pre dialog-split)
        if (parsed.pages?.home && !parsed.modes) {
          previousLocal = parsed;
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }

  // Preserve old flat summary once as baseline if not already saved
  if (!fs.existsSync(prevPath) && fs.existsSync(legacyPath)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
      if (legacy.pages?.home && !legacy.modes) {
        fs.writeFileSync(prevPath, JSON.stringify(legacy, null, 2));
        previousLocal = legacy;
      }
    } catch {
      /* ignore */
    }
  }

  const report = {
    base: BASE,
    at: new Date().toISOString(),
    environment: {
      formFactor: "mobile",
      screen: "412×915 @2.625",
      throttling: "Lighthouse simulate (default)",
      note: "Local next start — not PageSpeed; values are LH simulated, not PerformanceObserver traces",
      dialogModes:
        "firstVisit = empty storage (construction+cookie may show); dismissed = sessionStorage/localStorage seeded via evaluateOnNewDocument BEFORE navigation — not same-load dismiss click",
    },
    previousLocalAt: previousLocal?.at ?? null,
    modes: {},
  };

  if (onlyMode === "both" || onlyMode === "firstVisit") {
    process.stderr.write("\n=== MODE firstVisit ===\n");
    report.modes.firstVisit = {
      label: "first-visit-with-dialogs",
      pages: await runMode("firstVisit", false, paths),
    };
  }

  if (onlyMode === "both" || onlyMode === "dismissed") {
    process.stderr.write("\n=== MODE dismissed ===\n");
    report.modes.dismissed = {
      label: "reload-with-dialogs-already-dismissed",
      pages: await runMode("dismissed", true, paths),
    };
  }

  // Merge previously saved firstVisit if continuing dismissed-only
  const mergePath = path.join(outDir, "summary-after-lcp-fix.json");
  if (onlyMode === "dismissed" && fs.existsSync(mergePath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(mergePath, "utf8"));
      if (prev.modes?.firstVisit && !report.modes.firstVisit) {
        report.modes.firstVisit = prev.modes.firstVisit;
      }
    } catch {
      /* ignore */
    }
  }

  if (previousLocal?.pages) {
    report.compareToPreviousFlat = {};
    for (const id of Object.keys(previousLocal.pages)) {
      const prev = previousLocal.pages[id];
      const cur = report.modes.firstVisit.pages[id];
      if (!cur) continue;
      report.compareToPreviousFlat[id] = {
        previous: {
          score: prev.score,
          lcpMs: prev.lcpMs,
          cls: prev.cls,
          tbtMs: prev.tbtMs,
        },
        currentFirstVisit: {
          score: cur.score,
          lcpMs: cur.lcpMs,
          cls: cur.cls,
          tbtMs: cur.tbtMs,
        },
        note: "Previous baseline did not split dialog state; treat as approx first-visit only",
      };
    }
  }

  const outFile = path.join(outDir, "summary-after-lcp-fix.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(report, null, 2));
  console.log("Wrote", outFile);
}

main().catch((err) => {
  console.error("Lighthouse failed:", err);
  process.exit(1);
});
