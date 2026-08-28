const fs = require("fs");
const path = require("path");

const uuids = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_matched-uuids.json"), "utf8"),
);

// Build SQL for MCP / manual run
const arr = uuids.map((u) => `'${u}'`).join(",");
const sql = `
SELECT COUNT(DISTINCT p.id) AS matched_products
FROM products p
CROSS JOIN LATERAL unnest(p.images) AS img
WHERE EXISTS (
  SELECT 1 FROM unnest(ARRAY[${arr}]::text[]) AS m(uuid)
  WHERE img LIKE '%' || m.uuid || '%'
);
`;

fs.writeFileSync(path.join(__dirname, "_count-matched-products.sql"), sql);
console.log("Wrote SQL with", uuids.length, "UUIDs");
