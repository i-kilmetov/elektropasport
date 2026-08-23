import { isMoscow } from "@/lib/lead-services";
import {
  fetchDatasetColumns,
  fetchDatasetRows,
  isMoscowOpenDataConfigured,
  resolveCapitalRepairDatasetId,
  type MosDataRow,
} from "@/lib/moscow-open-data";

export type CapitalRepairInfo = {
  found: boolean;
  plannedStartYear: number | null;
  plannedEndYear: number | null;
  worksSummary: string | null;
  status: string | null;
  sourceLabel: string | null;
  userMessage: string;
};

const ADDRESS_KEYS = [
  "Address",
  "AddressMKD",
  "Adress",
  "AdressMKD",
  "FullAddress",
  "AddressHouse",
  "SIMPLE_ADDRESS",
  "ADDRESS",
  "AddressStr",
];

const YEAR_START_KEYS = [
  "YearStart",
  "YearOfStart",
  "RepairStartYear",
  "YearRepair",
  "YearOfRepair",
  "YearBegin",
  "YearOfBegin",
  "Year_of_repair_start",
  "StartYear",
  "PlanYear",
  "YearPlan",
  "Year",
  "RepairYear",
  "YearRepairStart",
  "YearStartRepair",
  "YearOfRepairStart",
];

const YEAR_END_KEYS = [
  "YearEnd",
  "YearOfEnd",
  "RepairEndYear",
  "EndYear",
  "YearRepairEnd",
];

const WORKS_KEYS = [
  "Works",
  "WorkList",
  "Activities",
  "RepairWorks",
  "ListOfWorks",
  "WorksList",
  "WorkType",
  "TypeOfWorks",
  "RepairType",
  "Measures",
];

const STATUS_KEYS = ["Status", "StatusRepair", "RepairStatus", "State"];

function normalizeAddressPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHouseTokens(address: string): string[] {
  const norm = normalizeAddressPart(address);
  const tokens = norm.split(" ").filter(Boolean);
  const houseMatch =
    /(?:д\.?|дом|к\.?|корп\.?|стр\.?)\s*([\d/a-zа-я-]+)/i.exec(address) ??
    /,\s*([\d/a-zа-я-]+)\s*$/.exec(address);
  const house = houseMatch?.[1]
    ? normalizeAddressPart(houseMatch[1])
    : tokens.at(-1) ?? "";
  const streetTokens = tokens.filter(
    (token) =>
      token.length > 2 &&
      token !== house &&
      !["москва", "город", "россия", "ул", "улица", "пр", "проспект"].includes(
        token,
      ),
  );
  return [...streetTokens.slice(-3), house].filter(Boolean);
}

function addressesLikelyMatch(stored: string, query: string): boolean {
  const a = normalizeAddressPart(stored);
  const b = normalizeAddressPart(query);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const tokens = extractHouseTokens(query);
  if (tokens.length === 0) return false;
  return tokens.every((token) => a.includes(token));
}

