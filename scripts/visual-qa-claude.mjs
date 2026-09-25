/**
 * Claude Vision QA - bez rate limit pekla
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

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: null,
    prefix: "IMP-249",
    output: "claude_validation.csv",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--prefix") args.prefix = argv[++i];
    else if (argv[i] === "--output") args.output = argv[++i];
  }
  return args;
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

// Fetch image as base64
async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function validateWithClaude({ apiKey, imageUrl, declaredColor, productName, sku, imageIndex }) {
  const colorName = colorLabel(declaredColor);
  
  try {
    const imageBase64 = await fetchImageAsBase64(imageUrl);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `STRICT QA VISUAL INSPECTOR:

Product: "${productName}" (${sku})
Image: ${imageIndex}
DECLARED COLOR: "${colorName}"

Task: Does the MAIN PRODUCT COLOR match "${colorName}"?

RULES:
- Focus ONLY on main product/flower color
- IGNORE background, leaves, stems, packaging  
- If unclear/blurry: return "UNSURE"
- Be strict about color matching

Return JSON:
{
  "status": "MATCH"|"MISMATCH"|"UNSURE",
  "detected": "brief color description", 
  "confidence": 0-100,
  "reason": "explanation if not MATCH"
}`
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/webp",
                  data: imageBase64
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || "{}";
    
    try {
      return JSON.parse(content);
    } catch {
      // Fallback parsing
      const match = content.match(/"status":\s*"([^"]+)"/);
      const detected = content.match(/"detected":\s*"([^"]+)"/);
      const confidence = content.match(/"confidence":\s*(\d+)/);
      
      return {
        status: match?.[1] || "UNSURE",
        detected: detected?.[1] || "Parse error",
        confidence: confidence ? parseInt(confidence[1]) : 50,
        reason: content.includes("MISMATCH") ? "Parse error in response" : ""
      };
    }
  } catch (error) {
    throw new Error(`Claude validation error: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  
  if (!env.ANTHROPIC_API_KEY) {
    console.error("❌ Missing ANTHROPIC_API_KEY in .env.local");
    console.log("Add: ANTHROPIC_API_KEY=your_key_here");
    process.exit(1);
  }

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  let query = sb
    .from("products")
    .select("id, sku, name, color_ids, images, color_image_map")
    .order("sku");

  if (args.prefix) query = query.like("sku", `${args.prefix}-%`);

  const { data: products, error } = await query;
  if (error) throw new Error(`DB error: ${error.message}`);

  if (args.limit) products.splice(args.limit);

  console.log(`🎯 Claude Visual QA: ${products.length} produktů ${args.dryRun ? "(DRY)" : ""}...`);

  const csvRows = ["SKU,Declared_Color,Detected_Color,Status,Confidence,Reason"];
  
  let total = 0, match = 0, mismatch = 0, unsure = 0, errors = 0;

  for (const product of products) {
    const { sku, name, color_ids = [], images = [], color_image_map = {} } = product;
    
    console.log(`\n🔍 ${sku}: ${name}`);

    for (const colorId of color_ids) {
      const assignedImages = color_image_map[colorId] || [];
      
      if (assignedImages.length === 0) {
        console.log(`   ❓ ${colorLabel(colorId)}: No assigned image`);
        csvRows.push(`${sku},"${colorLabel(colorId)}",,"UNSURE",0,"No assigned image"`);
        unsure++; total++;
        continue;
      }

      const imageIndex = assignedImages[0];
      const imageUrl = images[imageIndex];
      
      if (!imageUrl) {
        console.log(`   ❌ ${colorLabel(colorId)}: Missing image ${imageIndex}`);
        csvRows.push(`${sku},"${colorLabel(colorId)}",,"UNSURE",0,"Missing image ${imageIndex}"`);
        unsure++; total++;
        continue;
      }

      if (args.dryRun) {
        console.log(`   🔍 ${colorLabel(colorId)}: Image ${imageIndex} (DRY)`);
        csvRows.push(`${sku},"${colorLabel(colorId)}","DRY_RUN","MATCH",100,"Dry run"`);
        match++; total++;
        continue;
      }

      try {
        console.log(`   🔍 ${colorLabel(colorId)}: Validating...`);
        
        const result = await validateWithClaude({
          apiKey: env.ANTHROPIC_API_KEY,
          imageUrl,
          declaredColor: colorId,
          productName: name,
          sku,
          imageIndex
        });

        const { status, detected = "", confidence = 0, reason = "" } = result;
        
        csvRows.push(`${sku},"${colorLabel(colorId)}","${detected}","${status}",${confidence},"${reason}"`);
        
        if (status === "MATCH") {
          console.log(`   ✅ ${colorLabel(colorId)}: MATCH (${confidence}%)`);
          match++;
        } else if (status === "MISMATCH") {
          console.log(`   ❌ ${colorLabel(colorId)}: MISMATCH - ${reason}`);
          mismatch++;
        } else {
          console.log(`   ❓ ${colorLabel(colorId)}: UNSURE - ${reason}`);
          unsure++;
        }
        
        total++;
        
        // Short pause to be nice to API
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   💥 ${colorLabel(colorId)}: ERROR - ${error.message}`);
        csvRows.push(`${sku},"${colorLabel(colorId)}",,"UNSURE",0,"${error.message.replace(/"/g, "'")}"`);
        errors++; total++;
      }
    }
  }

  writeFileSync(args.output, csvRows.join('\n'), 'utf8');

  console.log(`\n📊 CLAUDE RESULTS:`);
  console.log(`Total: ${total}`);
  console.log(`✅ MATCH: ${match} (${((match/total)*100).toFixed(1)}%)`);
  console.log(`❌ MISMATCH: ${mismatch} (${((mismatch/total)*100).toFixed(1)}%)`);
  console.log(`❓ UNSURE: ${unsure} (${((unsure/total)*100).toFixed(1)}%)`);
  console.log(`💥 ERRORS: ${errors}`);
  console.log(`\n📁 Report: ${args.output}`);
}

main().catch(console.error);