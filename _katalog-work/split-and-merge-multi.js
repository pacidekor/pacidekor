/**
 * Auto-assist split for ke-rozdeleni:
 * - group images by 3 (sorted names)
 * - compare avg color distance between groups
 * - if groups look like different colors/products → split into separate list entries
 * - if similar / one product with angles → keep together in list
 *
 * Manual overrides in OVERRIDES below after visual check.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const BASE = path.join(__dirname, "..", "katalog_raw");
const MULTI = path.join(BASE, "ke-rozdeleni");
const LIST = path.join(BASE, "list");
const INDEX = path.join(__dirname, "INDEX-list.tsv");

/** force: 'keep' | 'split' */
const OVERRIDES = {
  // visual checks already done:
  "060": "keep", // same white delphinium, vase + stem
  "067": "keep", // same cream pompon
  "080": "keep", // eucalyptus color variants same design
  "115": "keep", // peony bouquet color variants
  "014 na_eshopu": "keep", // dahlia color variants
  "004 orchidea mini spray neni_vse_na_eshopu": "keep",
  "002 hortenzia na_eshopu": "keep",
  "135": "keep", // F1 MIX rose colors
  "015 neni_na_eshopu": "keep", // typically color variants of same spray
  "016 na_eshopu": "keep",
};

function listImages(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jpe?g|png|webp)$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function avgColor(file) {
  const { data, info } = await sharp(file)
    .resize(32, 32, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0,
    g = 0,
    b = 0;
  const n = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [r / n, g / n, b / n];
}

function dist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function groupSignature(dir, files) {
  // use first image of group as signature
  return avgColor(path.join(dir, files[0]));
}

function nextListNum() {
  const nums = fs
    .readdirSync(LIST, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{3}/.test(d.name))
    .map((d) => parseInt(d.name.slice(0, 3), 10));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function appendIndex(row) {
  fs.appendFileSync(INDEX, row + "\n", "utf8");
}

async function main() {
  const dirs = fs
    .readdirSync(MULTI, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));

  const report = [];

  for (const name of dirs) {
    const dir = path.join(MULTI, name);
    const images = listImages(dir);
    if (images.length === 0) continue;

    const groups = [];
    for (let i = 0; i < images.length; i += 3) {
      groups.push(images.slice(i, i + 3));
    }

    let action = OVERRIDES[name] || null;

    if (!action) {
      // Compare consecutive group signatures
      const sigs = [];
      for (const g of groups) {
        if (g.length === 0) continue;
        sigs.push(await groupSignature(dir, g));
      }
      let maxD = 0;
      for (let i = 0; i < sigs.length; i++) {
        for (let j = i + 1; j < sigs.length; j++) {
          maxD = Math.max(maxD, dist(sigs[i], sigs[j]));
        }
      }
      // threshold: strong color difference between groups → split
      // same product angles usually < 35; different colors often > 45
      action = maxD >= 48 && groups.length >= 2 ? "split" : "keep";
      report.push({ name, maxD: Math.round(maxD), action, groups: groups.length, imgs: images.length });
    } else {
      report.push({ name, maxD: "override", action, groups: groups.length, imgs: images.length });
    }

    if (action === "keep") {
      const num = String(nextListNum()).padStart(3, "0");
      const dest = path.join(LIST, num);
      fs.renameSync(dir, dest);
      fs.writeFileSync(
        path.join(dest, "meta.txt"),
        `cislo: ${num}\nfotky: ${images.length}\npovodni_slozka: ${name}\nstav: ke_kontrole_eshop\npoznamka: vice fotek (barvy/uhly) — 1 produkt\n`,
        "utf8",
      );
      appendIndex(
        `${num}\t${images.length}\t${name}\t\tvice fotek, ponechano jako 1 produkt`,
      );
      console.log("KEEP", num, name, images.length);
    } else {
      // split each full triplet into own product; leftover <3 stays with last or own folder
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        if (g.length === 0) continue;
        const num = String(nextListNum()).padStart(3, "0");
        const dest = path.join(LIST, num);
        fs.mkdirSync(dest);
        for (const f of g) {
          fs.renameSync(path.join(dir, f), path.join(dest, f));
        }
        fs.writeFileSync(
          path.join(dest, "meta.txt"),
          `cislo: ${num}\nfotky: ${g.length}\npovodni_slozka: ${name}\nskupina: ${gi + 1}/${groups.length}\nstav: ke_kontrole_eshop\npoznamka: split z multi slozky\n`,
          "utf8",
        );
        appendIndex(
          `${num}\t${g.length}\t${name}#${gi + 1}\t\tsplit z multi`,
        );
        console.log("SPLIT", num, name, `g${gi + 1}`, g.length);
      }
      // copy zdroj if any leftover files
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isFile()) {
          // attach non-images to first split? or delete empty
          fs.unlinkSync(p);
        }
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "split-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("report", path.join(__dirname, "split-report.json"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
