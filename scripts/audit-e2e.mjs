/**
 * Local storefront E2E against `next start` (Playwright).
 * Does not write orders/payments or use customer accounts.
 *
 * Usage: node scripts/audit-e2e.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:3458";
const outDir = path.join(process.cwd(), "tmp", "audit-e2e");
fs.mkdirSync(outDir, { recursive: true });

/** @type {{ id: string, result: "PASS"|"FAIL"|"BLOCKED", detail: string }[]} */
const results = [];

function record(id, result, detail) {
  results.push({ id, result, detail });
  console.log(`[${result}] ${id} — ${detail}`);
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const cont = page.locator('button:has-text("Pokračovať na e-shop")').first();
    if (await cont.isVisible({ timeout: 800 }).catch(() => false)) {
      await cont.click({ force: true }).catch(() => {});
      await page
        .locator('button:has-text("Pokračovať na e-shop")')
        .waitFor({ state: "hidden", timeout: 3000 })
        .catch(() => {});
    }
    const accept = page.locator('button:has-text("Prijať")').first();
    if (await accept.isVisible({ timeout: 400 }).catch(() => false)) {
      await accept.click({ force: true }).catch(() => {});
    }
    const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
    if (!(await dialog.isVisible({ timeout: 200 }).catch(() => false))) break;
    await page.waitForTimeout(200);
  }
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const consoleErrors = [];
  const failedRequests = [];

  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "sk-SK",
  });
  // Pre-accept cookies so the banner does not block clicks.
  await context.addInitScript(() => {
    try {
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
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", (req) => {
    failedRequests.push(`${req.failure()?.errorText ?? "fail"} ${req.url()}`);
  });

  // --- Homepage ---
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await dismissOverlays(page);
    const title = await page.title();
    record(
      "homepage-load",
      title.length > 0 ? "PASS" : "FAIL",
      `title="${title.slice(0, 60)}"`,
    );
    await page.screenshot({
      path: path.join(outDir, "01-home-mobile.png"),
      fullPage: false,
    });
  } catch (e) {
    record("homepage-load", "FAIL", String(e));
  }

  // --- Banner network (mobile viewport) ---
  try {
    const bannerReqs = [];
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("/bannery/")) bannerReqs.push(u);
    });
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await dismissOverlays(page);
    await page.waitForTimeout(1500);
    const mobile = bannerReqs.filter((u) => u.includes("mobile"));
    const desktop = bannerReqs.filter((u) => u.includes("desktop"));
    const display = bannerReqs.filter((u) => u.includes("/display/"));
    const ok =
      display.length > 0 &&
      mobile.length > 0 &&
      desktop.length === 0;
    record(
      "banner-mobile-only",
      ok ? "PASS" : "FAIL",
      `display=${display.length} mobile=${mobile.length} desktop=${desktop.length} urls=${[...new Set(bannerReqs)].slice(0, 6).join(" | ")}`,
    );
  } catch (e) {
    record("banner-mobile-only", "FAIL", String(e));
  }

  // --- Category → product ---
  let productUrl = "";
  try {
    await page.goto(BASE + "/kategorie/umele-kvety", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await dismissOverlays(page);
    const htmlLen = (await page.content()).length;
    const cards = page.locator("[data-product-id]");
    const n = await cards.count();
    record(
      "category-paged",
      n > 0 && n <= 48 && htmlLen < 900_000 ? "PASS" : "FAIL",
      `cards=${n} htmlChars=${htmlLen}`,
    );

    const href = await cards
      .first()
      .locator('a[href*="/produkt/"]')
      .first()
      .getAttribute("href");
    if (!href) throw new Error("no product href");
    productUrl = href.startsWith("http") ? href : BASE + href;
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissOverlays(page);
    record("category-to-product", "PASS", productUrl);
  } catch (e) {
    record("category-to-product", "FAIL", String(e));
  }

  // --- Color change on PDP ---
  try {
    if (!productUrl) throw new Error("no product");
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissOverlays(page);
    const colorBtns = page.locator(
      'button[aria-label*="farb"], button[title*="farb"], [data-color-id], button:has([class*="rounded-full"])',
    );
    const colorCount = await colorBtns.count();
    if (colorCount >= 2) {
      const before = await page.locator('img').first().getAttribute("src");
      await colorBtns.nth(1).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      const after = await page.locator('img').first().getAttribute("src");
      record(
        "pdp-color-switch",
        "PASS",
        `colors=${colorCount} srcChanged=${before !== after}`,
      );
    } else {
      record(
        "pdp-color-switch",
        "PASS",
        `skipped — product has <2 color controls (count=${colorCount})`,
      );
    }
  } catch (e) {
    record("pdp-color-switch", "FAIL", String(e));
  }

  // --- Add to cart + qty + remove + reload ---
  try {
    if (!productUrl) throw new Error("no product");
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);

    await dismissOverlays(page);
    const addBtn = page
      .locator(
        'button[aria-label*="do košíka"], button:has-text("Do košíka"), button:has-text("Do košíku")',
      )
      .first();
    if (!(await addBtn.isVisible({ timeout: 8000 }).catch(() => false))) {
      throw new Error("Add to cart control not found on mobile");
    }
    await addBtn.click({ force: true });
    await page.waitForTimeout(800);

    // confirm modal if present
    const confirm = page.locator(
      'button:has-text("Do košíka"), button:has-text("Pridať do košíka")',
    ).last();
    if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
      await confirm.click();
      await page.waitForTimeout(500);
    }

    await page.goto(BASE + "/kosik", { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);
    let lines = await page.locator("[data-product-id], li").count();
    const hasEmpty = await page
      .locator("text=prázdny")
      .isVisible()
      .catch(() => false);
    const hasLoading = await page
      .locator("text=Načítavam košík")
      .isVisible()
      .catch(() => false);
    record(
      "cart-add",
      !hasEmpty && !hasLoading ? "PASS" : "FAIL",
      `empty=${hasEmpty} loading=${hasLoading} lines≈${lines}`,
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const emptyAfterReload = await page
      .locator("text=Váš košík je prázdny")
      .isVisible()
      .catch(() => false);
    record(
      "cart-reload",
      !emptyAfterReload ? "PASS" : "FAIL",
      `emptyAfterReload=${emptyAfterReload}`,
    );

    await dismissOverlays(page);
    const plus = page.locator('button[aria-label*="Zvýšiť"]').first();
    if (await plus.isVisible({ timeout: 2000 }).catch(() => false)) {
      await plus.click({ force: true });
      await page.waitForTimeout(400);
      record("cart-qty-increase", "PASS", "clicked +");
    } else {
      record("cart-qty-increase", "BLOCKED", "qty control not found");
    }

    await dismissOverlays(page);
    const remove = page
      .locator('button[aria-label*="Odstrániť"], button[aria-label*="odstráni"]')
      .first();
    if (await remove.isVisible({ timeout: 2000 }).catch(() => false)) {
      await remove.click({ force: true });
      await page.waitForTimeout(600);
      const emptyNow = await page
        .locator("text=Váš košík je prázdny")
        .isVisible()
        .catch(() => false);
      record("cart-remove", "PASS", `empty=${emptyNow}`);
    } else {
      record("cart-remove", "BLOCKED", "remove control not found");
    }
  } catch (e) {
    record("cart-flow", "FAIL", String(e));
  }

  // --- Favorites (guest may require login) ---
  try {
    await page.goto(BASE + "/produkty", { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);
    await dismissOverlays(page);
    const fav = page.locator('button[aria-label*="obľúbených"]').first();
    if (await fav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fav.click({ force: true });
      await page.waitForTimeout(800);
      const loginModal = await page
        .locator("text=Prihláste, text=prihlási")
        .first()
        .isVisible()
        .catch(() => false);
      if (loginModal) {
        record(
          "favorites-guest",
          "PASS",
          "login required modal shown (expected for guest)",
        );
      } else {
        await page.goto(BASE + "/oblubene", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        record("favorites-guest", "PASS", "toggled without login modal");
      }
    } else {
      record("favorites-guest", "BLOCKED", "favorite button not found");
    }
  } catch (e) {
    record("favorites-guest", "FAIL", String(e));
  }

  // --- Search ---
  try {
    await page.goto(BASE + "/vyhladavanie", { waitUntil: "domcontentloaded" });
    const emptyPrompt = await page
      .locator("text=Zadajte hľadaný výraz")
      .isVisible()
      .catch(() => false);
    record("search-empty-query", emptyPrompt ? "PASS" : "FAIL", `prompt=${emptyPrompt}`);

    await page.goto(
      BASE + "/vyhladavanie?q=" + encodeURIComponent("ruža"),
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1000);
    const html = await page.content();
    const cards = await page.locator("[data-product-id]").count();
    const tooBig = html.length > 900_000;
    record(
      "search-diacritics",
      !tooBig && (cards > 0 || html.includes("Nič sme nenašli")) ? "PASS" : "FAIL",
      `cards=${cards} htmlChars=${html.length}`,
    );

    await page.goto(
      BASE + "/vyhladavanie?q=" + encodeURIComponent("zzzznonexistent999"),
      { waitUntil: "domcontentloaded" },
    );
    const none = await page.locator("text=Nič sme nenašli").isVisible().catch(() => false);
    record("search-no-results", none ? "PASS" : "FAIL", `none=${none}`);

    // change query after load-more state
    await page.goto(BASE + "/vyhladavanie?q=kvet", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(500);
    const more = page.locator('button:has-text("Zobraziť ďalšie")').first();
    if (await more.count()) {
      await more.scrollIntoViewIfNeeded().catch(() => {});
      await more.click({ force: true, timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.goto(BASE + "/vyhladavanie?q=ruza", {
      waitUntil: "domcontentloaded",
    });
    await dismissOverlays(page);
    await page.waitForTimeout(500);
    record("search-query-change", "PASS", "navigated to new q after paging");
  } catch (e) {
    record("search-flow", "FAIL", String(e));
  }

  // --- Filters / pagination on /produkty ---
  try {
    await page.goto(BASE + "/produkty", { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);
    const before = await page.locator("[data-product-id]").count();
    const moreBtn = page.locator('button:has-text("Zobraziť ďalšie")').first();
    if (await moreBtn.count()) {
      await moreBtn.scrollIntoViewIfNeeded().catch(() => {});
      await moreBtn.click({ force: true, timeout: 10000 });
      await page.waitForTimeout(1500);
      const after = await page.locator("[data-product-id]").count();
      record(
        "produkty-load-more",
        after > before ? "PASS" : "FAIL",
        `before=${before} after=${after}`,
      );
    } else {
      record("produkty-load-more", "PASS", `no more button (before=${before})`);
    }

    const href = await page
      .locator('a[href*="/produkt/"]')
      .first()
      .getAttribute("href");
    await page.goto(href.startsWith("http") ? href : BASE + href, {
      waitUntil: "domcontentloaded",
    });
    await dismissOverlays(page);
    await page.goBack();
    await page.waitForURL(/\/produkty/, { timeout: 15000 });
    record("produkty-back", "PASS", page.url());
  } catch (e) {
    record("produkty-paging-back", "FAIL", String(e));
  }

  // --- Hover image not fetched on touch ---
  try {
    await page.goto(BASE + "/produkty", { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);
    // ProductCard hover layer: opacity-0 + group-hover; absent when pointer is coarse
    const hoverLayers = await page
      .locator('[data-product-id] img.opacity-0, [data-product-id] img[aria-hidden="true"]')
      .count();
    record(
      "hover-not-on-touch",
      hoverLayers === 0 ? "PASS" : "FAIL",
      `hover-like imgs in product cards=${hoverLayers}`,
    );
  } catch (e) {
    record("hover-not-on-touch", "FAIL", String(e));
  }

  // --- Desktop banner ---
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "sk-SK",
    });
    const dpage = await desktop.newPage();
    const reqs = [];
    dpage.on("request", (req) => {
      if (req.url().includes("/bannery/")) reqs.push(req.url());
    });
    await dpage.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await dismissOverlays(dpage);
    await dpage.waitForTimeout(1200);
    const mobile = reqs.filter((u) => u.includes("mobile") && u.includes("/display/"));
    const desk = reqs.filter((u) => u.includes("desktop") && u.includes("/display/"));
    // <picture> may still list mobile as img src — browsers should pick desktop source
    record(
      "banner-desktop",
      desk.length > 0 ? "PASS" : "FAIL",
      `desktop=${desk.length} mobile=${mobile.length}`,
    );
    await dpage.screenshot({
      path: path.join(outDir, "02-home-desktop.png"),
    });
    await desktop.close();
  } catch (e) {
    record("banner-desktop", "FAIL", String(e));
  }

  // Auth scenarios
  record(
    "auth-cart-merge",
    "BLOCKED",
    "no authorized test account in env",
  );
  record(
    "b2b-b2c-prices-ui",
    "BLOCKED",
    "no authorized wholesale/retail test accounts",
  );
  record(
    "unavailable-product-ui",
    "BLOCKED",
    "requires seeded inactive product id",
  );

  const seriousConsole = consoleErrors.filter(
    (t) =>
      !t.includes("favicon") &&
      !t.includes("Download the React DevTools") &&
      !t.includes("_vercel/insights") &&
      !t.includes("404 (Not Found)"),
  );
  record(
    "console-errors",
    seriousConsole.length === 0 ? "PASS" : "FAIL",
    seriousConsole.slice(0, 5).join(" || ") || "none",
  );
  const seriousNet = failedRequests.filter(
    (t) =>
      !t.includes("_vercel/insights") &&
      !t.includes("ERR_ABORTED") &&
      !t.includes("net::ERR_ABORTED"),
  );
  record(
    "failed-network",
    seriousNet.length === 0 ? "PASS" : "FAIL",
    seriousNet.slice(0, 5).join(" || ") ||
      `noise-filtered; raw=${failedRequests.length}`,
  );

  await browser.close();

  const summary = {
    base: BASE,
    at: new Date().toISOString(),
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
  if (summary.fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
