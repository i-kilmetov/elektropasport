#!/usr/bin/env node
/** Quick probe of dataset 62963 — capital repair MKD works. */
const key = process.env.MOS_DATA_API_KEY?.trim();
if (!key) {
  console.error("Set MOS_DATA_API_KEY");
  process.exit(1);
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
  const addrObj = c.ObjectAddress;
  const addr =
    (addrObj && (addrObj.Address || addrObj.address)) ||
    addrObj ||
    c.Address ||
    c.ADDRESS;
  console.log({
    address: typeof addr === "string" ? addr : JSON.stringify(addr),
    workName: c.WorkName,
    detailed: c.DetailedWork,
    essence: c.WorkEssence,
    year: c.YearOfWork,
    start: c.StartDate || c.StartDateActual,
    end: c.EndDate || c.EndDateActual,
  });
}
