/**
 * Lighthouse mobile compare: 3 runs × pages × firstVisit|dismissed
 * Usage: node scripts/audit-lh-compare.mjs <baseUrl> <label>
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lighthouse = require("lighthouse").default || require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const puppeteer = require("puppeteer-core");

const BASE = (process.argv[2] || "http://127.0.0.1:3481").replace(/\/$/, "");
const LABEL = process.argv[3] || "current";
const outDir = path.join(process.cwd(), "tmp", "audit-final");
fs.mkdirSync(outDir, { recursive: true });

const PATHS = [
  { id: "home", path: "/" },
  { id: "category", path: "/kategorie/umele-kvety" },
  { id: "produkty", path: "/produkty" },
];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const DISMISS = () => {
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

async function attachSeed(browser) {
  for (const page of await browser.pages()) {
    try {
      await page.evaluateOnNewDocument(DISMISS);
    } catch {
      /* ignore */
    }
  }
  browser.on("targetcreated", async (t) => {
    if (t.type() !== "page") return;
    try {
      const p = await t.page();
      if (p) await p.evaluateOnNewDocument(DISMISS);
    } catch {
      /* ignore */
    }
  });
}

async function runOnce(port, url) {
  const result = await lighthouse(url, {
    port,
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
    disableStorageReset: false,
  });
  const a = result.lhr.audits;
  return {
    score: Math.round((result.lhr.categories.performance?.score ?? 0) * 100),
    lcp: a["largest-contentful-paint"]?.numericValue ?? null,
    cls: a["cumulative-layout-shift"]?.numericValue ?? null,
    tbt: a["total-blocking-time"]?.numericValue ?? null,
    transfer:
      a["total-byte-weight"]?.numericValue ??
      a["network-requests"]?.details?.items?.reduce(
        (s, i) => s + (i.transferSize || 0),
        0,
      ) ??
      null,
  };
}

async function runMode(seed, modeId) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${chrome.port}`,
      defaultViewport: null,
    });
    if (seed) await attachSeed(browser);
    const pages = {};
    for (const p of PATHS) {
      const runs = [];
      for (let i = 0; i < 3; i++) {
        process.stderr.write(`${LABEL}/${modeId}/${p.id} ${i + 1}/3\n`);
        runs.push(await runOnce(chrome.port, BASE + p.path));
      }
      pages[p.id] = {
        path: p.path,
        score: median(runs.map((r) => r.score)),
        lcpMs: Math.round(median(runs.map((r) => r.lcp ?? 0))),
        cls: Number(median(runs.map((r) => r.cls ?? 0)).toFixed(3)),
        tbtMs: Math.round(median(runs.map((r) => r.tbt ?? 0))),
        transferBytes: Math.round(median(runs.map((r) => r.transfer ?? 0))),
        runs,
      };
      console.log(JSON.stringify({ label: LABEL, mode: modeId, id: p.id, ...pages[p.id] }));
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
  const report = {
    label: LABEL,
    base: BASE,
    at: new Date().toISOString(),
    environment: {
      formFactor: "mobile",
      throttling: "Lighthouse simulate",
      note: "Local next start — not PageSpeed production",
    },
    modes: {
      firstVisit: await runMode(false, "firstVisit"),
      dismissed: await runMode(true, "dismissed"),
    },
  };
  const out = path.join(outDir, `lh-${LABEL}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
