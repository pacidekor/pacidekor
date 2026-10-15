const fs = require("fs");
const path = require("path");

const src = path.join("public", "payments", "updated");
const out = path.join("public", "payments");

function getBounds(svg) {
  const paths = [...svg.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const d of paths) {
    const tokens =
      d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) ||
      [];
    let x = 0,
      y = 0,
      i = 0;
    const take = () => parseFloat(tokens[i++]);
    const mark = (px, py) => {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    };

    while (i < tokens.length) {
      const t = tokens[i++];
      if (!t || t === "Z" || t === "z") continue;

      if (t === "M" || t === "m") {
        const abs = t === "M";
        x = abs ? take() : x + take();
        y = abs ? take() : y + take();
        mark(x, y);
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          x = abs ? take() : x + take();
          y = abs ? take() : y + take();
          mark(x, y);
        }
      } else if (t === "L" || t === "l") {
        const abs = t === "L";
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          x = abs ? take() : x + take();
          y = abs ? take() : y + take();
          mark(x, y);
        }
      } else if (t === "H" || t === "h") {
        const abs = t === "H";
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          x = abs ? take() : x + take();
          mark(x, y);
        }
      } else if (t === "V" || t === "v") {
        const abs = t === "V";
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          y = abs ? take() : y + take();
          mark(x, y);
        }
      } else if (t === "C" || t === "c") {
        const abs = t === "C";
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          const x1 = abs ? take() : x + take();
          const y1 = abs ? take() : y + take();
          const x2 = abs ? take() : x + take();
          const y2 = abs ? take() : y + take();
          x = abs ? take() : x + take();
          y = abs ? take() : y + take();
          mark(x1, y1);
          mark(x2, y2);
          mark(x, y);
        }
      } else if (t === "Q" || t === "q") {
        const abs = t === "Q";
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          const x1 = abs ? take() : x + take();
          const y1 = abs ? take() : y + take();
          x = abs ? take() : x + take();
          y = abs ? take() : y + take();
          mark(x1, y1);
          mark(x, y);
        }
      } else if (t === "S" || t === "s" || t === "T" || t === "t") {
        const abs = t === t.toUpperCase();
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          if (t === "S" || t === "s") {
            take();
            take();
          }
          x = abs ? take() : x + take();
          y = abs ? take() : y + take();
          mark(x, y);
        }
      } else if (t === "A" || t === "a") {
        const abs = t === "A";
        while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
          take();
          take();
          take();
          take();
          take();
          x = abs ? take() : x + take();
          y = abs ? take() : y + take();
          mark(x, y);
        }
      }
    }
  }

  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function withTightViewBox(svg, pad = 10) {
  const b = getBounds(svg);
  if (!Number.isFinite(b.minX)) return svg;
  const x = Math.floor(b.minX - pad);
  const y = Math.floor(b.minY - pad);
  const w = Math.ceil(b.w + pad * 2);
  const h = Math.ceil(b.h + pad * 2);
  return svg
    .replace(/viewBox="[^"]*"/, `viewBox="${x} ${y} ${w} ${h}"`)
    .replace(/\bwidth="[^"]*"/, `width="${w}"`)
    .replace(/\bheight="[^"]*"/, `height="${h}"`);
}

/** Copy as-is (colors untouched). Only tighten empty artboard when needed. */
const jobs = [
  { from: "gopay.svg", to: "gopay.svg", tight: false },
  { from: "visa.svg", to: "visa.svg", tight: false },
  // red/gold circles on blue = Mastercard acceptance mark
  { from: "me_accpt_match_eps.svg", to: "mastercard.svg", tight: false },
  // red/blue/purple circles = Maestro
  { from: "mastercard_maestro.svg", to: "maestro.svg", tight: true },
  { from: "verified_by_visa.svg", to: "verified-by-visa.svg", tight: false },
  { from: "mc_sc_rgb.svg", to: "mastercard-securecode.svg", tight: true },
];

for (const job of jobs) {
  let svg = fs.readFileSync(path.join(src, job.from), "utf8");
  if (job.tight) svg = withTightViewBox(svg);
  fs.writeFileSync(path.join(out, job.to), svg);
  console.log("wrote", job.to, job.tight ? "(tight viewBox)" : "(as-is)");
}
