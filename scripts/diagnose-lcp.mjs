/**
 * Real-browser LCP diagnosis (not Lighthouse simulate).
 * Separates first-visit (construction+cookies) vs returning browse.
 *
 * Usage: node scripts/diagnose-lcp.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3460").replace(/\/$/, "");
const outDir = path.join(process.cwd(), "tmp", "lcp-diag");
fs.mkdirSync(outDir, { recursive: true });

const LCP_HOOK = () => {
  window.__lcpDiag = {
    entries: [],
    resources: [],
    nav: performance.getEntriesByType("navigation")[0]
      ? {
          domContentLoaded:
            performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd,
          loadEventEnd: performance.getEntriesByType("navigation")[0].loadEventEnd,
          responseEnd: performance.getEntriesByType("navigation")[0].responseEnd,
        }
      : null,
  };
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const el = e.element;
        window.__lcpDiag.entries.push({
          time: e.startTime,
          size: e.size,
          url: e.url || null,
          tag: el?.tagName || null,
          id: el?.id || null,
          className: typeof el?.className === "string" ? el.className.slice(0, 120) : null,
          src: el?.currentSrc || el?.src || el?.getAttribute?.("src") || null,
          alt: el?.getAttribute?.("alt") || null,
          loading: el?.getAttribute?.("loading") || null,
          fetchPriority: el?.getAttribute?.("fetchpriority") || null,
          decoding: el?.getAttribute?.("decoding") || null,
        });
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (err) {
    window.__lcpDiag.poError = String(err);
  }
};

async function collect(page, label) {
  await page.waitForTimeout(2500);
  const data = await page.evaluate(() => {
    const diag = window.__lcpDiag || { entries: [] };
    const last = diag.entries[diag.entries.length - 1] || null;
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
    const banners = resources.filter((r) => r.name.includes("/bannery/"));
    const images = resources.filter((r) => r.initiatorType === "img" || /\.(webp|jpg|png|avif)(\?|$)/i.test(r.name));
    let matched = null;
    if (last?.src || last?.url) {
      const key = last.src || last.url;
      matched =
        resources.find((r) => r.name === key || r.name.endsWith(key.replace(/^https?:\/\/[^/]+/, ""))) ||
        resources.find((r) => key && r.name.includes(key.split("/").pop()));
    }
    const constructionVisible = Array.from(
      document.querySelectorAll('div[role="dialog"]'),
    ).some((d) => {
      const t = d.textContent || "";
      return (
        t.includes("Nakupovanie ešte nie je spustené") ||
        t.includes("Pokračovať na e-shop")
      );
    });
    const cookieVisible = Array.from(
      document.querySelectorAll('div[role="dialog"]'),
    ).some(
      (d) =>
        (d.textContent || "").toLowerCase().includes("cookies") ||
        (d.textContent || "").includes("Cookies"),
    );

    return {
      lcp: last,
      allLcp: diag.entries,
      nav: diag.nav,
      matchedResource: matched,
      bannerResources: banners,
      topImages: images
        .sort((a, b) => b.encodedBodySize - a.encodedBodySize)
        .slice(0, 8),
      constructionVisible,
      cookieVisible,
      href: location.href,
    };
  });

  data.label = label;
  if (data.lcp && data.matchedResource) {
    const dlDone = data.matchedResource.responseEnd;
    data.downloadToPaintMs =
      typeof data.lcp.time === "number" && typeof dlDone === "number"
        ? Math.round(data.lcp.time - dlDone)
        : null;
  }
  return data;
}

async function dismissConstruction(page) {
  const btn = page.locator('button:has-text("Pokračovať na e-shop")').first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click({ force: true });
    await page
      .locator('button:has-text("Pokračovať na e-shop")')
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {});
  }
}

async function dismissCookies(page) {
  const btn = page.locator('button:has-text("Prijať")').first();
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click({ force: true });
  }
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const report = { base: BASE, at: new Date().toISOString(), scenarios: {} };

  // --- A: cold first visit (no cookie seed) ---
  {
    const ctx = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "sk-SK",
    });
    const page = await ctx.newPage();
    await page.addInitScript(LCP_HOOK);
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    report.scenarios.firstVisitHome = await collect(page, "first-visit-home");
    await page.screenshot({
      path: path.join(outDir, "first-visit-home.png"),
    });

    // Does construction reopen on client navigation?
    await dismissCookies(page);
    await dismissConstruction(page);
    await page.waitForTimeout(400);
    const afterDismiss = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[role="dialog"]')).some((d) =>
        (d.textContent || "").includes("Pokračovať na e-shop"),
      ),
    );

    // Client nav via in-app link
    await page.locator('a[href="/produkty"]').first().click({ force: true }).catch(async () => {
      await page.evaluate(() => {
        const a = document.querySelector('a[href="/produkty"]');
        if (a) a.click();
      });
    });
    await page.waitForURL(/\/produkty/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const onProdukty = await page.evaluate(() => ({
      href: location.href,
      constructionVisible: Array.from(
        document.querySelectorAll('div[role="dialog"]'),
      ).some((d) => (d.textContent || "").includes("Pokračovať na e-shop")),
    }));

    // Navigate back home via client
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" }); // full reload baseline
    // Better: use link from produkty - already left. Re-open fresh SPA path:
    await page.addInitScript(LCP_HOOK);
    // Actually full goto remounts. Test SPA: from produkty click Domov
    await page.goto(BASE + "/produkty", { waitUntil: "domcontentloaded" });
    await dismissConstruction(page);
    await dismissCookies(page);
    await page.locator('a[href="/"]').first().click({ force: true }).catch(async () => {
      await page.evaluate(() => {
        const a = document.querySelector('a[href="/"]');
        if (a) a.click();
      });
    });
    await page.waitForTimeout(1000);
    const afterClientHome = await page.evaluate(() => ({
      href: location.href,
      constructionVisible: Array.from(
        document.querySelectorAll('div[role="dialog"]'),
      ).some((d) => (d.textContent || "").includes("Pokračovať na e-shop")),
    }));

    report.scenarios.constructionNav = {
      afterDismissOnHome: afterDismiss,
      afterClientNavToProdukty: onProdukty,
      afterClientNavBackHome: afterClientHome,
      note: "Full page.goto remounts layout and will show construction again; SPA Link should keep dismissed state if layout persists.",
    };
    await ctx.close();
  }

  // --- B: returning browse (cookies accepted; dismiss construction ASAP then measure after clear) ---
  {
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
    const page = await ctx.newPage();
    await page.addInitScript(LCP_HOOK);

    // Warm: land, dismiss construction immediately, reload without construction? 
    // Construction has no persistence — so "returning" = dismiss then measure in same document
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissConstruction(page);
    // Reset LCP observer observation window by soft wait — LCP may already have fired with dialog
    // Soft navigate away and back via SPA to get LCP without dialog covering
    await page.evaluate(() => {
      window.__lcpDiag = { entries: [], resources: [], nav: null };
    });
    await page.addInitScript(LCP_HOOK);
    await page.locator('a[href="/produkty"]').first().click({ force: true }).catch(() => {});
    await page.waitForURL(/\/produkty/, { timeout: 15000 }).catch(() => {});
    await dismissConstruction(page);
    await page.locator('a[href="/"]').first().click({ force: true }).catch(() => {});
    await page.waitForURL((u) => u.pathname === "/" || u.href.endsWith("/"), {
      timeout: 15000,
    }).catch(() => {});
    await page.waitForTimeout(500);
    // Re-install observer on this document
    await page.evaluate(LCP_HOOK);
    await page.reload({ waitUntil: "domcontentloaded" });
    // After reload construction returns — for true returning we need session persistence OR measure post-dismiss LCP update
    await dismissConstruction(page);
    await page.waitForTimeout(3000);
    report.scenarios.returningReloadStillShowsConstruction = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('div[role="dialog"]')).some((d) =>
          (d.textContent || "").includes("Pokračovať na e-shop"),
        ),
    );

    // Measure LCP after dismiss on same load (LCP can update)
    report.scenarios.afterDismissSameLoadHome = await collect(
      page,
      "after-dismiss-same-load-home",
    );

    await ctx.close();
  }

  // --- C: clean measure with construction disabled via cookie? Can't without rebuild.
  // Instead: inject CSS to hide dialog immediately via init script for "browse" baseline
  {
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
    // Hide construction overlay ASAP so LCP reflects real content (diagnostic only)
    await ctx.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent =
        'div.fixed.inset-0.z-\\[90\\], div[class*="z-[90]"]{display:none!important;pointer-events:none!important}';
      document.documentElement.appendChild(style);
    });
    const page = await ctx.newPage();
    await page.addInitScript(LCP_HOOK);
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    report.scenarios.homeContentOnlyDiag = await collect(
      page,
      "home-content-only-overlay-hidden",
    );
    await page.screenshot({
      path: path.join(outDir, "home-content-only.png"),
    });

    await page.addInitScript(LCP_HOOK);
    await page.goto(BASE + "/kategorie/umele-kvety", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    report.scenarios.categoryContentOnlyDiag = await collect(
      page,
      "category-content-only",
    );
    await page.screenshot({
      path: path.join(outDir, "category-content-only.png"),
    });
    await ctx.close();
  }

  // --- D: first-visit category with dialogs ---
  {
    const ctx = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "sk-SK",
    });
    const page = await ctx.newPage();
    await page.addInitScript(LCP_HOOK);
    await page.goto(BASE + "/kategorie/umele-kvety", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    report.scenarios.firstVisitCategory = await collect(
      page,
      "first-visit-category",
    );
    await ctx.close();
  }

  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
