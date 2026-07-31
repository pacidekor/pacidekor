/**
 * Finalize paci-kvety-ready packs:
 * - reorder images by color groups (triplets together)
 * - simplify Farby names (no photo numbers, no mix/group shots)
 * - slim info.txt (Názov, Popis, Farby, Cena)
 *
 * Usage: node scripts/finalize-paci-ready.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/products/paci-kvety-ready");
const BATCH1 = JSON.parse(
  fs.readFileSync(path.resolve("scripts/paci-batch1-catalog.json"), "utf8"),
);
const BATCH2 = JSON.parse(
  fs.readFileSync(path.resolve("scripts/paci-batch2-catalog.json"), "utf8"),
);

/** Corrected / preferred photo order for products where catalog grouping was messy. */
const OVERRIDE_GROUPS = {
  "003": [
    { name: "ružovobiela", photos: [1, 9, 15, 4, 13, 20] },
    { name: "fialová", photos: [2, 12, 16] },
    { name: "biela", photos: [3, 10, 11, 19] },
    { name: "limetková", photos: [5, 8, 18] },
    { name: "krémovožltá", photos: [6, 7, 17] },
  ],
  // group/mix photo kept at end of gallery only
  "003:tail": [14],
};

function isMixLabel(label) {
  const n = label.toLowerCase();
  return (
    n.includes("mix farieb") ||
    n.includes("skupinová") ||
    n.includes("pastelový mix") ||
    n.includes("skupinova")
  );
}

function stripPhotoNums(label) {
  return label.replace(/\s*\[[^\]]*\]\s*$/u, "").trim();
}

function simplifyColorName(raw) {
  const base = stripPhotoNums(raw);
  if (!base || isMixLabel(base)) return null;

  const n = base.toLowerCase();

  // Aggressive short labels for variant pills
  if (n.includes("ružovobiela") || (n.includes("magenta") && n.includes("ruž")))
    return "ružovobiela";
  if (n.includes("krémovožlt") || (n.includes("magenta") && n.includes("krém")))
    return "krémovožltá";
  if (n.includes("limetk") || (n.includes("zelen") && n.includes("limet")))
    return "limetková";
  if (n.includes("tmavo fial") || n.includes("tmavofial")) return "fialová";
  if (n.includes("levanduľ") || n.includes("levandul")) return "levanduľová";
  if (n.includes("prašnoruž") || n.includes("prasnoruz")) return "prašnoružová";
  if (n.includes("staroruž") || n.includes("staroruz")) return "staroružová";
  if (n.includes("svetloruž") || n.includes("svetloruz")) return "svetloružová";
  if (n.includes("tmavoruž") || n.includes("tmavoruz")) return "tmavoružová";
  if (n.includes("cyklámen") || n.includes("cyklamen")) return "cyklámenová";
  if (n.includes("bordov") || n.includes("vínov") || n.includes("vinov"))
    return "bordová";
  if (n.includes("terakot") || n.includes("oranž") || n.includes("oranz"))
    return n.includes("horčic") ? "horčicová" : "oranžová";
  if (n.includes("horčic") || n.includes("horcic")) return "horčicová";
  if (n.includes("broskyň") || n.includes("broskyn") || n.includes("marhuľ") || n.includes("meruňk") || n.includes("merunk"))
    return "broskyňová";
  if (n.includes("losos")) return "lososová";
  if (n.includes("koral") || n.includes("korál")) return "koralová";
  if (n.includes("mauve")) return "mauve";
  if (n.includes("svetlomod") || n.includes("modro")) return "modrá";
  if (n.includes("tmavomod")) return "tmavomodrá";
  if (n.includes("sivomod") || n.includes("sivo")) return n.includes("zelen") ? "sivozelená" : "sivá";
  if (n.includes("sivozel")) return "sivozelená";
  if (n.includes("svetlozel") || n.includes("šalviov") || n.includes("salviov") || n.includes("mätov") || n.includes("matov"))
    return "svetlozelená";
  if (n.includes("tmavozelen")) return "tmavozelená";
  if (n.includes("starozelen") || n.includes("antique")) return "starozelená";
  if (n.includes("striebor")) return "striebornozelená";
  if (n.includes("hnedo") || n.includes("jesenn")) return "hnedá";
  if (n.includes("smotan") || n.includes("krémov") || n.includes("kremov") || n.includes("béž") || n.includes("bezov") || n.includes("vintage"))
    return "krémová";
  if (n.includes("biela") || n.includes("bielo")) return "biela";
  if (n.includes("červen") || n.includes("cerven")) return "červená";
  if (n.includes("žlt") || n.includes("zlt") || n.includes("sírov")) return "žltá";
  if (n.includes("fialov")) return "fialová";
  if (n.includes("ružov") || n.includes("ruzov")) return "ružová";
  if (n.includes("zelen")) return "zelená";

  // Fallback: take first segment before slash, trim length
  const first = base.split("/")[0].trim();
  if (first.length <= 22) return first;
  return first.slice(0, 20).trim();
}

function parsePhotoNums(detail) {
  const match = detail.match(/\[([^\]]+)\]\s*$/u);
  if (!match) return [];
  const nums = [];
  for (const part of match[1].split(",")) {
    const range = part.trim().match(/^(\d+)\s*[–-]\s*(\d+)$/u);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i += 1) nums.push(i);
      continue;
    }
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) nums.push(n);
  }
  return nums;
}

