/**
 * Enrich public/249produkty-ready/KONTROLA-FARBY.txt with 1-based photo maps.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function colorLabel(id) {
  const labels = {
    biela: "biela",
    cervena: "červená",
    ruzova: "ružová",
    fialova: "fialová",
    zelena: "zelená",
    kremova: "krémová",
    oranzova: "oranžová",
    zlta: "žltá",
    modra: "modrá",
    hneda: "hnedá",
    seda: "sivá",
  };
  if (labels[id]) return labels[id];
  if (!id.startsWith("custom:")) return id;
  const raw = id.slice("custom:".length);
  const sep = raw.indexOf(":");
  try {
    return decodeURIComponent(raw.slice(sep + 1));
  } catch {
    return raw.slice(sep + 1);
  }
}

function fmtMap(p) {
  const colors = p.color_ids || [];
  const map = p.color_image_map || {};
  return colors
    .map((id) => {
      const idx = map[id]?.[0];
      const foto = idx == null ? "?" : String(idx + 1);
      return `${colorLabel(id)}→foto ${foto}`;
    })
    .join(", ");
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await sb
    .from("products")
    .select("sku, name, color_ids, images, color_image_map")
    .like("sku", "IMP-249-%")
    .order("sku");
  if (error) throw error;

  const reviewPath = resolve("public/249produkty-ready/KONTROLA-FARBY.txt");
  let sureSkus = new Set();
  if (existsSync(reviewPath)) {
    const txt = readFileSync(reviewPath, "utf8");
    const after = txt.split("========== ISTÉ")[1] || "";
    sureSkus = new Set(after.match(/IMP-249-\d+/g) || []);
  }

  const multi = (data || []).filter((p) => (p.color_ids || []).length >= 2);
  const single = (data || []).filter((p) => (p.color_ids || []).length < 2);
  const sure = multi.filter((p) => sureSkus.has(p.sku));
  const need = multi.filter((p) => !sureSkus.has(p.sku));

  const lines = [
    "IMP-249 – kontrola mapování barev ↔ fotky",
    "Vygenerováno po vision remap + RGB kontrole.",
    "",
    `Vícbarevné: ${multi.length} | Jednobarevné (skip): ${single.length}`,
    `✅ Spíš OK: ${sure.length}`,
    `⚠️ Ke kontrole: ${need.length}`,
    "",
    "V adminu filtruj SKU: IMP-249",
    "Čísla fotek jsou 1-based (foto 1 = první obrázek v galerii).",
    "U produktů s přehledovou fotkou bývá foto 1 skupinová – barvy by měly mířit na jednotlivé varianty.",
    "",
    "========== KE KONTROLE ==========",
  ];

  for (const p of need) {
    lines.push(
      `${p.sku} | ${p.name} | ${(p.color_ids || []).length} farieb / ${(p.images || []).length} fotiek`,
    );
    lines.push(`   mapa: ${fmtMap(p)}`);
  }

  lines.push("");
  lines.push("========== ISTÉ (skip, pokud ti sedí) ==========");
  for (const p of sure) {
    lines.push(`${p.sku} | ${p.name}`);
    lines.push(`   mapa: ${fmtMap(p)}`);
  }

  lines.push("");
  lines.push("========== JEDNOBAREVNÉ ==========");
  for (const p of single) {
    const cols = (p.color_ids || []).map(colorLabel).join(", ") || "—";
    lines.push(`${p.sku} | ${p.name} | ${cols}`);
  }

  writeFileSync(reviewPath, lines.join("\n") + "\n", "utf8");
  console.log(`need=${need.length} sure=${sure.length} single=${single.length}`);
  console.log(`→ ${reviewPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
