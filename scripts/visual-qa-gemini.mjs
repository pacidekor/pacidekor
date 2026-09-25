/**
 * FREE Gemini Vision QA - 15k requests/den ZDARMA!
 * npm install @google/generative-ai
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
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

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function validateWithGemini(gemini, imageUrl, declaredColor, productName) {
  const colorName = colorLabel(declaredColor);
  
  const imageBase64 = await fetchImageAsBase64(imageUrl);
  
  const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `QA VISUAL CHECK:
Product: "${productName}"
DECLARED COLOR: "${colorName}"

Does the MAIN product color match "${colorName}"?
Focus ONLY on main product/flower, ignore background/leaves.

Reply JSON: {"status": "MATCH"|"MISMATCH"|"UNSURE", "detected": "color seen", "confidence": 0-100}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType: "image/webp"
      }
    }
  ]);

  const text = result.response.text();
  
  try {
    return JSON.parse(text);
  } catch {
    // Fallback parsing
    return {
      status: text.includes("MATCH") && !text.includes("MISMATCH") ? "MATCH" : 
              text.includes("MISMATCH") ? "MISMATCH" : "UNSURE",
      detected: text.slice(0, 50),
      confidence: 50
    };
  }
}

async function main() {
  const env = loadEnv();
  
  if (!env.GOOGLE_API_KEY) {
    console.error("❌ Missing GOOGLE_API_KEY in .env.local");
    console.log("Get free key: https://aistudio.google.com/app/apikey");
    process.exit(1);
  }

  const gemini = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Validuj jen problematické produkty ze statické analýzy
  const problematicSkus = [
    "IMP-249-003", "IMP-249-004", "IMP-NEJ-013", "IMP-NEJ-031", 
    "IMP-NEJ-032", "IMP-NEJ-105", "IMP-NEJ-106"
  ];

  const { data: products, error } = await sb
    .from("products")
    .select("sku, name, color_ids, images, color_image_map")
    .in("sku", problematicSkus);

  if (error) throw error;

  console.log(`🎯 FREE Gemini validace: ${products.length} problematických produktů`);

  const csvRows = ["SKU,Declared_Color,Detected_Color,Status,Confidence"];
  let total = 0, match = 0, mismatch = 0, errors = 0;

  for (const product of products) {
    const { sku, name, color_ids = [], images = [], color_image_map = {} } = product;
    
    console.log(`\n🔍 ${sku}: ${name}`);

    // Jen první barva pro test
    const colorId = color_ids[0];
    const imageIndexes = color_image_map[colorId] || [0];
    const imageUrl = images[imageIndexes[0]];
    
    if (!imageUrl) {
      console.log(`   ❌ No image found`);
      continue;
    }

    try {
      console.log(`   🔍 ${colorLabel(colorId)}: Validating...`);
      
      const result = await validateWithGemini(gemini, imageUrl, colorId, name);
      const { status, detected = "", confidence = 0 } = result;
      
      csvRows.push(`${sku},"${colorLabel(colorId)}","${detected}","${status}",${confidence}`);
      
      if (status === "MATCH") {
        console.log(`   ✅ ${colorLabel(colorId)}: MATCH (${confidence}%)`);
        match++;
      } else if (status === "MISMATCH") {
        console.log(`   ❌ ${colorLabel(colorId)}: MISMATCH - ${detected}`);
        mismatch++;
      } else {
        console.log(`   ❓ ${colorLabel(colorId)}: UNSURE - ${detected}`);
      }
      
      total++;
      await new Promise(r => setTimeout(r, 1000)); // Be nice to free API
      
    } catch (error) {
      console.error(`   💥 ERROR: ${error.message}`);
      errors++;
    }
  }

  writeFileSync("gemini_validation.csv", csvRows.join('\n'), 'utf8');

  console.log(`\n📊 GEMINI FREE RESULTS:`);
  console.log(`✅ MATCH: ${match}/${total}`);
  console.log(`❌ MISMATCH: ${mismatch}/${total}`);
  console.log(`💥 ERRORS: ${errors}`);
  console.log(`💰 COST: FREE (${total}/15000 daily limit used)`);
}

main().catch(console.error);