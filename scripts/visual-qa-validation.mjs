/**
 * QA Visual Validation Script - přísná vizuální kontrola produktů IMP-249-* a IMP-NEJ-*
 * 
 * Systematicky ověřuje shodu mezi deklarovanou barvou v metadatech a skutečnou barvou na fotce.
 * KRITICKÉ PRAVIDLA:
 * 1. ATOMIZACE: Zpracovává jeden produkt/barvu po druhém
 * 2. VIZUÁLNÍ KOTVY: Pouze barva květu/produktu, ignoruje pozadí/stonky/obaly
 * 3. NULOVÉ HÁDÁNÍ: Nejasné případy označí jako "UNSURE"
 * 
 * Usage:
 *   node scripts/visual-qa-validation.mjs --dry-run --limit 5
 *   node scripts/visual-qa-validation.mjs --prefix IMP-249
 *   node scripts/visual-qa-validation.mjs --prefix IMP-NEJ
 *   node scripts/visual-qa-validation.mjs (validuje oba prefixy)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: null,
    only: null, // specific SKU
    prefix: null, // IMP-249 or IMP-NEJ, null means both
    output: "validation_report.csv",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--only") args.only = argv[++i];
    else if (argv[i] === "--prefix") args.prefix = argv[++i];
    else if (argv[i] === "--output") args.output = argv[++i];
  }
  return args;
}

// Převede color_id na čitelný název
function colorLabel(id) {
  if (!id.startsWith("custom:")) {
    const labels = {
      biela: "Biela",
      cervena: "Červená", 
      ruzova: "Ružová",
      fialova: "Fialová",
      zelena: "Zelená",
      kremova: "Krémová",
      oranzova: "Oranžová",
      zlta: "Žltá", 
      modra: "Modrá",
      hneda: "Hnedá",
      seda: "Šedá",
    };
    return labels[id] || id;
  }
  
  try {
    const parts = id.split(":");
    if (parts.length >= 3) {
      return decodeURIComponent(parts[2]);
    }
  } catch (e) {
    console.warn(`Failed to decode color label: ${id}`);
  }
  return id;
}

// Vizuální validace jedné barvy na konkrétní fotce
async function validateColorOnImage({ apiKey, imageUrl, declaredColor, productName, sku, imageIndex }) {
  const colorName = colorLabel(declaredColor);
  
  const prompt = `STRICT QA VISUAL INSPECTOR TASK:

Product: "${productName}" (${sku})
Image index: ${imageIndex}
DECLARED COLOR: "${colorName}"

Your task is to verify if the MAIN PRODUCT/FLOWER COLOR in this photo EXACTLY matches the declared color "${colorName}".

CRITICAL RULES:
1. FOCUS ONLY on the main product/flower color - IGNORE background, leaves, stems, packaging
2. If the photo is overexposed, blurry, unclear, or you're not 100% certain: return "UNSURE"  
3. Do NOT guess or make assumptions
4. Compare the actual visible flower/product color to the declared color name

Return JSON with:
{
  "status": "MATCH" | "MISMATCH" | "UNSURE",
  "detected_color_description": "brief description of what color you actually see in the main product",
  "confidence": 0-100,
  "reason": "explanation for MISMATCH or UNSURE status"
}`;

  const content = [
    { type: "text", text: prompt },
    { 
      type: "image_url", 
      image_url: { url: imageUrl, detail: "high" }
    }
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a strict QA visual inspector for e-commerce. Reply with JSON only. Be extremely careful about color matching - when in doubt, mark as UNSURE."
        },
        { role: "user", content }
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const responseText = json.choices?.[0]?.message?.content || "{}";
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText.slice(0, 200)}`);
  }
}

// Hlavní funkce
async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  
  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in .env.local");
  }

  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Načti produkty
  let query = sb
    .from("products")
    .select("id, sku, name, color_ids, images, color_image_map")
    .order("sku");

  if (args.only) {
    query = query.eq("sku", args.only);
  } else if (args.prefix) {
    query = query.like("sku", `${args.prefix}-%`);
  } else {
    // Oba prefixy
    query = query.or("sku.like.IMP-249-%,sku.like.IMP-NEJ-%");
  }

  const { data: products, error } = await query;
  if (error) throw new Error(`DB error: ${error.message}`);

  if (args.limit) {
    products.splice(args.limit);
  }

  console.log(`QA Visual validation: ${products.length} produktů ${args.dryRun ? "(DRY RUN)" : ""}...`);

  // Prepare CSV output
  const csvRows = ["Product_Folder_Name,SKU,Declared_Color,Detected_Color,Status,Confidence,Reason"];
  
  let totalValidations = 0;
  let matchCount = 0;
  let mismatchCount = 0;
  let unsureCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const { sku, name, color_ids = [], images = [], color_image_map = {} } = product;
    
    console.log(`\n🔍 Validating ${sku}: ${name}`);
    console.log(`   Colors: ${color_ids.length}, Images: ${images.length}`);

    // Pro každou barvu ověř přiřazenou fotku
    for (const colorId of color_ids) {
      const assignedImages = color_image_map[colorId] || [];
      
      if (assignedImages.length === 0) {
        console.log(`   ⚠️  ${colorLabel(colorId)}: Žádná přiřazená fotka`);
        csvRows.push(`${sku},${sku},${colorLabel(colorId)},,UNSURE,0,No assigned image`);
        unsureCount++;
        totalValidations++;
        continue;
      }

      // Vezmi první přiřazenou fotku pro tuto barvu
      const imageIndex = assignedImages[0];
      const imageUrl = images[imageIndex];
      
      if (!imageUrl) {
        console.log(`   ❌ ${colorLabel(colorId)}: Neexistující obrázek na indexu ${imageIndex}`);
        csvRows.push(`${sku},${sku},${colorLabel(colorId)},,UNSURE,0,Missing image at index ${imageIndex}`);
        unsureCount++;
        totalValidations++;
        continue;
      }

      if (args.dryRun) {
        console.log(`   🔍 ${colorLabel(colorId)}: Fotka ${imageIndex} -> ${imageUrl.slice(-20)} (DRY RUN)`);
        csvRows.push(`${sku},${sku},${colorLabel(colorId)},DRY_RUN,MATCH,100,Dry run mode`);
        matchCount++;
        totalValidations++;
        continue;
      }

      try {
        console.log(`   🔍 ${colorLabel(colorId)}: Validating image ${imageIndex}...`);
        
        const validation = await validateColorOnImage({
          apiKey: env.OPENAI_API_KEY,
          imageUrl,
          declaredColor: colorId,
          productName: name,
          sku,
          imageIndex
        });

        const { status, detected_color_description, confidence = 0, reason = "" } = validation;
        
        csvRows.push(`${sku},${sku},"${colorLabel(colorId)}","${detected_color_description || ''}",${status},${confidence},"${reason}"`);
        
        if (status === "MATCH") {
          console.log(`   ✅ ${colorLabel(colorId)}: MATCH (${confidence}%)`);
          matchCount++;
        } else if (status === "MISMATCH") {
          console.log(`   ❌ ${colorLabel(colorId)}: MISMATCH - ${reason}`);
          mismatchCount++;
        } else {
          console.log(`   ❓ ${colorLabel(colorId)}: UNSURE - ${reason}`);
          unsureCount++;
        }
        
        totalValidations++;
        
        // Rate limiting - kratší pauza s GPT-4o
        await new Promise(resolve => setTimeout(resolve, 800));
        
      } catch (error) {
        console.error(`   💥 ${colorLabel(colorId)}: ERROR - ${error.message}`);
        csvRows.push(`${sku},${sku},${colorLabel(colorId)},,UNSURE,0,"API Error: ${error.message.replace(/"/g, "''")}"`);
        errorCount++;
        totalValidations++;
      }
    }
  }

  // Zápis výsledků
  const csvContent = csvRows.join('\n');
  writeFileSync(args.output, csvContent, 'utf8');

  console.log(`\n📊 FINAL REPORT:`);
  console.log(`Total validations: ${totalValidations}`);
  console.log(`✅ MATCH: ${matchCount} (${((matchCount/totalValidations)*100).toFixed(1)}%)`);
  console.log(`❌ MISMATCH: ${mismatchCount} (${((mismatchCount/totalValidations)*100).toFixed(1)}%)`);
  console.log(`❓ UNSURE: ${unsureCount} (${((unsureCount/totalValidations)*100).toFixed(1)}%)`);
  console.log(`💥 ERRORS: ${errorCount}`);
  console.log(`\n📁 Report saved to: ${args.output}`);
}

main().catch(console.error);