function unique(nums) {
  const seen = new Set();
  const out = [];
  for (const n of nums) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function buildGroupsFromCatalog(entry) {
  const details = entry.colorDetails?.length
    ? entry.colorDetails
    : entry.colors ?? [];

  const groups = [];
  const mixPhotos = [];

  for (const detail of details) {
    const photos = parsePhotoNums(detail);
    const label = stripPhotoNums(detail);
    if (isMixLabel(label)) {
      mixPhotos.push(...photos);
      continue;
    }
    const name = simplifyColorName(detail);
    if (!name) continue;
    groups.push({ name, photos: unique(photos) });
  }

  return { groups, mixPhotos: unique(mixPhotos) };
}

function listWebpNums(dir) {
  return fs
    .readdirSync(dir)
    .map((name) => {
      const m = name.match(/^(\d+)\.webp$/i);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n != null)
    .sort((a, b) => a - b);
}

function reorderImages(dir, orderedNums) {
  const existing = new Set(listWebpNums(dir));
  const sequence = orderedNums.filter((n) => existing.has(n));
  for (const n of existing) {
    if (!sequence.includes(n)) sequence.push(n);
  }
  if (sequence.length === 0) return sequence;

  const tmpDir = path.join(dir, "__reorder_tmp__");
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir);

  for (let i = 0; i < sequence.length; i += 1) {
    const from = path.join(dir, `${sequence[i]}.webp`);
    const to = path.join(tmpDir, `${i + 1}.webp`);
    fs.copyFileSync(from, to);
  }

  for (const n of existing) {
    fs.unlinkSync(path.join(dir, `${n}.webp`));
  }
  for (let i = 0; i < sequence.length; i += 1) {
    fs.renameSync(
      path.join(tmpDir, `${i + 1}.webp`),
      path.join(dir, `${i + 1}.webp`),
    );
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return sequence;
}

function readInfo(dir) {
  const p = path.join(dir, "info.txt");
  if (!fs.existsSync(p)) return {};
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  /** @type {Record<string, string>} */
  const data = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value;
  }
  return data;
}

function writeInfo(dir, { name, desc, colors, price }) {
  const colorsLine =
    colors.length > 0 ? colors.join(" | ") : "(bez farebných variantov)";
  const body = [
    `Názov: ${name}`,
    `Popis: ${desc}`,
    `Farby: ${colorsLine}`,
    `Cena: ${price || "1,00 €"}`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(dir, "info.txt"), body, "utf8");
}

function remapGroupsAfterReorder(groups, oldSequence) {
  /** oldNum -> newNum */
  const map = new Map();
  oldSequence.forEach((oldNum, i) => map.set(oldNum, i + 1));

  return groups.map((g) => ({
    name: g.name,
    photos: g.photos
      .map((n) => map.get(n))
      .filter((n) => typeof n === "number"),
  }));
}

function processProduct(entry) {
  const id = entry.id;
  const dir = path.join(ROOT, id);
  if (!fs.existsSync(dir)) {
    console.warn(`MISSING folder ${id}`);
    return entry;
  }

  const info = readInfo(dir);
  const name = entry.name || info["Názov"] || id;
  const desc = entry.desc || info["Popis"] || "";
  const price = info["Cena"] || "1,00 €";

  let groups;
  let mixPhotos = [];

  if (OVERRIDE_GROUPS[id]) {
    groups = OVERRIDE_GROUPS[id].map((g) => ({ ...g, photos: [...g.photos] }));
    mixPhotos = OVERRIDE_GROUPS[`${id}:tail`]
      ? [...OVERRIDE_GROUPS[`${id}:tail`]]
      : [];
  } else {
    const parsed = buildGroupsFromCatalog(entry);
    groups = parsed.groups;
    mixPhotos = parsed.mixPhotos;
  }

  // Deduplicate color names while merging photos
  /** @type {Map<string, number[]>} */
  const merged = new Map();
  for (const g of groups) {
    const prev = merged.get(g.name) ?? [];
    merged.set(g.name, unique([...prev, ...g.photos]));
  }
  groups = [...merged.entries()].map(([name, photos]) => ({ name, photos }));

  const orderedNums = [
    ...groups.flatMap((g) => g.photos),
    ...mixPhotos,
  ];

  const hasMappedPhotos = orderedNums.length > 0;
  let newSequence = listWebpNums(dir);
  if (hasMappedPhotos) {
    newSequence = reorderImages(dir, orderedNums);
    groups = remapGroupsAfterReorder(groups, newSequence);
  }

  const colorNames = groups.map((g) => g.name);
  writeInfo(dir, { name, desc, colors: colorNames, price });

  return {
    ...entry,
    name,
    desc,
    colors: colorNames,
    colorDetails: groups.map((g) =>
      g.photos.length > 0 ? `${g.name} [${g.photos.join(",")}]` : g.name,
    ),
    hasColorVariants: colorNames.length > 1,
  };
}

function main() {
  const next1 = BATCH1.map(processProduct);
  const next2 = BATCH2.map(processProduct);

  fs.writeFileSync(
    path.resolve("scripts/paci-batch1-catalog.json"),
    `${JSON.stringify(next1, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.resolve("scripts/paci-batch2-catalog.json"),
    `${JSON.stringify(next2, null, 2)}\n`,
    "utf8",
  );

  console.log("Done.");
  console.log("--- 003 info ---");
  console.log(fs.readFileSync(path.join(ROOT, "003", "info.txt"), "utf8"));
  const sample = next1.find((p) => p.id === "003");
  console.log("003 colorDetails:", sample?.colorDetails);
}

main();
