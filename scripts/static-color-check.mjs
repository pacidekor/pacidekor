/**
 * ŠETRNÁ VALIDACE BEZ AI - najde očividné problémy v color_image_map
 * 0% usage rate! 
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
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
  if (!id.startsWith("custom:")) {
    const labels = {
      biela: "Biela", cervena: "Červená", ruzova: "Ružová", fialova: "Fialová",
      zelena: "Zelená", kremova: "Krémová", oranzova: "Oranžová", zlta: "Žltá", 
      modra: "Modrá", hneda: "Hnedá", seda: "Šedá",
    };
    return labels[id] || id;
  }
  try {
    const parts = id.split(":");
    if (parts.length >= 3) return decodeURIComponent(parts[2]);
  } catch (e) {}
  return id;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: products, error } = await sb
    .from("products")
    .select("sku, name, color_ids, images, color_image_map")
    .or("sku.like.IMP-249-%,sku.like.IMP-NEJ-%")
    .order("sku");

  if (error) throw error;

  console.log(`📊 STATICKÁ ANALÝZA: ${products.length} produktů (0% AI usage)`);

  const issues = [];
  const csvRows = ["SKU,Product_Name,Issue_Type,Color,Problem,Severity"];

  for (const p of products) {
    const { sku, name, color_ids = [], images = [], color_image_map = {} } = p;

    // 1. Chybějící color_image_map pro barvy
    const unmappedColors = color_ids.filter(c => !color_image_map[c] || color_image_map[c].length === 0);
    for (const colorId of unmappedColors) {
      const issue = `No image assigned to color`;
      issues.push({ sku, name, type: "Missing Mapping", color: colorLabel(colorId), problem: issue, severity: "HIGH" });
      csvRows.push(`${sku},"${name}","Missing Mapping","${colorLabel(colorId)}","${issue}","HIGH"`);
    }

    // 2. Neexistující obrázky v mapě
    for (const [colorId, imageIndexes] of Object.entries(color_image_map)) {
      for (const idx of imageIndexes) {
        if (idx >= images.length || !images[idx]) {
          const issue = `Image index ${idx} doesn't exist (max: ${images.length - 1})`;
          issues.push({ sku, name, type: "Broken Link", color: colorLabel(colorId), problem: issue, severity: "HIGH" });
          csvRows.push(`${sku},"${name}","Broken Link","${colorLabel(colorId)}","${issue}","HIGH"`);
        }
      }
    }

    // 3. Podezřelé mapování (stejný index pro více barev)
    const indexUsage = new Map();
    for (const [colorId, imageIndexes] of Object.entries(color_image_map)) {
      for (const idx of imageIndexes) {
        if (!indexUsage.has(idx)) indexUsage.set(idx, []);
        indexUsage.get(idx).push(colorLabel(colorId));
      }
    }
    
    for (const [idx, colors] of indexUsage) {
      if (colors.length > 1) {
        const issue = `Image ${idx} shared by: ${colors.join(", ")}`;
        issues.push({ sku, name, type: "Shared Image", color: colors.join("+"), problem: issue, severity: "MEDIUM" });
        csvRows.push(`${sku},"${name}","Shared Image","${colors.join("+")}","${issue}","MEDIUM"`);
      }
    }

    // 4. Očividné color vs name mismatches
    const suspiciousNames = [
      { words: ["čiern", "black"], expectedColors: ["cierna"] },
      { words: ["červ", "red"], expectedColors: ["cervena"] },
      { words: ["biel", "white"], expectedColors: ["biela"] },
      { words: ["zelen", "green"], expectedColors: ["zelena"] },
    ];

    for (const { words, expectedColors } of suspiciousNames) {
      const nameHasColor = words.some(w => name.toLowerCase().includes(w));
      const hasExpectedColor = expectedColors.some(c => color_ids.includes(c));
      
      if (nameHasColor && !hasExpectedColor) {
        const issue = `Name suggests '${words[0]}*' but no matching color found`;
        issues.push({ sku, name, type: "Name-Color Mismatch", color: "N/A", problem: issue, severity: "LOW" });
        csvRows.push(`${sku},"${name}","Name-Color Mismatch","N/A","${issue}","LOW"`);
      }
    }

    // 5. Produkty s 1 barvou ale více fotek (možná chybí mapování)
    if (color_ids.length === 1 && images.length > 3) {
      const issue = `Only 1 color but ${images.length} images - possible missing color variants`;
      issues.push({ sku, name, type: "Potential Missing Colors", color: colorLabel(color_ids[0]), problem: issue, severity: "LOW" });
      csvRows.push(`${sku},"${name}","Potential Missing Colors","${colorLabel(color_ids[0])}","${issue}","LOW"`);
    }
  }

  writeFileSync("static_validation_report.csv", csvRows.join('\n'), 'utf8');

  console.log(`\n📊 NALEZENÉ PROBLÉMY:`);
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  issues.forEach(i => bySeverity[i.severity]++);

  console.log(`🔴 HIGH (kritické): ${bySeverity.HIGH}`);
  console.log(`🟡 MEDIUM (podezřelé): ${bySeverity.MEDIUM}`);  
  console.log(`🟢 LOW (kontrola): ${bySeverity.LOW}`);
  console.log(`📁 Report: static_validation_report.csv`);

  // Ukázka nejhorších problémů
  const highIssues = issues.filter(i => i.severity === "HIGH").slice(0, 10);
  if (highIssues.length > 0) {
    console.log(`\n🔴 TOP KRITICKÉ PROBLÉMY:`);
    highIssues.forEach(i => 
      console.log(`   ${i.sku}: ${i.color} - ${i.problem}`)
    );
  }

  console.log(`\n💰 COST: 0% AI usage!`);
}

main().catch(console.error);