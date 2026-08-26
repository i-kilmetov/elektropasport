#!/usr/bin/env node
/** Quick probe of dataset 62963 — capital repair MKD works. */
const key = process.env.MOS_DATA_API_KEY?.trim();
if (!key) {
  console.error("Set MOS_DATA_API_KEY");
  process.exit(1);
}

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
  if (Array.isArray(raw)) {
    return raw.map(pickAddress).filter(Boolean).join(", ");
  }
  if (typeof raw === "object") {
    return (
      raw.Address ||
      raw.address ||
      raw.ADDRESS ||
      raw.AddressMKD ||
      ""
    );
  }
  return String(raw);
}

const url =
  "https://apidata.mos.ru/v1/datasets/62963/rows?$top=8&$format=json&api_key=" +
  encodeURIComponent(key);

const res = await fetch(url);
const text = await res.text();
if (res.status !== 200) {
  console.error("HTTP", res.status, text.slice(0, 400));
  process.exit(1);
}

const data = JSON.parse(text);
const rows = Array.isArray(data) ? data : data.Items || data.items || [];

for (const row of rows) {
  const c = row.Cells || row.attributes || {};
  console.log({
    address: pickAddress(c.ObjectAddress || c.Address || c.ADDRESS),
    unom: (() => {
      try {
        const parsed =
          typeof c.ObjectAddress === "string"
            ? JSON.parse(c.ObjectAddress)
            : c.ObjectAddress;
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        return first?.UNOM ?? null;
      } catch {
        return null;
      }
    })(),
    workName: c.WorkName,
    essence: c.WorkEssence,
    year: c.YearOfWork,
    start: c.StartDate || c.StartDateActual,
    end: c.EndDate || c.EndDateActual,
  });
}
