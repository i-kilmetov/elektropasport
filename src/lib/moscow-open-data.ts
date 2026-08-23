const MOS_DATA_BASE = "https://apidata.mos.ru/v1";

export type MosDataRow = {
  global_id?: number;
  Number?: number;
  Cells?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
};

function normalizeMosRow(row: MosDataRow): MosDataRow {
  if (row.Cells && Object.keys(row.Cells).length > 0) return row;
  if (row.attributes && Object.keys(row.attributes).length > 0) {
    return { ...row, Cells: row.attributes };
  }
  return row;
}

export type MosDatasetSummary = {
  id: number;
  caption: string;
};

function apiKey(): string | null {
  return process.env.MOS_DATA_API_KEY?.trim() || null;
}

export function isMoscowOpenDataConfigured(): boolean {
  return Boolean(apiKey());
}

export type MosFetchResult<T> = {
  data: T | null;
  status: number;
  error?: string;
};

function describeMoscowNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return "network_error";

  const parts = [error.message];
  if (error.cause instanceof Error) parts.push(error.cause.message);
  const combined = parts.join(" ").toLowerCase();

  if (
    combined.includes("econnreset") ||
    combined.includes("socket disconnected") ||
    combined.includes("before secure tls") ||
    combined.includes("fetch failed")
  ) {
    return "geo_blocked_or_unreachable";
  }

  return error.message;
}

async function mosFetchRaw(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<MosFetchResult<unknown>> {
  const key = apiKey();
  if (!key) return { data: null, status: 0, error: "missing_api_key" };

  const url = new URL(`${MOS_DATA_BASE}${path}`);
  url.searchParams.set("api_key", key);
  if (searchParams) {
    for (const [name, value] of Object.entries(searchParams)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(name, String(value));
    }
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: path.includes("/rows") ? "no-store" : "force-cache",
      next: path.includes("/rows") ? undefined : { revalidate: 86400 },
    });

    if (res.status === 404) {
      return { data: null, status: 404 };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Moscow open data request failed", path, res.status, body);
      return {
        data: null,
        status: res.status,
        error: body.slice(0, 200) || `http_${res.status}`,
      };
    }

    return { data: await res.json(), status: res.status };
  } catch (error) {
    console.error("Moscow open data request error", path, error);
    return {
      data: null,
      status: 0,
      error: describeMoscowNetworkError(error),
    };
  }
}

async function mosFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const result = await mosFetchRaw(path, searchParams);
  return (result.data as T | null) ?? null;
}

let cachedRepairDatasetId: number | null | undefined;

export async function mosFetchDatasetList(): Promise<
  MosDatasetSummary[] | null
> {
  const all: MosDatasetSummary[] = [];
  for (let skip = 0; skip < 20_000; skip += 1000) {
    const page = await mosFetch<Array<{ Id?: number; Caption?: string | null }>>(
      "/datasets",
      { $skip: skip, $top: 1000, foreign: "false" },
    );
    if (!Array.isArray(page) || page.length === 0) break;
    for (const item of page) {
      const id = item.Id ?? 0;
      const caption = item.Caption?.trim() ?? "";
      if (id > 0 && caption) all.push({ id, caption });
    }
    if (page.length < 1000) break;
  }
  return all.length > 0 ? all : null;
}

/** Moscow API filter: attribute must be Cells/{name}, operator eq does partial match. */
export function buildMoscowCellsFilter(
  columnName: string,
  value: string,
): string {
  const escaped = value.replace(/'/g, "''");
  return `Cells/${columnName} eq '${escaped}'`;
}

export async function resolveCapitalRepairDatasetId(): Promise<number | null> {
  const fromEnv = Number.parseInt(
    process.env.MOS_CAPITAL_REPAIR_DATASET_ID ?? "",
    10,
  );
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  if (cachedRepairDatasetId !== undefined) return cachedRepairDatasetId;

  const list = await mosFetchDatasetList();
  if (!list) {
    cachedRepairDatasetId = null;
    return null;
  }

  const score = (caption: string): number => {
    const lower = caption.toLowerCase();
    let points = 0;
    if (/капитальн/.test(lower) && /ремонт/.test(lower)) points += 3;
    if (/региональн/.test(lower) && /программ/.test(lower)) points += 4;
    if (/график/.test(lower)) points += 2;
    if (/многоквартир/.test(lower) || /\bмкд\b/.test(lower)) points += 2;
    if (/счет/.test(lower) || /счёт/.test(lower)) points -= 2;
    return points;
  };

  let best: MosDatasetSummary | null = null;
  for (const item of list) {
    const points = score(item.caption);
    if (points < 3) continue;
    if (!best || points > score(best.caption)) {
      best = item;
    }
  }

  cachedRepairDatasetId = best?.id ?? null;
  if (best) {
    console.info(
      "Moscow capital repair dataset:",
      best.id,
      best.caption.slice(0, 80),
    );
  }
  return cachedRepairDatasetId;
}

export async function fetchDatasetColumns(
  datasetId: number,
): Promise<Array<{ name: string; caption: string }>> {
  const meta = await mosFetch<{
    Columns?: Array<{ Name?: string; Caption?: string | null }>;
  }>(`/datasets/${datasetId}`);
  if (!meta?.Columns) return [];
  return meta.Columns.map((col) => ({
    name: col.Name?.trim() ?? "",
    caption: col.Caption?.trim() ?? "",
  })).filter((col) => col.name);
}

export async function fetchDatasetRows(
  datasetId: number,
  options?: { skip?: number; top?: number; filter?: string },
): Promise<MosDataRow[]> {
  const result = await mosFetchRaw(`/datasets/${datasetId}/rows`, {
    $skip: options?.skip ?? 0,
    $top: options?.top ?? 1000,
    $filter: options?.filter,
  });
  const payload = result.data;
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeMosRow);
}

/** Lightweight API health check for diagnostics (does not log secrets). */
export async function probeMoscowOpenDataApi(): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  proxyConfigured: boolean;
}> {
  const result = await mosFetchRaw("/datasets", { $top: 1, foreign: "false" });
  return {
    ok: result.status === 200 && Array.isArray(result.data),
    status: result.status,
    error: result.error,
    proxyConfigured: Boolean(process.env.MOS_DATA_HTTPS_PROXY?.trim()),
  };
}

export function moscowApiHint(apiProbe?: {
  ok: boolean;
  error?: string;
  proxyConfigured?: boolean;
}): string {
  if (!isMoscowOpenDataConfigured()) {
    return "MOS_DATA_API_KEY не задан на сервере (Vercel → Environment Variables).";
  }
  if (apiProbe?.ok) {
    return "Ключ принят API data.mos.ru.";
  }
  if (apiProbe?.error === "geo_blocked_or_unreachable") {
    return apiProbe.proxyConfigured
      ? "Прокси задан, но apidata.mos.ru всё ещё недоступен — проверьте MOS_DATA_HTTPS_PROXY."
      : "Ключ задан, но apidata.mos.ru недоступен с сервера Vercel (часто блокирует зарубежные IP). Добавьте MOS_DATA_HTTPS_PROXY с HTTPS-прокси в РФ или перенесите lookup на российский хостинг.";
  }
  return "Ключ задан, но API не отвечает — проверьте MOS_DATA_API_KEY и redeploy.";
}
