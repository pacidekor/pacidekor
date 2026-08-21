const fs = require("fs");
const src =
  "C:/Users/tomas/.cursor/projects/c-Users-tomas-Desktop-projekty-pacidekor-pacidekornavrh1/agent-tools/ced8cc85-8aee-42b3-8193-30f40402479b.txt";
const dest =
  "C:/Users/tomas/Desktop/projekty/pacidekor/pacidekornavrh1/_katalog-work/katalog-raw.json";
const raw = fs.readFileSync(src, "utf8");
const i = raw.indexOf("[");
const j = raw.lastIndexOf("]");
if (i < 0 || j < 0) {
  console.error("brackets not found", i, j);
  process.exit(1);
}
fs.writeFileSync(dest, raw.slice(i, j + 1), "utf8");
console.log("extracted bytes", j - i + 1);