function cellValue(cells: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = cells[key];
    if (direct != null && String(direct).trim()) return String(direct).trim();
  }
  const lowerMap = new Map(
    Object.entries(cells).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const value = lowerMap.get(key.toLowerCase());
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function parseYear(raw: string): number | null {
  const match = /(19|20)\d{2}/.exec(raw);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function pickYear(cells: Record<string, unknown>, keys: string[]): number | null {
  return parseYear(cellValue(cells, keys));
}

function pickWorks(cells: Record<string, unknown>): string | null {
  const raw = cellValue(cells, WORKS_KEYS);
  if (!raw) return null;
  return raw.length > 220 ? `${raw.slice(0, 217)}…` : raw;
}

function rowToRepairInfo(row: MosDataRow): Omit<CapitalRepairInfo, "userMessage"> {
  const cells = row.Cells ?? {};
  return {
    found: true,
    plannedStartYear: pickYear(cells, YEAR_START_KEYS),
    plannedEndYear: pickYear(cells, YEAR_END_KEYS),
    worksSummary: pickWorks(cells),
    status: cellValue(cells, STATUS_KEYS) || null,
    sourceLabel: "Портал открытых данных Москвы",
  };
}

function buildUserMessage(info: Omit<CapitalRepairInfo, "userMessage">): string {
  const nowYear = new Date().getFullYear();
  const start = info.plannedStartYear;
  const end = info.plannedEndYear ?? start;

  if (start && start > nowYear) {
    const range =
      end && end !== start ? `${start}–${end}` : `${start}`;
    return `По региональной программе капремонта работы на доме запланированы на ${range} год. При капремонте часто обновляют стояки и заземление на вводе — это может решить проблему отсутствия PE в квартире.`;
  }

  if (start && start <= nowYear) {
    const range =
      end && end > start ? `${start}–${end}` : `${start}`;
    return `По программе капремонта дом уже проходил или проходит ремонт (${range} г.). Заземление могло появиться на стояке — проверьте вводной кабель в щитке (жёлто-зелёная жила).`;
  }

  if (info.found) {
    return "Дом включён в программу капремонта Москвы. Точный год работ смотрите на fond.mos.ru — при ремонте дома часто обновляют электрику и заземление.";
  }

  return "Точные сроки капремонта смотрите на fond.mos.ru или в разделе «Капремонт» на mos.ru — при ремонте дома часто появляется заземление на стояке.";
}

async function findRowByAddress(
  datasetId: number,
  address: string,
): Promise<MosDataRow | null> {
  const columns = await fetchDatasetColumns(datasetId);
  const addressColumn = columns.find((col) =>
    ADDRESS_KEYS.some(
      (key) =>
        col.name.toLowerCase() === key.toLowerCase() ||
        col.caption.toLowerCase().includes("адрес"),
    ),
  )?.name;

  const houseToken = extractHouseTokens(address).at(-1);
  if (addressColumn && houseToken && houseToken.length >= 1) {
    const filtered = await fetchDatasetRows(datasetId, {
      top: 50,
      filter: `contains(${addressColumn}, '${houseToken.replace(/'/g, "''")}')`,
    });
    const match = filtered.find((row) => {
      const stored = cellValue(row.Cells ?? {}, ADDRESS_KEYS);
      return addressesLikelyMatch(stored, address);
    });
    if (match) return match;
  }

  const pageSize = 1000;
  const maxPages = 4;
  for (let page = 0; page < maxPages; page += 1) {
    const skip = page * pageSize;
    const rows = await fetchDatasetRows(datasetId, { skip, top: pageSize });
    if (rows.length === 0) break;
    const match = rows.find((row) => {
      const stored = cellValue(row.Cells ?? {}, ADDRESS_KEYS);
      return addressesLikelyMatch(stored, address);
    });
    if (match) return match;
    if (rows.length < pageSize) break;
  }

  return null;
}

export async function lookupMoscowCapitalRepair(
  city: string,
  address: string,
): Promise<CapitalRepairInfo | null> {
  if (!isMoscow(city)) return null;

  const fallback: CapitalRepairInfo = {
    found: false,
    plannedStartYear: null,
    plannedEndYear: null,
    worksSummary: null,
    status: null,
    sourceLabel: null,
    userMessage:
      "Сроки капремонта и работы по дому — на fond.mos.ru (поиск по адресу). При капремонте часто обновляют стояки и заземление.",
  };

  if (!isMoscowOpenDataConfigured()) return fallback;

  const datasetId = await resolveCapitalRepairDatasetId();
  if (!datasetId) return fallback;

  try {
    const row = await findRowByAddress(datasetId, address);
    if (!row) return fallback;

    const parsed = rowToRepairInfo(row);
    return {
      ...parsed,
      userMessage: buildUserMessage(parsed),
    };
  } catch (error) {
    console.error("Moscow capital repair lookup failed", error);
    return fallback;
  }
}
