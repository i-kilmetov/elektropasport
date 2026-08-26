#!/usr/bin/env node
/** Scan first N rows of 62963 for electrical / network-ish work names. */
const key = process.env.MOS_DATA_API_KEY?.trim();
if (!key) {
  console.error("Set MOS_DATA_API_KEY");
  process.exit(1);
}

const NEEDLE =
  /электро|энерго|проводк|кабел|заземл|щит|освещен|инженерн|внутридомовые\s+сети|сети\s+электро/i;

function pickAddress(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return pickAddress(JSON.parse(t));
      } catch {
        return t;
      }
    }
    return t;
  }
  if (Array.isArray(raw)) return raw.map(pickAddress).filter(Boolean).join(", ");
  if (typeof raw === "object") return raw.Address || raw.address || "";
  return String(raw);
}

const found = [];
const workFreq = new Map();
const maxSkip = Number(process.env.MOS_PROBE_MAX_SKIP || 3000);
const page = 100;

for (let skip = 0; skip < maxSkip; skip += page) {
  const url =
    `https://apidata.mos.ru/v1/datasets/62963/rows?$top=${page}&$skip=${skip}&$format=json&api_key=` +
    encodeURIComponent(key);
  const res = await fetch(url);
  const text = await res.text();
  if (res.status !== 200) {
    console.error("HTTP", res.status, text.slice(0, 300));
    process.exit(1);
  }
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : data.Items || data.items || [];
  if (!rows.length) break;
  for (const row of rows) {
    const c = row.Cells || {};
    const blob = `${c.WorkName || ""} ${c.WorkEssence || ""} ${c.DetailedWork || ""}`;
    const essence = String(c.WorkEssence || c.WorkName || "").trim();
    if (essence) workFreq.set(essence, (workFreq.get(essence) || 0) + 1);
    if (NEEDLE.test(blob)) {
      found.push({
        address: pickAddress(c.ObjectAddress),
        workName: c.WorkName,
        essence: c.WorkEssence,
        year: c.YearOfWork,
        start: c.StartDate || c.StartDateActual,
        end: c.EndDate || c.EndDateActual,
      });
    }
  }
  process.stdout.write(`\rscanned ${skip + rows.length}… found electro-ish ${found.length}`);
}
process.stdout.write("\n");

console.log("\n=== electrical / network-ish samples ===");
console.log(JSON.stringify(found.slice(0, 10), null, 2));
console.log("electro_ish_count_in_scan", found.length);

console.log("\n=== top WorkEssence in scanned window ===");
[...workFreq.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .forEach(([k, v]) => console.log(`${v}\t${k}`));
