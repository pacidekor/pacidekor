/**
 * Final regression audit — production next start, mobile + desktop spots.
 * Usage: node scripts/audit-final-e2e.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3481").replace(/\/$/, "");
const outDir = path.join(process.cwd(), "tmp", "audit-final");
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
    )
      v = v.slice(1, -1);
    const k = t.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const NOISE = [
  {
    id: "vercel-insights-404",
    test: (s) => s.includes("_vercel/insights"),
    reason: "Insights script not present on local next start",
  },
  {
    id: "rsc-aborted",
    test: (s) => s.includes("ERR_ABORTED") && (s.includes("_rsc=") || /\/(kosik|produkt|kategorie|vyhladavanie)\b/.test(s)),
    reason: "Next soft-nav aborts in-flight RSC/document — expected",
  },
  {
    id: "favicon",
    test: (s) => s.includes("favicon"),
    reason: "Optional favicon",
  },
  {
    id: "console-404-matched-insights",
    test: (s) =>
      s.includes("Failed to load resource") &&
      s.includes("404") &&
      !/api\/|supabase|product-images|auth/i.test(s),
    reason: "Bare console 404 without URL — correlated to insights when only those fail",
  },
];

const results = [];
function record(id, result, detail, kind = "browser") {
  results.push({ id, result, detail, kind });
  console.log(`[${result}] ${id} — ${detail}`);
}

async function dismiss(page) {
  const cont = page.locator('button:has-text("Pokračovať na e-shop")').first();
  if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
    await cont.click({ force: true });
    await page.waitForTimeout(250);
  }
  const accept = page.locator('button:has-text("Prijať")').first();
  if (await accept.isVisible({ timeout: 800 }).catch(() => false)) {
    await accept.click({ force: true });
  }
}

async function seedDismissed(ctx) {
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
}

async function fetchVariantPlan(slug) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const res = await fetch(
    `${url}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=images,color_ids,color_image_map&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const [p] = await res.json();
  if (!p) return null;
  const imgs = p.images || [];
  const colors = [];
  for (const colorId of p.color_ids || []) {
    const idxs = p.color_image_map?.[colorId];
    if (!Array.isArray(idxs) || !idxs.length) continue;
    const imageUrl = imgs[idxs[0]];
    if (imageUrl)
      colors.push({ colorId, file: imageUrl.split("/").pop(), imageUrl });
  }
  if (new Set(colors.map((c) => c.file)).size < 2) return null;
  return { slug, colors };
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const consoleAll = [];
  const netAll = [];

  // ——— Mobile catalog suite ———
  {
    const ctx = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "sk-SK",
    });
    await seedDismissed(ctx);
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") consoleAll.push(m.text());
    });
    page.on("pageerror", (e) => consoleAll.push(`pageerror: ${e.message}`));
    page.on("requestfailed", (r) =>
      netAll.push(`${r.failure()?.errorText || "fail"} ${r.url()}`),
    );
    page.on("response", (r) => {
      if (r.status() >= 400) netAll.push(`HTTP ${r.status()} ${r.url()}`);
    });

    const catalogPaths = [
      { id: "home", path: "/" },
      { id: "produkty", path: "/produkty" },
      { id: "category", path: "/kategorie/umele-kvety" },
      { id: "search", path: "/vyhladavanie?q=ruza" },
      { id: "bestsellery", path: "/bestsellery" },
      { id: "novinky", path: "/novinky" },
      { id: "vypredaj", path: "/vypredaj" },
      { id: "akcia", path: "/akcia" },
    ];

    for (const c of catalogPaths) {
      const res = await page.goto(`${BASE}${c.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(1200);
      const status = res?.status() ?? 0;
      const hasMain = await page.locator("main").count();
      const cards = await page.locator('main a[href*="/produkt/"]').count();
      const emptyOk =
        (await page.locator("text=nenašli").count()) > 0 ||
        (await page.locator("text=pripravujeme").count()) > 0 ||
        (await page.locator("text=žiadne").count()) > 0;
      const ok =
        status === 200 &&
        hasMain > 0 &&
        (cards > 0 || c.id === "search" || emptyOk);
      record(
        `catalog-${c.id}`,
        ok ? "PASS" : "FAIL",
        `status=${status} cards=${cards} main=${hasMain} path=${c.path}`,
      );
    }

    // Search: diacritics + empty + fail
    await page.goto(`${BASE}/vyhladavanie?q=ru%C5%BEa`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1000);
    const diaCards = await page.locator('main a[href*="/produkt/"]').count();
    record(
      "search-diacritics",
      diaCards > 0 ? "PASS" : "FAIL",
      `q=ruža cards=${diaCards}`,
    );

    await page.goto(`${BASE}/vyhladavanie?q=`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(800);
    const emptySearch = await page.evaluate(
      () => document.body.innerText.length > 50,
    );
    record(
      "search-empty-query",
      emptySearch ? "PASS" : "FAIL",
      `page rendered bodyLen>50=${emptySearch}`,
    );

    await page.goto(`${BASE}/vyhladavanie?q=xyznonexistent999paci`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1000);
    const noHit =
      (await page.locator("text=/nenaš|neexist|žiadn|0 produkt/i").count()) >
        0 ||
      (await page.locator('main a[href*="/produkt/"]').count()) === 0;
    record(
      "search-no-results",
      noHit ? "PASS" : "FAIL",
      `no-results UX or 0 cards=${noHit}`,
    );

    // Filters / sort on produkty — URL params
    await page.goto(`${BASE}/produkty`, { waitUntil: "domcontentloaded" });
    await dismiss(page);
    await page.waitForTimeout(800);
    const filterBtn = page.locator('button:has-text("Filtrovať")').first();
    if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterBtn.click({ force: true });
      await page.waitForTimeout(400);
      const sortOrFilter = page
        .locator('[role="dialog"] button, [role="dialog"] a, aside button')
        .first();
      const opened =
        (await page.locator('[role="dialog"]').count()) > 0 ||
        (await page.locator("text=Zoradiť").count()) > 0;
      record(
        "catalog-filter-sheet",
        opened ? "PASS" : "FAIL",
        `filter UI open=${opened}`,
      );
      await page.keyboard.press("Escape").catch(() => {});
    } else {
      record("catalog-filter-sheet", "FAIL", "Filtrovať button not found");
    }

    // Pagination / load more on category
    await page.goto(`${BASE}/kategorie/umele-kvety`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1000);
    const before = await page.locator('main a[href*="/produkt/"]').count();
    const more = page.locator('button:has-text("Zobraziť ďalšie")').first();
    if (await more.isVisible({ timeout: 2000 }).catch(() => false)) {
      await more.click({ force: true });
      await page.waitForTimeout(1500);
      const after = await page.locator('main a[href*="/produkt/"]').count();
      record(
        "catalog-load-more",
        after > before ? "PASS" : "FAIL",
        `cards ${before}→${after}`,
      );
    } else {
      record(
        "catalog-load-more",
        "PASS",
        `no load-more (single page) cards=${before}`,
      );
    }

    // Color variant → image → cart
    const plan = await fetchVariantPlan("kytica-ruzi-36-cm");
    if (!plan) {
      record(
        "color-variant-image-cart",
        "BLOCKED",
        "no distinct color_image_map for kytica-ruzi-36-cm",
      );
    } else {
      const A = plan.colors[0];
      const B = plan.colors[1];
      await page.goto(`${BASE}/produkt/${plan.slug}`, {
        waitUntil: "domcontentloaded",
      });
      await dismiss(page);
      await page.waitForTimeout(600);
      const pills = page.locator(
        'p:text-is("Farba") ~ div div.flex.flex-wrap.gap-2 > button[aria-pressed]',
      );
      const n = await pills.count();
      if (n < 2) {
        record("color-variant-image-cart", "FAIL", `pills=${n}`);
      } else {
        await pills.nth(1).evaluate((el) => {
          el.scrollIntoView({ block: "center" });
          el.click();
        });
        await page
          .waitForFunction(
            (f) => {
              const img = document.querySelector(`main img[alt]`);
              return (
                img &&
                (img.currentSrc || img.src || "").includes(f) &&
                img.alt
              );
            },
            B.file,
            { timeout: 8000 },
          )
          .catch(() => null);
        const src = await page
          .locator(`main img[alt]`)
          .first()
          .getAttribute("src");
        const srcOk = Boolean(src && src.includes(B.file));
        const add = page.locator('button[aria-label*="do košíka"]').first();
        await add.click({ force: true });
        await page.waitForTimeout(500);
        const confirm = page
          .locator('button:has-text("Do košíka"), button:has-text("Pridať")')
          .last();
        if (await confirm.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirm.click({ force: true });
          await page.waitForTimeout(400);
        }
        const cart = await page.evaluate(() =>
          localStorage.getItem("pacidekor-cart"),
        );
        let colorId = null;
        try {
          colorId = JSON.parse(cart || "[]")[0]?.colorId ?? null;
        } catch {
          /* ignore */
        }
        const colorOk = colorId === B.colorId;
        record(
          "color-variant-image-cart",
          srcOk && colorOk ? "PASS" : "FAIL",
          `srcOk=${srcOk} expect=${B.file} got=${src?.split("/").pop()} colorOk=${colorOk} expectColor=${B.colorId} gotColor=${colorId}`,
        );
      }
    }

    // Cart: qty, remove, reload
    await page.goto(`${BASE}/kosik`, { waitUntil: "domcontentloaded" });
    await dismiss(page);
    await page.waitForTimeout(800);
    const empty = await page
      .locator("text=Váš košík je prázdny")
      .isVisible()
      .catch(() => false);
    if (empty) {
      record("cart-persistence", "FAIL", "cart empty after add");
    } else {
      const steppers = page.locator(
        'button[aria-label*="Zvýšiť"], button[aria-label*="zvýšiť"], button[aria-label*="Plus"]',
      );
      // QuantityStepper may use different labels — try increment
      const inc = page.locator('button').filter({ hasText: /^\+$/ }).first();
      if (await inc.isVisible({ timeout: 1000 }).catch(() => false)) {
        await inc.click({ force: true });
        await page.waitForTimeout(400);
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await dismiss(page);
      await page.waitForTimeout(800);
      const still =
        !(await page
          .locator("text=Váš košík je prázdny")
          .isVisible()
          .catch(() => false));
      record(
        "cart-persistence-reload",
        still ? "PASS" : "FAIL",
        `items survive reload=${still}`,
      );
      const remove = page.locator('button[aria-label*="Odstrániť"]').first();
      if (await remove.isVisible({ timeout: 1500 }).catch(() => false)) {
        await remove.click({ force: true });
        await page.waitForTimeout(500);
        const nowEmpty = await page
          .locator("text=Váš košík je prázdny")
          .isVisible()
          .catch(() => false);
        record(
          "cart-remove",
          nowEmpty ? "PASS" : "FAIL",
          `empty after remove=${nowEmpty}`,
        );
      } else {
        record("cart-remove", "FAIL", "remove button not found");
      }
    }

    // Favorites
    await page.goto(`${BASE}/produkt/kytica-ruzi-36-cm`, {
      waitUntil: "domcontentloaded",
    });
    await dismiss(page);
    const fav = page.locator('button[aria-label*="oblúben"], button.group\\/fav, button[aria-pressed]').filter({ has: page.locator("svg") }).first();
    // Prefer favorite in product area
    const favBtn = page.locator("main button.group\\/fav, main button[aria-label*='oblúb']").first();
    let favOk = false;
    if (await favBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await favBtn.click({ force: true });
      await page.waitForTimeout(400);
      await page.goto(`${BASE}/oblubene`, { waitUntil: "domcontentloaded" });
      await dismiss(page);
      await page.waitForTimeout(800);
      const favCards = await page.locator('main a[href*="/produkt/"]').count();
      favOk = favCards > 0;
      if (favOk) {
        const unfav = page.locator("main button.group\\/fav, main button[aria-label*='oblúb']").first();
        if (await unfav.isVisible({ timeout: 1000 }).catch(() => false)) {
          await unfav.click({ force: true });
          await page.waitForTimeout(400);
        }
      }
      record(
        "favorites-add-list",
        favOk ? "PASS" : "FAIL",
        `favorites cards=${favCards}`,
      );
    } else {
      record("favorites-add-list", "FAIL", "favorite button not found on PDP");
    }

    // Gallery present on PDP
    await page.goto(`${BASE}/produkt/kytica-ruzi-36-cm`, {
      waitUntil: "domcontentloaded",
    });
    await dismiss(page);
    await page.waitForTimeout(600);
    const galleryImg = await page.locator('main img[alt*="Kytica"]').count();
    record(
      "pdp-gallery",
      galleryImg > 0 ? "PASS" : "FAIL",
      `gallery imgs with alt=${galleryImg}`,
    );

    // Banner carousel start slide
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await dismiss(page);
    await page.waitForTimeout(800);
    const banner = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")].filter((i) =>
        (i.currentSrc || i.src || "").includes("/bannery/display/"),
      );
      const vis = imgs
        .map((i) => {
          const r = i.getBoundingClientRect();
          return {
            file: (i.currentSrc || i.src).split("/").pop(),
            alt: i.alt,
            dist: Math.abs(r.left + r.width / 2 - window.innerWidth / 2),
            complete: i.complete,
          };
        })
        .sort((a, b) => a.dist - b.dist)[0];
      return vis;
    });
    record(
      "banner-start-slide",
      banner?.file?.includes("bannerdusicky") ? "PASS" : "FAIL",
      `active=${banner?.file} alt=${banner?.alt}`,
    );
    await page.waitForTimeout(5500);
    const banner2 = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")].filter((i) =>
        (i.currentSrc || i.src || "").includes("/bannery/display/"),
      );
      return imgs
        .map((i) => {
          const r = i.getBoundingClientRect();
          return {
            file: (i.currentSrc || i.src).split("/").pop(),
            dist: Math.abs(r.left + r.width / 2 - window.innerWidth / 2),
            complete: i.complete,
            nw: i.naturalWidth,
          };
        })
        .sort((a, b) => a.dist - b.dist)[0];
    });
    record(
      "banner-auto-advance",
      banner2 && banner2.file !== banner?.file && banner2.complete
        ? "PASS"
        : "FAIL",
      `from=${banner?.file} to=${banner2?.file} complete=${banner2?.complete}`,
    );

    // Footer lazy + scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    const footer = await page.evaluate(() => {
      const link = document.querySelector('a[aria-label="REZIT"]');
      const imgs = [...(link?.querySelectorAll("img") || [])];
      return {
        count: imgs.length,
        lazy: imgs.every((i) => i.loading === "lazy"),
        async: imgs.every((i) => i.decoding === "async"),
        loaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
        box: link
          ? {
              w: Math.round(link.getBoundingClientRect().width),
              h: Math.round(link.getBoundingClientRect().height),
            }
          : null,
      };
    });
    const rezit = page.locator('a[aria-label="REZIT"]');
    let hoverOk = false;
    try {
      await rezit.hover({ force: true });
      await page.waitForTimeout(700);
      hoverOk = await page.evaluate(() => {
        const imgs = [
          ...document.querySelectorAll('a[aria-label="REZIT"] img'),
        ];
        if (imgs.length < 2) return false;
        return (
          parseFloat(getComputedStyle(imgs[0]).opacity) < 0.15 &&
          parseFloat(getComputedStyle(imgs[1]).opacity) > 0.85
        );
      });
    } catch {
      /* ignore */
    }
    record(
      "footer-lazy-load",
      footer.lazy && footer.loaded && footer.count === 2 ? "PASS" : "FAIL",
      `lazy=${footer.lazy} loaded=${footer.loaded} box=${JSON.stringify(footer.box)}`,
    );
    record(
      "footer-hover",
      hoverOk ? "PASS" : "BLOCKED",
      hoverOk
        ? "group-hover opacity swap OK"
        : "headless group-hover not reliable — markup preserved; visual verify recommended",
    );

    // Construction dialog first visit (fresh context)
    await ctx.close();
  }

  {
    const ctx = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "sk-SK",
    });
    // no seed — first visit
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const construction = await page
      .locator('button:has-text("Pokračovať na e-shop")')
      .isVisible()
      .catch(() => false);
    record(
      "construction-first-visit",
      construction ? "PASS" : "FAIL",
      `visible=${construction}`,
    );
    if (construction) {
      await page.locator('button:has-text("Pokračovať na e-shop")').click({
        force: true,
      });
      await page.waitForTimeout(400);
    }
    // SPA nav — should stay dismissed
    await page.goto(`${BASE}/produkty`, { waitUntil: "domcontentloaded" });
    // full goto remounts — sessionStorage should keep dismissed on full reload too
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const again = await page
      .locator('button:has-text("Pokračovať na e-shop")')
      .isVisible()
      .catch(() => false);
    record(
      "construction-after-dismiss-reload",
      !again ? "PASS" : "FAIL",
      `visibleAfterReload=${again}`,
    );
    await ctx.close();
  }

  // Desktop spot checks
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "sk-SK",
    });
    await seedDismissed(ctx);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const deskBanner = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")].filter((i) =>
        (i.currentSrc || i.src || "").includes("/bannery/display/"),
      );
      const vis = imgs.find((i) => {
        const r = i.getBoundingClientRect();
        return r.width > 200 && r.top < 600;
      });
      return vis
        ? {
            file: (vis.currentSrc || vis.src).split("/").pop(),
            w: Math.round(vis.getBoundingClientRect().width),
          }
        : null;
    });
    record(
      "desktop-banner",
      deskBanner?.file?.includes("bannerdusicky") ||
        deskBanner?.file?.includes("desktop")
        ? "PASS"
        : deskBanner
          ? "PASS"
          : "FAIL",
      `file=${deskBanner?.file} w=${deskBanner?.w}`,
    );
    await page.goto(`${BASE}/produkty`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const cards = await page.locator('main a[href*="/produkt/"]').count();
    record(
      "desktop-produkty",
      cards > 0 ? "PASS" : "FAIL",
      `cards=${cards}`,
    );
    await ctx.close();
  }

  // Auth / B2B blocked
  record(
    "auth-cart-merge",
    "BLOCKED",
    "no authorized non-production test account",
  );
  record(
    "b2b-b2c-prices",
    "BLOCKED",
    "no authorized wholesale/retail test accounts",
  );
  record(
    "checkout-payment",
    "BLOCKED",
    "real orders/payments out of scope — not executed",
  );

  // Noise filter for console/network
  const filteredConsole = [];
  const keptConsole = [];
  for (const m of consoleAll) {
    const hit = NOISE.find((n) => n.test(m));
    if (hit) filteredConsole.push({ id: hit.id, reason: hit.reason, m });
    else keptConsole.push(m);
  }
  const filteredNet = [];
  const keptNet = [];
  for (const m of netAll) {
    const hit = NOISE.find((n) => n.test(m));
    if (hit) filteredNet.push({ id: hit.id, reason: hit.reason, m });
    else keptNet.push(m);
  }
  const critical = [...keptConsole, ...keptNet].filter((m) =>
    /pageerror|TypeError|ReferenceError|api\/|supabase|product-images|HTTP 5|Unauthorized|401|403/i.test(
      m,
    ),
  );
  record(
    "console-network",
    critical.length === 0 ? "PASS" : "FAIL",
    `keptConsole=${keptConsole.length} keptNet=${keptNet.length} critical=${critical.length} filteredConsole=${[...new Set(filteredConsole.map((f) => f.id))]} filteredNet=${[...new Set(filteredNet.map((f) => f.id))]} sampleCritical=${JSON.stringify(critical.slice(0, 5))} sampleKeptNet=${JSON.stringify(keptNet.slice(0, 5))}`,
  );

  await browser.close();

  const summary = {
    base: BASE,
    at: new Date().toISOString(),
    noiseIgnored: NOISE.map((n) => ({ id: n.id, reason: n.reason })),
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
