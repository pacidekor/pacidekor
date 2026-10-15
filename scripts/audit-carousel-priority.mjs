/**
 * Homepage carousel LCP candidates + product-card priority count (mobile).
 * Uses PerformanceObserver (not Lighthouse). Dialog dismissed via sessionStorage before nav.
 * Usage: node scripts/audit-carousel-priority.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3470").replace(/\/$/, "");
const outDir = path.join(process.cwd(), "tmp", "lighthouse");
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "sk-SK",
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

  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.__lcpLog = [];
    window.__carouselProbe = null;
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const el = e.element;
        window.__lcpLog.push({
          time: Math.round(e.startTime),
          size: e.size,
          tag: el?.tagName ?? null,
          src: el?.currentSrc || el?.getAttribute?.("src") || null,
          alt: el?.getAttribute?.("alt") || null,
          loading: el?.getAttribute?.("loading") || null,
          fetchPriority: el?.getAttribute?.("fetchpriority") || null,
          decoding: el?.getAttribute?.("decoding") || null,
        });
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  });

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);

  const t0 = await page.evaluate(() => {
    const track = document.querySelector("[class*='will-change-transform']");
    const imgs = [...document.querySelectorAll("img")].filter((i) =>
      (i.currentSrc || i.src || "").includes("/bannery/display/"),
    );
    const visible = imgs.map((i) => {
      const r = i.getBoundingClientRect();
      return {
        src: (i.currentSrc || i.src || "").split("/").pop(),
        alt: i.alt,
        loading: i.loading,
        fetchPriority: i.fetchPriority || i.getAttribute("fetchpriority"),
        decoding: i.decoding,
        x: Math.round(r.x),
        w: Math.round(r.width),
        inViewport: r.width > 0 && r.left < window.innerWidth && r.right > 0,
        complete: i.complete,
      };
    });
    const tf = track ? getComputedStyle(track).transform : null;
    return {
      transform: tf,
      bannerImgs: visible,
      lcpLog: window.__lcpLog?.slice() ?? [],
      constructionVisible: !!document
        .querySelector("button")
        ?.closest("div")
        ?.textContent?.includes("Pokračovať na e-shop")
        ? [...document.querySelectorAll("button")].some((b) =>
            b.textContent?.includes("Pokračovať na e-shop"),
          )
        : [...document.querySelectorAll("button")].some((b) =>
            b.textContent?.includes("Pokračovať na e-shop"),
          ),
    };
  });

  // Wait through ~2 auto advances (AUTO_MS=5000)
  const samples = [t0];
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(5200);
    const snap = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")].filter((i) =>
        (i.currentSrc || i.src || "").includes("/bannery/display/"),
      );
      const inView = imgs
        .map((i) => {
          const r = i.getBoundingClientRect();
          const center = r.left + r.width / 2;
          const dist = Math.abs(center - window.innerWidth / 2);
          return {
            src: (i.currentSrc || i.src || "").split("/").pop(),
            alt: i.alt,
            loading: i.loading,
            fetchPriority: i.fetchPriority || i.getAttribute("fetchpriority"),
            complete: i.complete,
            naturalWidth: i.naturalWidth,
            dist,
            inViewport: r.width > 50 && r.left < window.innerWidth && r.right > 0,
          };
        })
        .sort((a, b) => a.dist - b.dist);
      const active = inView[0] || null;
      const loadedBannerFiles = [
        ...new Set(imgs.map((i) => (i.currentSrc || i.src || "").split("/").pop())),
      ];
      return {
        active,
        loadedBannerFiles,
        allCompleteInDom: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        bannerDomCount: imgs.length,
        lcpLog: window.__lcpLog?.slice() ?? [],
      };
    });
    samples.push(snap);
  }

  // Priority cards on listing pages
  const listingPaths = [
    { id: "produkty", path: "/produkty" },
    { id: "category", path: "/kategorie/umele-kvety" },
    { id: "search", path: "/vyhladavanie?q=ruza" },
  ];
  const priority = {};
  for (const lp of listingPaths) {
    await page.goto(`${BASE}${lp.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(1200);
    priority[lp.id] = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("main img")].filter((img) => {
        const src = img.currentSrc || img.src || "";
        return src.includes("product-images") || img.closest("a[href*='/produkt/']");
      });
      // Next/Image with priority sets fetchpriority=high
      const high = cards.filter(
        (img) =>
          (img.fetchPriority || img.getAttribute("fetchpriority") || "") ===
          "high",
      );
      const vh = window.innerHeight;
      const highInViewport = high.filter((img) => {
        const r = img.getBoundingClientRect();
        return r.top < vh && r.bottom > 0;
      }).length;
      const highBelowFold = high.filter((img) => {
        const r = img.getBoundingClientRect();
        return r.top >= vh;
      }).length;
      return {
        productImgCount: cards.length,
        fetchPriorityHigh: high.length,
        highInViewport,
        highBelowFold,
        highFiles: high.slice(0, 8).map((i) => ({
          file: (i.currentSrc || i.src || "").split("/").pop(),
          top: Math.round(i.getBoundingClientRect().top),
          loading: i.loading,
        })),
      };
    });
  }

  const firstSample = samples[0];
  const firstActive =
    firstSample.bannerImgs?.find((b) => b.inViewport && b.alt) ||
    firstSample.bannerImgs?.[0];
  const wrongCloneAtStart =
    firstActive &&
    typeof firstActive.src === "string" &&
    firstActive.src.includes("bannerdoprava") &&
    !(firstActive.alt || "").includes("Dušičky");

  const report = {
    base: BASE,
    at: new Date().toISOString(),
    metricKind: "PerformanceObserver + DOM (not Lighthouse)",
    carousel: {
      wrongCloneAtStart: Boolean(wrongCloneAtStart),
      firstPaintCandidate: firstActive,
      initialLcpLog: firstSample.lcpLog,
      samplesAfterAutoAdvance: samples.slice(1).map((s, i) => ({
        tick: i + 1,
        activeSrc: s.active?.src,
        activeAlt: s.active?.alt,
        activeComplete: s.active?.complete,
        activeNaturalWidth: s.active?.naturalWidth,
        loadedBannerFiles: s.loadedBannerFiles,
        lcpCandidates: s.lcpLog,
      })),
      note: "Adjacent slides should become complete after idle preload; auto advance ~5s",
    },
    priorityCards: priority,
  };

  const out = path.join(outDir, "carousel-priority.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("Wrote", out);
  await browser.close();

  if (wrongCloneAtStart) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
