import sharp from "sharp";
import fs from "fs";
import path from "path";

const SIZE = 400;

async function analyzeFile(file) {
  const { data, info } = await sharp(file)
    .resize(SIZE, SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return analyzeRaw(data, info.width, info.height);
}

function analyzeRaw(data, w, h) {
  const topH = Math.max(8, Math.floor(h * 0.1));
  let sr = 0,
    sg = 0,
    sb = 0,
    n = 0;
  for (let y = 0; y < topH; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 3;
      sr += data[i];
      sg += data[i + 1];
      sb += data[i + 2];
      n += 1;
    }
  }
  const br = sr / n;
  const bg = sg / n;
  const bb = sb / n;

  const thresh = 24;
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0,
    count = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 3;
      const d = Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb);
      if (d > thresh) {
        count += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count < w * h * 0.01) {
    return {
      ok: false,
      bg: [br, bg, bb],
      minX: 0,
      minY: 0,
      maxX: w - 1,
      maxY: h - 1,
      w,
      h,
      fill: 0,
    };
  }
  return {
    ok: true,
    bg: [br, bg, bb],
    minX,
    minY,
    maxX,
    maxY,
    w,
    h,
    fill: count / (w * h),
    subH: maxY - minY + 1,
    subW: maxX - minX + 1,
    topPad: minY / h,
    vRatio: (maxY - minY + 1) / h,
  };
}

const files = fs
  .readdirSync("tmp/zoom-check")
  .filter((f) => f.endsWith(".jpg") && !f.startsWith("row") && f !== "compare.jpg")
  .sort();

for (const f of files) {
  const a = await analyzeFile(path.join("tmp/zoom-check", f));
  console.log(
    f.padEnd(26),
    "ok",
    a.ok,
    "vRatio",
    a.vRatio ? a.vRatio.toFixed(2) : "-",
    "topPad",
    a.topPad != null ? a.topPad.toFixed(2) : "-",
    "fill",
    a.fill.toFixed(2),
    "box",
    `${a.maxX - a.minX + 1}x${a.maxY - a.minY + 1}`,
    "yx",
    `${a.minY},${a.minX}`,
  );
}
