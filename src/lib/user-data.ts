import type { AddressSuggestion } from "@/lib/dadata";
import type { HouseInsight, PanelHouseSnapshot } from "@/lib/house-insight";
import type { HomeAppliance, HomeListItem, InstallRequest, PanelObject } from "@/types";
import {
  authHeaders,
  canUseServerAuth,
  invalidateBrowserSessionIfNeeded,
} from "@/lib/client-auth";
import {
  BASE_PANEL_LIMIT,
  hasUnlockedPanelLimit,
  isAtPanelLimit,
  isInviteToken,
  PANEL_LIMIT_MESSAGE,
  type PanelQuota,
} from "@/lib/invites";
import {
  formatRequestPublicCode,
  type RequestTypeCode,
} from "@/lib/request-codes";
import { sortHomeItemsByRecency } from "@/lib/panel-list-meta";
import { countPanelDevices } from "@/lib/panel-rails";
import { dataUrlToFile } from "@/lib/image";

const LOCAL_KEY = "elektropasport:home-items";

/** In-flight ops per panel id so rename/delete wait for create. */
const panelOps = new Map<string, Promise<unknown>>();

const PANEL_FETCH_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = PANEL_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Превышено время ожидания сервера");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function canUseServer(): boolean {
  return canUseServerAuth();
}

function readLocalItems(): HomeListItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HomeListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Instant cache for stale-while-revalidate on the home screen. */
export function getCachedHomeItems(): HomeListItem[] {
  if (typeof window === "undefined") return [];
  return readLocalItems();
}

function writeLocalItems(items: HomeListItem[]): void {
  try {
    // Photos as data URLs blow past localStorage quotas and silently drop saves.
    const slim = items.map((item) => {
      if (item.kind !== "panel") return item;
      return {
        ...item,
        photoDataUrl: undefined,
        appliances: item.appliances?.map((appliance) => ({
          ...appliance,
          photoDataUrl: undefined,
        })),
      };
    });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(slim));
  } catch (error) {
    console.error("Failed to write home items cache", error);
  }
}

const DELETED_ITEMS_KEY = "elektropasport:deleted-item-ids";
const DELETED_ITEM_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type DeletedHomeRecord = {
  id: string;
  kind: "panel" | "install_request";
  at: number;
  snapshot?: HomeListItem;
};

function slimDeletedSnapshot(item: HomeListItem): HomeListItem {
  if (item.kind !== "panel") return item;
  return {
    ...item,
    photoDataUrl: undefined,
    appliances: item.appliances?.map((appliance) => ({
      ...appliance,
      photoDataUrl: undefined,
    })),
  };
}

function readDeletedItems(): DeletedHomeRecord[] {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - DELETED_ITEM_TTL_MS;
    return parsed.filter((entry): entry is DeletedHomeRecord => {
      if (!entry || typeof entry !== "object") return false;
      const rec = entry as DeletedHomeRecord;
      return (
        typeof rec.id === "string" &&
        (rec.kind === "panel" || rec.kind === "install_request") &&
        typeof rec.at === "number" &&
        rec.at >= cutoff
      );
    });
  } catch {
    return [];
  }
}

function writeDeletedItems(items: DeletedHomeRecord[]): void {
  try {
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to write deleted items", error);
  }
}

export function isHomeItemDeleted(id: string): boolean {
  return readDeletedItems().some((item) => item.id === id);
}

/** Remember a delete immediately so a reload cannot resurrect the item. */
export function markHomeItemDeleted(
  id: string,
  kind: "panel" | "install_request",
): void {
  const existing = readDeletedItems().find((item) => item.id === id);
  const fromCache = readLocalItems().find((item) => item.id === id);
  const snapshot = fromCache
    ? slimDeletedSnapshot(fromCache)
    : existing?.snapshot;
  const next = readDeletedItems().filter((item) => item.id !== id);
  next.push({
    id,
    kind,
    at: existing?.at ?? Date.now(),
    snapshot,
  });
  writeDeletedItems(next);
  writeLocalItems(readLocalItems().filter((item) => item.id !== id));
}

export function restoreDeletedHomeItem(id: string): HomeListItem | null {
  const record = readDeletedItems().find((item) => item.id === id);
  writeDeletedItems(readDeletedItems().filter((item) => item.id !== id));
  if (!record?.snapshot) return null;
  upsertLocalItem(record.snapshot);
  return record.snapshot;
}

async function flushDeletedItemsToServer(): Promise<void> {
  if (!canUseServer()) return;
  for (const item of readDeletedItems()) {
    try {
      const path =
        item.kind === "panel"
          ? `/api/panels/${encodeURIComponent(item.id)}`
          : `/api/install-requests/${encodeURIComponent(item.id)}`;
      const res = await fetch(path, {
        method: "DELETE",
        headers: authHeaders(),
        keepalive: true,
      });
      if (!res.ok && res.status !== 404 && res.status !== 503) {
        // Keep the tombstone and retry on the next load.
      }
    } catch {
      // Keep the tombstone and retry on the next load.
    }
  }
}

function upsertLocalItem(item: HomeListItem): void {
  if (isHomeItemDeleted(item.id)) return;
  const items = readLocalItems();
  const existing = items.find((i) => i.id === item.id);
  let merged = item;
  if (
    existing?.kind === "panel" &&
    item.kind === "panel"
  ) {
    merged = {
      ...item,
      houseSnapshot: item.houseSnapshot ?? existing.houseSnapshot,
      address:
        item.address && item.address !== "Добавлен по фото"
          ? item.address
          : existing.address,
      hasGround: item.hasGround ?? existing.hasGround,
    };
  }
  const next = items.filter((i) => i.id !== item.id);
  writeLocalItems([merged, ...next]);
}

/**
 * Photos as data URLs are too large for Vercel/Neon request bodies.
 * Keep them in client memory/localStorage only; persist metadata + devices.
 */
function applyPanelPatch(
  panel: PanelObject,
  patch: Partial<
    Pick<
      PanelObject,
      | "title"
      | "named"
      | "address"
      | "safety"
      | "phases"
      | "powerKw"
      | "hasGround"
      | "houseSnapshot"
    >
  >,
): PanelObject {
  const next: PanelObject = { ...panel };

  if (patch.title !== undefined) next.title = patch.title;
  if (patch.named !== undefined) next.named = patch.named;
  if (patch.title !== undefined) {
    next.titleUpdatedAt = new Date().toISOString();
  }
  if (patch.safety !== undefined) next.safety = patch.safety;
  if (patch.phases !== undefined) next.phases = patch.phases;
  if (patch.powerKw !== undefined) next.powerKw = patch.powerKw;
  if (patch.hasGround !== undefined) next.hasGround = patch.hasGround;

  if (
    patch.address !== undefined &&
    patch.address.trim() &&
    patch.address !== "Добавлен по фото"
  ) {
    next.address = patch.address.trim();
  }

  if (patch.houseSnapshot !== undefined) {
    const mergedAddress =
      patch.houseSnapshot.address?.trim() ||
      next.houseSnapshot?.address?.trim() ||
      (next.address !== "Добавлен по фото" ? next.address : "");
    next.houseSnapshot = {
      ...next.houseSnapshot,
      ...patch.houseSnapshot,
      ...(mergedAddress ? { address: mergedAddress } : {}),
    };
  }

  return next;
}

function sanitizePanelPatch(
  patch: Partial<
    Pick<
      PanelObject,
      | "title"
      | "named"
      | "address"
      | "safety"
      | "phases"
      | "powerKw"
      | "hasGround"
      | "houseSnapshot"
    >
  >,
): Partial<
  Pick<
    PanelObject,
    | "title"
    | "named"
    | "address"
    | "safety"
    | "phases"
    | "powerKw"
    | "hasGround"
    | "houseSnapshot"
  >
> {
  const sanitized: Partial<
    Pick<
      PanelObject,
      | "title"
      | "named"
      | "address"
      | "safety"
      | "phases"
      | "powerKw"
      | "hasGround"
      | "houseSnapshot"
    >
  > = {};

  if (patch.title !== undefined) sanitized.title = patch.title;
  if (patch.named !== undefined) sanitized.named = patch.named;
  if (patch.safety !== undefined) sanitized.safety = patch.safety;
  if (patch.phases !== undefined) sanitized.phases = patch.phases;
  if (patch.powerKw !== undefined) sanitized.powerKw = patch.powerKw;
  if (patch.hasGround !== undefined) sanitized.hasGround = patch.hasGround;

  if (
    patch.address !== undefined &&
    patch.address.trim() &&
    patch.address !== "Добавлен по фото"
  ) {
    sanitized.address = patch.address.trim();
  }

  if (patch.houseSnapshot !== undefined) {
    const snapshotAddress = patch.houseSnapshot.address?.trim();
    sanitized.houseSnapshot = {
      ...patch.houseSnapshot,
      ...(snapshotAddress && snapshotAddress !== "Добавлен по фото"
        ? { address: snapshotAddress }
        : {}),
    };
  }

  return sanitized;
}

function panelForApi(panel: PanelObject): PanelObject {
  // Photos as data URLs blow past Vercel/Neon body limits — keep them client-only.
  return {
    ...panel,
    photoDataUrl: undefined,
    appliances: panel.appliances?.map((item) => ({
      ...item,
      photoDataUrl: undefined,
    })),
  };
}

/** Prefer non-empty arrays so a partial client update cannot wipe scheme data. */
function preferNonEmptyArray<T>(
  primary?: T[] | null,
  fallback?: T[] | null,
): T[] | undefined {
  if (Array.isArray(primary) && primary.length > 0) return primary;
  if (Array.isArray(fallback) && fallback.length > 0) return fallback;
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(fallback)) return fallback;
  return undefined;
}

function applianceUpdatedAtMs(panel?: PanelObject | null): number {
  if (!panel?.appliancesUpdatedAt) return 0;
  const ms = Date.parse(panel.appliancesUpdatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/** Merge appliance lists by id without dropping items from either side. */
function mergePassportPhotoIds(
  prev?: string[],
  next?: string[],
): string[] | undefined {
  if (next === undefined) return prev;
  const prevIds = prev ?? [];
  if (next.length >= prevIds.length) {
    return [...new Set([...prevIds, ...next])];
  }
  return next;
}

function mergePassportPhotoTitles(
  ids: string[] | undefined,
  prev?: Record<string, string>,
  next?: Record<string, string>,
): Record<string, string> | undefined {
  const merged = { ...(prev ?? {}), ...(next ?? {}) };
  if (!ids?.length) {
    return Object.keys(merged).length ? merged : undefined;
  }
  const filtered: Record<string, string> = {};
  for (const id of ids) {
    if (merged[id]) filtered[id] = merged[id];
  }
  return Object.keys(filtered).length ? filtered : undefined;
}

export function mergeAppliancesUnion(
  a?: HomeAppliance[] | null,
  b?: HomeAppliance[] | null,
): HomeAppliance[] {
  const byId = new Map<string, HomeAppliance>();
  for (const item of [...(a ?? []), ...(b ?? [])]) {
    if (!item?.id) continue;
    const prev = byId.get(item.id);
    byId.set(
      item.id,
      prev
        ? (() => {
            const passportPhotoIds = mergePassportPhotoIds(
              prev.passportPhotoIds,
              item.passportPhotoIds,
            );
            return {
              ...prev,
              ...item,
              photoDataUrl: item.photoDataUrl || prev.photoDataUrl,
              passportPhotoIds,
              passportPhotoTitles: mergePassportPhotoTitles(
                passportPhotoIds,
                prev.passportPhotoTitles,
                item.passportPhotoTitles,
              ),
            };
          })()
        : item,
    );
  }
  return [...byId.values()].sort((x, y) =>
    (x.createdAt || "").localeCompare(y.createdAt || ""),
  );
}

/**
 * Last-write-wins for appliances when timestamps differ; otherwise union so
 * an in-flight add on one device is not wiped by a stale fetch.
 */
function pickAppliances(
  primary: PanelObject,
  fallback?: PanelObject | null,
): {
  appliances: HomeAppliance[] | undefined;
  appliancesUpdatedAt: string | undefined;
} {
  if (!fallback) {
    return {
      appliances: primary.appliances,
      appliancesUpdatedAt: primary.appliancesUpdatedAt,
    };
  }
  const primaryAt = applianceUpdatedAtMs(primary);
  const fallbackAt = applianceUpdatedAtMs(fallback);
  if (primaryAt > fallbackAt) {
    return {
      appliances: primary.appliances ?? [],
      appliancesUpdatedAt: primary.appliancesUpdatedAt,
    };
  }
  if (fallbackAt > primaryAt) {
    return {
      appliances: fallback.appliances ?? [],
      appliancesUpdatedAt: fallback.appliancesUpdatedAt,
    };
  }
  const union = mergeAppliancesUnion(primary.appliances, fallback.appliances);
  const hasAny =
    (primary.appliances?.length ?? 0) > 0 ||
    (fallback.appliances?.length ?? 0) > 0 ||
    Array.isArray(primary.appliances) ||
    Array.isArray(fallback.appliances);
  return {
    appliances: hasAny ? union : undefined,
    appliancesUpdatedAt:
      primary.appliancesUpdatedAt ?? fallback.appliancesUpdatedAt,
  };
}

function schemeLayoutKey(devices?: PanelObject["devices"]): string {
  if (!Array.isArray(devices) || devices.length === 0) return "";
  return devices
    .map((device) => `${device.id}:${device.rail ?? ""}:${device.position ?? ""}`)
    .join(",");
}

function schemeTouchMs(panel?: PanelObject | null): number {
  if (!panel?.schemeUpdatedAt) return 0;
  const ms = Date.parse(panel.schemeUpdatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

function pickSchemeFields(
  primary: PanelObject,
  fallback?: PanelObject | null,
): Pick<
  PanelObject,
  | "devices"
  | "wires"
  | "railCount"
  | "breakers"
  | "linesCount"
  | "schemeUpdatedAt"
> {
  if (!fallback) {
    return {
      devices: primary.devices,
      wires: primary.wires,
      railCount: primary.railCount,
      breakers: primary.breakers,
      linesCount: primary.linesCount,
      schemeUpdatedAt: primary.schemeUpdatedAt,
    };
  }
  const primaryAt = schemeTouchMs(primary);
  const fallbackAt = schemeTouchMs(fallback);
  if (fallbackAt > primaryAt) {
    return {
      devices: Array.isArray(fallback.devices)
        ? fallback.devices
        : primary.devices,
      wires: Array.isArray(fallback.wires) ? fallback.wires : primary.wires,
      railCount: fallback.railCount ?? primary.railCount,
      breakers: fallback.breakers || primary.breakers,
      linesCount: fallback.linesCount ?? primary.linesCount,
      schemeUpdatedAt: fallback.schemeUpdatedAt,
    };
  }
  if (primaryAt > fallbackAt) {
    return {
      devices: Array.isArray(primary.devices)
        ? primary.devices
        : fallback.devices,
      wires: Array.isArray(primary.wires) ? primary.wires : fallback.wires,
      railCount: primary.railCount ?? fallback.railCount,
      breakers: primary.breakers || fallback.breakers,
      linesCount: primary.linesCount ?? fallback.linesCount,
      schemeUpdatedAt: primary.schemeUpdatedAt,
    };
  }
  return {
    devices: preferNonEmptyArray(primary.devices, fallback.devices),
    wires: preferNonEmptyArray(primary.wires, fallback.wires),
    railCount: primary.railCount ?? fallback.railCount,
    breakers:
      typeof primary.breakers === "number" && primary.breakers > 0
        ? primary.breakers
        : fallback.breakers,
    linesCount: primary.linesCount ?? fallback.linesCount,
    schemeUpdatedAt: primary.schemeUpdatedAt ?? fallback.schemeUpdatedAt,
  };
}

function titleTouchMs(panel?: PanelObject | null): number {
  if (!panel?.titleUpdatedAt) return 0;
  const ms = Date.parse(panel.titleUpdatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Prefer the newer rename. Without timestamps, prefer a user-named title on the
 * fallback (usually local) so a stale server/list payload cannot undo a rename.
 */
function pickTitleFields(
  primary: PanelObject,
  fallback?: PanelObject | null,
): Pick<PanelObject, "title" | "named" | "titleUpdatedAt"> {
  if (!fallback) {
    return {
      title: primary.title,
      named: primary.named,
      titleUpdatedAt: primary.titleUpdatedAt,
    };
  }
  const primaryAt = titleTouchMs(primary);
  const fallbackAt = titleTouchMs(fallback);
  if (fallbackAt > primaryAt) {
    return {
      title: fallback.title,
      named: fallback.named,
      titleUpdatedAt: fallback.titleUpdatedAt,
    };
  }
  if (primaryAt > fallbackAt) {
    return {
      title: primary.title,
      named: primary.named,
      titleUpdatedAt: primary.titleUpdatedAt,
    };
  }
  // No timestamps: keep a named fallback only when primary is still unnamed
  // (protects in-progress rename). If both are named, trust primary (server/write).
  if (fallback.named && fallback.title.trim() && !primary.named) {
    return {
      title: fallback.title,
      named: true,
      titleUpdatedAt: fallback.titleUpdatedAt ?? primary.titleUpdatedAt,
    };
  }
  return {
    title: primary.title || fallback.title,
    named: primary.named ?? fallback.named,
    titleUpdatedAt: primary.titleUpdatedAt ?? fallback.titleUpdatedAt,
  };
}

function mergePanelForPersist(
  panel: PanelObject,
  stored?: PanelObject | null,
): PanelObject {
  if (!stored) return panel;
  const appliancesPick = pickAppliances(panel, stored);
  const titlePick = pickTitleFields(panel, stored);
  const schemePick = pickSchemeFields(panel, stored);
  const breakers = countPanelDevices({
    devices: schemePick.devices,
    breakers: schemePick.breakers,
  });
  return {
    ...stored,
    ...panel,
    ...titlePick,
    ...schemePick,
    address:
      panel.address && panel.address !== "Добавлен по фото"
        ? panel.address
        : stored.address,
    houseSnapshot: panel.houseSnapshot ?? stored.houseSnapshot,
    photoDataUrl: panel.photoDataUrl || stored.photoDataUrl,
    appliances: appliancesPick.appliances,
    appliancesUpdatedAt: appliancesPick.appliancesUpdatedAt,
    breakers,
    noPanelSetupId: panel.noPanelSetupId ?? stored.noPanelSetupId,
  };
}

export class AuthSessionExpiredError extends Error {
  constructor(message = "Сессия истекла — войдите снова") {
    super(message);
    this.name = "AuthSessionExpiredError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown; message?: unknown };
    return formatErrorMessage(data.error ?? data.message, `Ошибка ${res.status}`);
  } catch {
    return `Ошибка ${res.status}`;
  }
}

/** Coerce API/unknown throwables into a readable Russian string (never "[object Object]"). */
export function formatErrorMessage(
  error: unknown,
  fallback = "Неизвестная ошибка",
): string {
  if (error == null) return fallback;
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (!trimmed || trimmed === "[object Object]") return fallback;
    return humanizeNetworkError(trimmed);
  }
  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (msg && msg !== "[object Object]") return humanizeNetworkError(msg);
    return fallback;
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "description"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return humanizeNetworkError(value.trim());
      }
      if (value && typeof value === "object") {
        const nested = formatErrorMessage(value, "");
        if (nested) return nested;
      }
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}" && json !== "null") return json.slice(0, 240);
    } catch {
      // ignore
    }
  }
  return fallback;
}

/** Safari/WebKit often surfaces network failures as bare "Load failed". */
function humanizeNetworkError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower === "load failed" ||
    lower === "failed to fetch" ||
    lower === "networkerror when attempting to fetch resource" ||
    lower === "network request failed"
  ) {
    return "Нет связи с сервером. Проверьте интернет и обновите страницу.";
  }
  return message;
}

async function rejectUnlessOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  if (invalidateBrowserSessionIfNeeded(res)) {
    throw new AuthSessionExpiredError(await parseError(res));
  }
  throw new Error(await parseError(res));
}

function normalizeQuota(quota: PanelQuota): PanelQuota {
  const unlimited =
    quota.unlimited || hasUnlockedPanelLimit(quota.creditedInvites);
  return { ...quota, unlimited };
}

export function localPanelQuota(items: HomeListItem[]): PanelQuota {
  const panelCount = items.filter((item) => item.kind === "panel").length;
  return {
    panelCount,
    panelLimit: BASE_PANEL_LIMIT,
    remaining: Math.max(0, BASE_PANEL_LIMIT - panelCount),
    unlimited: false,
    creditedInvites: 0,
    inviteUrl: "",
    events: [],
  };
}

export async function fetchPanelQuota(): Promise<PanelQuota> {
  if (!canUseServer()) {
    return localPanelQuota(readLocalItems());
  }

  const res = await fetch("/api/invites", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 503) return localPanelQuota(readLocalItems());
    await rejectUnlessOk(res);
  }
  const data = (await res.json()) as { quota?: PanelQuota };
  if (!data.quota) return localPanelQuota(readLocalItems());
  return normalizeQuota(data.quota);
}

export async function claimInviteToken(
  token: string,
): Promise<PanelQuota | null> {
  if (!canUseServer() || !isInviteToken(token)) return null;

  const res = await fetch("/api/invites/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    if (res.status === 503) return null;
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { quota?: PanelQuota };
  return data.quota ? normalizeQuota(data.quota) : null;
}

function enqueuePanelOp<T>(id: string, op: () => Promise<T>): Promise<T> {
  const previous = panelOps.get(id) ?? Promise.resolve();
  // Always wait for the previous op — a 3s race caused overlapping writes that
  // dropped devices/appliances on the server.
  const next = previous.catch(() => undefined).then(op);
  panelOps.set(
    id,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/** Deletes of other panels must finish before a new create hits the quota check. */
let pendingPanelDeletes = Promise.resolve();

function trackPanelDelete(op: Promise<void>): Promise<void> {
  const tracked = op.then(
    () => undefined,
    () => undefined,
  );
  pendingPanelDeletes = pendingPanelDeletes.then(() => tracked);
  return op;
}

async function waitForPanelDeletes(): Promise<void> {
  await pendingPanelDeletes;
}

async function syncPanelPatchToServer(
  id: string,
  sanitized: ReturnType<typeof sanitizePanelPatch>,
  items: HomeListItem[],
): Promise<void> {
  if (!canUseServer() || isHomeItemDeleted(id)) return;

  const res = await fetchWithTimeout(`/api/panels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(sanitized),
  });

    if (!res.ok) {
      if (res.status === 404 && !isHomeItemDeleted(id)) {
        const local = items.find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.id === id,
        );
        if (local) {
        const createRes = await fetchWithTimeout("/api/panels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ panel: panelForApi(local) }),
        });
        if (createRes.ok) return;
        throw new Error(await parseError(createRes));
      }
    }
    throw new Error(await parseError(res));
  }

  try {
    const data = (await res.json()) as { panel?: PanelObject };
    if (data.panel?.id) {
      const local = items.find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === data.panel!.id,
      );
      upsertLocalItem(
        mergePanelForPersist(
          {
            ...data.panel,
            title:
              sanitized.title !== undefined
                ? sanitized.title
                : data.panel.title,
            named:
              sanitized.named !== undefined
                ? sanitized.named
                : data.panel.named,
            titleUpdatedAt:
              sanitized.title !== undefined
                ? (local?.titleUpdatedAt ?? new Date().toISOString())
                : (data.panel.titleUpdatedAt ?? local?.titleUpdatedAt),
            photoDataUrl: local?.photoDataUrl ?? data.panel.photoDataUrl,
          },
          local,
        ),
      );
    }
  } catch {
    // local patch already written
  }
}

/**
 * Rename must never wait behind device/appliance uploads and must hit
 * localStorage before any navigation/reload.
 */
export async function persistPanelRename(
  id: string,
  title: string,
  panelSnapshot?: PanelObject | null,
): Promise<void> {
  if (isHomeItemDeleted(id)) return;
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Введите название щитка");

  const sanitized = sanitizePanelPatch({ title: trimmed, named: true });
  const titleUpdatedAt = new Date().toISOString();

  const existing =
    readLocalItems().find(
      (item): item is PanelObject =>
        item.kind === "panel" && item.id === id,
    ) ??
    (panelSnapshot?.kind === "panel" && panelSnapshot.id === id
      ? panelSnapshot
      : null);

  if (existing) {
    upsertLocalItem({
      ...applyPanelPatch(existing, sanitized),
      titleUpdatedAt,
    });
  } else if (panelSnapshot && panelSnapshot.id === id) {
    upsertLocalItem({
      ...applyPanelPatch(panelSnapshot, sanitized),
      titleUpdatedAt,
    });
  }

  if (!canUseServer()) return;

  // Bypass the panel op queue — renames are tiny and must not be delayed.
  await syncPanelPatchToServer(id, sanitized, readLocalItems());
}

export async function persistPanelPatch(
  id: string,
  patch: Partial<
    Pick<
      PanelObject,
      | "title"
      | "named"
      | "address"
      | "safety"
      | "phases"
      | "powerKw"
      | "hasGround"
      | "houseSnapshot"
    >
  >,
): Promise<void> {
  if (isHomeItemDeleted(id)) return;
  const sanitized = sanitizePanelPatch(patch);

  // Title changes use the dedicated rename path (immediate local + server).
  if (sanitized.title !== undefined) {
    await persistPanelRename(id, sanitized.title);
    return;
  }

  // Apply locally first so a refresh cannot resurrect stale fields.
  const items = readLocalItems().map((item) =>
    item.kind === "panel" && item.id === id
      ? applyPanelPatch(item, sanitized)
      : item,
  );
  writeLocalItems(items);

  return enqueuePanelOp(id, async () => {
    await syncPanelPatchToServer(id, sanitized, readLocalItems());
  });
}

export async function persistPanelScheme(
  id: string,
  patch: {
    devices: NonNullable<PanelObject["devices"]>;
    wires?: PanelObject["wires"];
    breakers: number;
    linesCount: number;
    railCount: number;
  },
): Promise<void> {
  if (isHomeItemDeleted(id)) return;
  const schemeUpdatedAt = new Date().toISOString();
  const items = readLocalItems().map((item) => {
    if (item.kind !== "panel" || item.id !== id) return item;
    return {
      ...item,
      devices: patch.devices,
      wires: patch.wires ?? item.wires,
      breakers: patch.breakers,
      linesCount: patch.linesCount,
      railCount: patch.railCount,
      schemeUpdatedAt,
      lastCheck: "сегодня",
    };
  });
  writeLocalItems(items);

  return enqueuePanelOp(id, async () => {
    if (!canUseServer() || isHomeItemDeleted(id)) return;
    const local = readLocalItems().find(
      (item): item is PanelObject => item.kind === "panel" && item.id === id,
    );
    const body = {
      devices: patch.devices,
      wires: patch.wires ?? local?.wires ?? [],
      breakers: patch.breakers,
      linesCount: patch.linesCount,
      railCount: patch.railCount,
      lastCheck: "сегодня",
    };
    const res = await fetchWithTimeout(`/api/panels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 404 && local && !isHomeItemDeleted(id)) {
        const createRes = await fetchWithTimeout("/api/panels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ panel: panelForApi(local) }),
        });
        if (createRes.ok) return;
        throw new Error(await parseError(createRes));
      }
      throw new Error(await parseError(res));
    }

    try {
      const data = (await res.json()) as { panel?: PanelObject };
      if (data.panel?.id) {
        const latest = readLocalItems().find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.id === data.panel!.id,
        );
        upsertLocalItem(
          mergePanelForPersist(
            {
              ...data.panel,
              schemeUpdatedAt:
                latest?.schemeUpdatedAt ?? schemeUpdatedAt,
              photoDataUrl: latest?.photoDataUrl ?? data.panel.photoDataUrl,
            },
            latest,
          ),
        );
      }
    } catch {
      // local scheme already written
    }
  });
}

async function fetchServerHomeItems(): Promise<{
  items: HomeListItem[];
  dataEpoch: string | null;
}> {
  const res = await fetch("/api/items", {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 503) return { items: readLocalItems(), dataEpoch: null };
    if (invalidateBrowserSessionIfNeeded(res)) {
      throw new AuthSessionExpiredError(await parseError(res));
    }
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as {
    items: HomeListItem[];
    dataEpoch?: string | null;
  };
  return {
    items: Array.isArray(data.items) ? data.items : [],
    dataEpoch: data.dataEpoch ?? null,
  };
}

const DATA_EPOCH_KEY = "elektropasport:data-epoch";

function applyServerDataEpoch(dataEpoch: string | null): boolean {
  if (!dataEpoch || typeof window === "undefined") return false;
  try {
    const prev = localStorage.getItem(DATA_EPOCH_KEY);
    if (prev === dataEpoch) return false;
    localStorage.setItem(DATA_EPOCH_KEY, dataEpoch);
    // Server was wiped or epoch advanced — drop local orphans that would re-upload.
    writeLocalItems([]);
    try {
      localStorage.removeItem("elektropasport:user-profile");
      localStorage.removeItem("elektropasport:panel-snake");
      localStorage.removeItem("elektropasport:panel-snake-continues");
    } catch {
      // ignore
    }
    return true;
  } catch {
    return false;
  }
}

/** Public stats include data epoch — works without login. */
export async function syncDataEpochFromServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { dataEpoch?: string | null };
    return applyServerDataEpoch(data.dataEpoch ?? null);
  } catch {
    return false;
  }
}

/**
 * After domain moves (vercel.app → tokom.ru) or late login, panels may exist
 * only in this origin's localStorage. Push orphans to the server once.
 * Returns how many panels were accepted by the server.
 */
async function uploadLocalOnlyPanels(
  serverItems: HomeListItem[],
): Promise<number> {
  const serverIds = new Set(serverItems.map((item) => item.id));
  const orphans = readLocalItems().filter(
    (item): item is PanelObject =>
      item.kind === "panel" && !serverIds.has(item.id),
  );
  if (orphans.length === 0) return 0;

  let uploaded = 0;
  for (const panel of orphans) {
    try {
      const res = await fetch("/api/panels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ panel: panelForApi(panel) }),
      });
      if (res.ok) uploaded += 1;
    } catch {
      // keep local copy — do not wipe
    }
  }
  return uploaded;
}

async function uploadLocalOnlyInstallRequests(
  serverItems: HomeListItem[],
): Promise<number> {
  const serverIds = new Set(serverItems.map((item) => item.id));
  const orphans = readLocalItems().filter(
    (item): item is InstallRequest =>
      item.kind === "install_request" && !serverIds.has(item.id),
  );
  if (orphans.length === 0) return 0;

  let uploaded = 0;
  for (const request of orphans) {
    try {
      const res = await fetch("/api/install-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ request }),
        keepalive: true,
      });
      if (res.ok) uploaded += 1;
    } catch {
      // keep local copy — do not wipe
    }
  }
  return uploaded;
}

function pickHouseSnapshot(
  local?: PanelHouseSnapshot,
  remote?: PanelHouseSnapshot,
): PanelHouseSnapshot | undefined {
  if (!local) return remote;
  if (!remote) return local;

  const richness = (snap: PanelHouseSnapshot) =>
    (snap.address?.trim() && snap.address !== "Добавлен по фото" ? 15 : 0) +
    (snap.buildingYear ? 10 : 0) +
    (snap.operationYear ? 5 : 0) +
    (snap.dataSource ? 3 : 0) +
    (snap.capitalRepairMessage ? 1 : 0);

  const winner = richness(local) >= richness(remote) ? local : remote;
  const address = [winner.address, local.address, remote.address].find(
    (value) => value?.trim() && value !== "Добавлен по фото",
  );
  return address ? { ...winner, address } : winner;
}

function resolvePanelAddress(
  local: PanelObject,
  remote: PanelObject,
  houseSnapshot?: PanelHouseSnapshot,
): string {
  const candidates = [
    houseSnapshot?.address,
    local.address,
    remote.address,
    local.houseSnapshot?.address,
    remote.houseSnapshot?.address,
  ];
  for (const value of candidates) {
    if (value?.trim() && value !== "Добавлен по фото") return value.trim();
  }
  return local.address ?? remote.address;
}

function mergePanelHouseFields(
  local: PanelObject,
  remote: PanelObject,
): Pick<PanelObject, "houseSnapshot" | "address" | "hasGround" | "createdAt"> {
  const houseSnapshot = pickHouseSnapshot(local.houseSnapshot, remote.houseSnapshot);
  const address = resolvePanelAddress(local, remote, houseSnapshot);

  return {
    houseSnapshot:
      houseSnapshot && address && houseSnapshot.address !== address
        ? { ...houseSnapshot, address }
        : houseSnapshot,
    address,
    hasGround: local.hasGround ?? remote.hasGround,
    createdAt: local.createdAt ?? remote.createdAt,
  };
}

function panelDataScore(panel: PanelObject): number {
  const devices = Array.isArray(panel.devices) ? panel.devices.length : 0;
  return (
    devices * 10 +
    (panel.photoDataUrl ? 5 : 0) +
    (panel.houseSnapshot ? 3 : 0) +
    (panel.wires?.length ?? 0)
  );
}

function dedupeHomeItems(items: HomeListItem[]): HomeListItem[] {
  const byId = new Map<string, HomeListItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    if (existing.kind === "panel" && item.kind === "panel") {
      byId.set(
        item.id,
        panelDataScore(item) >= panelDataScore(existing) ? item : existing,
      );
    }
  }
  return sortHomeItemsByRecency([...byId.values()]);
}

/** Keep in-memory house/address/title edits when a stale fetch completes. */
export function mergeHomeItemsWithLocalState(
  fetched: HomeListItem[],
  current: HomeListItem[],
): HomeListItem[] {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const fetchedIds = new Set(fetched.map((item) => item.id));

  const merged = fetched.map((item) => {
    if (item.kind !== "panel") return item;
    const live = currentById.get(item.id);
    if (!live || live.kind !== "panel") return item;
    const titlePick = pickTitleFields(item, live);
    return {
      ...item,
      ...mergePanelHouseFields(live, item),
      ...titlePick,
      noPanelSetupId: live.noPanelSetupId ?? item.noPanelSetupId,
    };
  });

  for (const item of current) {
    if (!fetchedIds.has(item.id)) merged.push(item);
  }

  return dedupeHomeItems(merged);
}

function mergeServerWithLocal(serverItems: HomeListItem[]): HomeListItem[] {
  const localItems = readLocalItems();
  const localById = new Map(
    localItems
      .filter((i): i is PanelObject => i.kind === "panel")
      .map((i) => [i.id, i]),
  );

  // Authenticated home list is server-owned: never resurrect local-only orphans.
  return dedupeHomeItems(
    serverItems.map((item) => {
      if (item.kind !== "panel") return item;
      const local = localById.get(item.id);
      if (!local) return item;
      return mergePanelForPersist(item, local);
    }),
  );
}

export async function fetchHomeItems(): Promise<HomeListItem[]> {
  if (!canUseServer()) {
    // Guest mode must not show leftover local panels/requests from old sessions.
    writeLocalItems([]);
    return [];
  }

  try {
    await flushDeletedItemsToServer();
    const remote = await fetchServerHomeItems();
    applyServerDataEpoch(remote.dataEpoch);
    const deletedIds = new Set(readDeletedItems().map((item) => item.id));
    const merged = mergeServerWithLocal(
      remote.items.filter((item) => !deletedIds.has(item.id)),
    );
    writeLocalItems(merged);

    // Heal server copies that lost scheme/appliances after a partial client save.
    for (const item of merged) {
      if (item.kind !== "panel") continue;
      const server = remote.items.find(
        (entry): entry is PanelObject =>
          entry.kind === "panel" && entry.id === item.id,
      );
      const localHasDevices = (item.devices?.length ?? 0) > 0;
      const serverHasDevices = (server?.devices?.length ?? 0) > 0;
      const localSchemeNewer = schemeTouchMs(item) > schemeTouchMs(server);
      const localSchemeDiffers =
        schemeLayoutKey(item.devices) !== schemeLayoutKey(server?.devices);
      const localAppliancesNewer =
        applianceUpdatedAtMs(item) > applianceUpdatedAtMs(server);
      const localHasMoreAppliances =
        (item.appliances?.length ?? 0) > (server?.appliances?.length ?? 0);
      if (
        (localHasDevices && !serverHasDevices) ||
        (localSchemeNewer && localSchemeDiffers) ||
        localAppliancesNewer ||
        localHasMoreAppliances
      ) {
        void persistPanel(item).catch((error) => console.error(error));
      }
    }

    return merged;
  } catch (error) {
    if (error instanceof AuthSessionExpiredError) throw error;
    throw error;
  }
}

/** Force-refresh from server. Local-only upload is disabled — DB is the source of truth. */
export async function syncLocalPanelsToServer(): Promise<{
  uploaded: number;
  items: HomeListItem[];
}> {
  if (!canUseServer()) {
    writeLocalItems([]);
    return { uploaded: 0, items: [] };
  }
  const items = await fetchHomeItems();
  return { uploaded: 0, items };
}

export type HomeBackupPayload = {
  version: 1;
  exportedAt: string;
  items: HomeListItem[];
  profile?: {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    phoneDigits?: string;
    avatarId?: string;
  };
};

export function exportHomeBackup(): HomeBackupPayload {
  let profile: HomeBackupPayload["profile"];
  try {
    const raw = localStorage.getItem("elektropasport:user-profile");
    if (raw) profile = JSON.parse(raw) as HomeBackupPayload["profile"];
  } catch {
    // ignore
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: readLocalItems(),
    profile,
  };
}

/** Merge a backup into local storage and push panels to the server when authed. */
export async function importHomeBackup(
  payload: HomeBackupPayload,
): Promise<HomeListItem[]> {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.items)) {
    throw new Error("Некорректный файл резервной копии");
  }

  const existing = readLocalItems();
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of payload.items) {
    if (!item || typeof item !== "object" || !("id" in item)) continue;
    byId.set(item.id, item as HomeListItem);
  }
  writeLocalItems(Array.from(byId.values()));

  if (payload.profile) {
    try {
      localStorage.setItem(
        "elektropasport:user-profile",
        JSON.stringify(payload.profile),
      );
    } catch {
      // ignore
    }
  }

  return fetchHomeItems();
}

export async function persistPanel(panel: PanelObject): Promise<void> {
  return enqueuePanelOp(panel.id, async () => {
    if (isHomeItemDeleted(panel.id)) return;
    await waitForPanelDeletes();
    if (isHomeItemDeleted(panel.id)) return;
    const stored = readLocalItems().find(
      (item): item is PanelObject =>
        item.kind === "panel" && item.id === panel.id,
    );
    const merged = mergePanelForPersist(panel, stored);

    const already = Boolean(stored);
    // Server auth: the API enforces quota. Offline/local-only: check free tier here.
    // Never pass `undefined` quota into isAtPanelLimit — that treats any existing
    // local panel as "at limit" even when the account is unlimited.
    if (!already && !canUseServer()) {
      const localCount = readLocalItems().filter(
        (item) => item.kind === "panel",
      ).length;
      if (isAtPanelLimit(localPanelQuota(readLocalItems()), localCount)) {
        const error = new Error(PANEL_LIMIT_MESSAGE);
        error.name = "PanelLimitError";
        throw error;
      }
    }

    upsertLocalItem(merged);

    if (!canUseServer()) return;

    const res = await fetchWithTimeout("/api/panels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ panel: panelForApi(merged) }),
    });

    if (!res.ok) {
      if (res.status === 403) {
        const error = new Error(await parseError(res));
        error.name = "PanelLimitError";
        throw error;
      }
      throw new Error(await parseError(res));
    }

    try {
      const data = (await res.json()) as { panel?: PanelObject };
      if (data.panel?.id) {
        const latestLocal = readLocalItems().find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.id === data.panel!.id,
        );
        upsertLocalItem(
          mergePanelForPersist(
            {
              ...data.panel,
              photoDataUrl:
                latestLocal?.photoDataUrl ??
                merged.photoDataUrl ??
                data.panel.photoDataUrl,
            },
            latestLocal ?? merged,
          ),
        );
      }
    } catch {
      // local merge already written
    }
  });
}

export async function fetchPanelById(id: string): Promise<PanelObject | null> {
  if (!canUseServer()) {
    return (
      readLocalItems().find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === id,
      ) ?? null
    );
  }

  const res = await fetchWithTimeout(`/api/panels/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 503) return null;
    if (invalidateBrowserSessionIfNeeded(res)) {
      throw new AuthSessionExpiredError(await parseError(res));
    }
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { panel?: PanelObject };
  if (!data.panel?.id) return null;

  const local = readLocalItems().find(
    (item): item is PanelObject =>
      item.kind === "panel" && item.id === data.panel!.id,
  );
  const merged = mergePanelForPersist(data.panel, local);
  if (isHomeItemDeleted(merged.id)) return merged;
  upsertLocalItem(merged);
  return merged;
}

export async function persistPanelAppliances(
  id: string,
  appliances: NonNullable<PanelObject["appliances"]>,
): Promise<PanelObject | null> {
  return enqueuePanelOp(id, async () => {
    if (isHomeItemDeleted(id)) return null;
    const stored = readLocalItems().find(
      (item): item is PanelObject =>
        item.kind === "panel" && item.id === id,
    );
    if (!stored) {
      throw new Error("Щиток не найден");
    }

    const slimAppliances = appliances.map((item) => ({
      ...item,
      photoDataUrl: undefined,
    }));
    const appliancesUpdatedAt = new Date().toISOString();
    const next: PanelObject = {
      ...stored,
      appliances: slimAppliances,
      appliancesUpdatedAt,
      lastCheck: "сегодня",
    };
    upsertLocalItem(next);

    if (!canUseServer()) return next;

    const res = await fetchWithTimeout(`/api/panels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        appliances: slimAppliances,
        appliancesUpdatedAt,
        lastCheck: "сегодня",
      }),
    });

    if (!res.ok) {
      if (res.status === 404 && !isHomeItemDeleted(id)) {
        // Panel not on server yet — full create with scheme + appliances.
        const createRes = await fetchWithTimeout("/api/panels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ panel: panelForApi(next) }),
        });
        if (!createRes.ok) {
          throw new Error(await parseError(createRes));
        }
        try {
          const data = (await createRes.json()) as { panel?: PanelObject };
          if (data.panel?.id) {
            const merged: PanelObject = {
              ...mergePanelForPersist(
                {
                  ...data.panel,
                  photoDataUrl: stored.photoDataUrl ?? data.panel.photoDataUrl,
                },
                next,
              ),
              // Authoritative write from this device — never drop the list we just saved.
              appliances: slimAppliances,
              appliancesUpdatedAt,
            };
            upsertLocalItem(merged);
            return merged;
          }
        } catch {
          // keep local
        }
        return next;
      }
      throw new Error(await parseError(res));
    }

    try {
      const data = (await res.json()) as { panel?: PanelObject };
      if (data.panel?.id) {
        const merged: PanelObject = {
          ...mergePanelForPersist(
            {
              ...data.panel,
              photoDataUrl: stored.photoDataUrl ?? data.panel.photoDataUrl,
            },
            next,
          ),
          appliances: slimAppliances,
          appliancesUpdatedAt:
            data.panel.appliancesUpdatedAt ?? appliancesUpdatedAt,
        };
        upsertLocalItem(merged);
        return merged;
      }
    } catch {
      // keep local
    }
    return next;
  });
}

export async function createPanelShare(
  panelId: string,
  scope: "scheme" | "full" = "full",
): Promise<{ token: string; url: string }> {
  const res = await fetch(`/api/panels/${encodeURIComponent(panelId)}/share`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scope }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as { token: string; url: string };
}

export async function fetchSharedPanel(token: string): Promise<{
  panel: PanelObject;
  isOwner: boolean;
}> {
  const res = await fetch(`/api/shares/${encodeURIComponent(token)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as { panel: PanelObject; isOwner: boolean };
}

export async function persistDeletePanel(id: string): Promise<void> {
  markHomeItemDeleted(id, "panel");
  return trackPanelDelete(
    enqueuePanelOp(id, async () => {
      if (!isHomeItemDeleted(id)) return;
      writeLocalItems(readLocalItems().filter((item) => item.id !== id));

      if (!canUseServer()) return;

      const res = await fetchWithTimeout(
        `/api/panels/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
          keepalive: true,
        },
      );

      if (!res.ok) {
        if (res.status === 503 || res.status === 404) return;
        throw new Error(await parseError(res));
      }
    }),
  );
}

const LOCAL_CODE_COUNTERS_KEY = "elektropasport:request-code-counters";

function allocateLocalRequestPublicCode(typeCode: RequestTypeCode): string {
  try {
    const raw = localStorage.getItem(LOCAL_CODE_COUNTERS_KEY);
    const counters = raw
      ? (JSON.parse(raw) as Record<string, number>)
      : {};
    const next = (counters[typeCode] ?? 0) + 1;
    counters[typeCode] = next;
    localStorage.setItem(LOCAL_CODE_COUNTERS_KEY, JSON.stringify(counters));
    return formatRequestPublicCode(typeCode, next);
  } catch {
    return formatRequestPublicCode(typeCode, Date.now() % 10000);
  }
}

export async function allocateRequestPublicCode(
  typeCode: RequestTypeCode,
): Promise<string> {
  if (!canUseServer()) {
    return allocateLocalRequestPublicCode(typeCode);
  }

  try {
    const res = await fetch("/api/install-requests/next-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ typeCode }),
    });
    if (!res.ok) {
      return allocateLocalRequestPublicCode(typeCode);
    }
    const data = (await res.json()) as { publicCode?: string };
    if (data.publicCode && /^[A-Z]-\d{4}$/.test(data.publicCode)) {
      return data.publicCode;
    }
  } catch {
    // fall through to local
  }
  return allocateLocalRequestPublicCode(typeCode);
}

export async function suggestAddresses(
  query: string,
  city: string,
  options?: { source?: "dadata" | "moscow" },
): Promise<AddressSuggestion[]> {
  if (!canUseServer()) {
    throw new Error("Подсказки адресов доступны после входа через Telegram");
  }

  const res = await fetch("/api/address-suggest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      query,
      city,
      source: options?.source ?? "dadata",
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

export async function lookupHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
  buildingYear?: number | null;
}): Promise<HouseInsight> {
  if (!canUseServer()) {
    throw new Error("Справка по дому доступна после входа через Telegram");
  }

  const res = await fetch("/api/house-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      city: input.city,
      address: input.address,
      fiasId: input.fiasId ?? undefined,
      street: input.street ?? undefined,
      house: input.house ?? undefined,
      block: input.block ?? undefined,
      buildingYear: input.buildingYear ?? undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { insight?: HouseInsight };
  if (!data.insight) {
    throw new Error("Не удалось получить данные о доме");
  }
  return data.insight;
}

export type SbpPaymentClient = {
  id: string;
  amountRub: number;
  status: "pending" | "confirmed" | "failed";
  qrPayload: string | null;
  qrImage: string | null;
  tbankPaymentId: string | null;
};

export async function createSbpPayment(
  lead: import("@/lib/pending-lead").PendingInstallLead,
): Promise<SbpPaymentClient> {
  if (!canUseServer()) {
    throw new Error("Оплата доступна после входа через Telegram");
  }
  const res = await fetch("/api/payments/sbp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ lead }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SbpPaymentClient;
}

export async function fetchSbpPayment(id: string): Promise<SbpPaymentClient> {
  if (!canUseServer()) {
    throw new Error("Оплата доступна после входа через Telegram");
  }
  const res = await fetch(`/api/payments/sbp/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SbpPaymentClient;
}

export async function fetchSchoolPaidGrades(): Promise<
  import("@/lib/school/types").GradeId[]
> {
  if (!canUseServer()) return [];
  const res = await fetch("/api/school/access", {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { paidGrades?: unknown };
  if (!Array.isArray(data.paidGrades)) return [];
  return data.paidGrades.filter(
    (value): value is 1 | 2 | 3 | 4 =>
      value === 1 || value === 2 || value === 3 || value === 4,
  );
}

export async function createSchoolPayment(
  gradeId: import("@/lib/school/types").GradeId,
): Promise<SbpPaymentClient> {
  if (!canUseServer()) {
    throw new Error("Оплата доступна после входа через Telegram");
  }
  const res = await fetch("/api/payments/school", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ gradeId }),
  });
  if (res.status === 409) {
    return {
      id: "already-paid",
      amountRub: 0,
      status: "confirmed",
      qrPayload: null,
      qrImage: null,
      tbankPaymentId: null,
    };
  }
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SbpPaymentClient;
}

export function openSbpPayload(payload: string): void {
  const url = payload.startsWith("http")
    ? payload
    : `https://qr.nspk.ru/${payload}`;
  const webApp = window.Telegram?.WebApp as
    | { openLink?: (link: string) => void }
    | undefined;
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function persistInstallRequest(
  request: InstallRequest,
): Promise<{ botCanMessage?: boolean }> {
  if (isHomeItemDeleted(request.id)) return {};
  upsertLocalItem(request);

  if (!canUseServer()) return {};

  try {
    const res = await fetch("/api/install-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ request }),
      keepalive: true,
    });

    if (!res.ok) {
      if (res.status === 503) return {};
      throw new Error(await parseError(res));
    }

    try {
      const data = (await res.json()) as { botCanMessage?: boolean };
      return { botCanMessage: data.botCanMessage };
    } catch {
      return {};
    }
  } catch (error) {
    // Local copy is already saved. Network abort is common when Telegram
    // opens on top of the Mini App / Safari tab ("Load failed").
    console.error("persistInstallRequest network error", error);
    return {};
  }
}

export async function persistInstallRequestPatch(
  id: string,
  patch: Partial<
    Pick<
      InstallRequest,
      | "title"
      | "status"
      | "statusLabel"
      | "exactAddress"
      | "paymentStatus"
      | "paidAmountRub"
    >
  >,
): Promise<void> {
  if (isHomeItemDeleted(id)) return;
  const items = readLocalItems().map((item) =>
    item.kind === "install_request" && item.id === id
      ? { ...item, ...patch }
      : item,
  );
  writeLocalItems(items);

  if (!canUseServer()) return;

  const res = await fetch(`/api/install-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    if (res.status === 503) return;
    throw new Error(await parseError(res));
  }
}

export async function persistDeleteInstallRequest(id: string): Promise<void> {
  markHomeItemDeleted(id, "install_request");
  writeLocalItems(readLocalItems().filter((item) => item.id !== id));

  if (!canUseServer()) return;

  const res = await fetch(`/api/install-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
    keepalive: true,
  });

  if (!res.ok) {
    if (res.status === 503 || res.status === 404) return;
    throw new Error(await parseError(res));
  }
}

export async function persistMasterApplication(payload: {
  id: string;
  city: string;
  about?: string;
  contactMethod: "phone" | "telegram";
  phone?: string;
  name: string;
  educationDocsCount?: number;
  examScore?: number;
  examTotal?: number;
  examGrade?: number;
  educationDocs?: string[];
}): Promise<void> {
  if (!canUseServer()) return;

  const res = await fetch("/api/master-applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      id: payload.id,
      city: payload.city,
      about: payload.about,
      contactMethod: payload.contactMethod,
      phone: payload.phone,
      name: payload.name,
      educationDocsCount:
        payload.educationDocsCount ?? payload.educationDocs?.length,
      examScore: payload.examScore,
      examTotal: payload.examTotal,
      examGrade: payload.examGrade,
    }),
  });

  if (!res.ok) {
    if (res.status === 503) return;
    throw new Error(await parseError(res));
  }

  const docs = payload.educationDocs ?? [];
  for (let i = 0; i < docs.length; i += 1) {
    const file = dataUrlToFile(docs[i], `education-${i + 1}.jpg`);
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("applicationId", payload.id);
    form.append("name", payload.name);
    form.append("index", String(i + 1));
    form.append("total", String(docs.length));
    const attachRes = await fetch("/api/master-applications/attachment", {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!attachRes.ok) {
      console.error(await parseError(attachRes));
    }
  }
}

export async function fetchIsAdmin(): Promise<boolean> {
  if (!canUseServer()) return false;
  const res = await fetch("/api/admin/me", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { isAdmin?: boolean };
  return Boolean(data.isAdmin);
}

export async function fetchAdminDashboard(): Promise<
  import("@/lib/admin-db").AdminDashboardData
> {
  const res = await fetch("/api/admin/dashboard", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as import("@/lib/admin-db").AdminDashboardData;
}

export async function adminAddAdmin(telegramId: number): Promise<void> {
  const res = await fetch("/api/admin/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ telegramId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function adminRemoveAdmin(telegramId: number): Promise<void> {
  const res = await fetch(`/api/admin/admins/${telegramId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function adminSetRole(
  telegramId: number,
  role: "user" | "master",
): Promise<void> {
  const res = await fetch(`/api/admin/users/${telegramId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function adminSetRequestStatus(
  requestId: string,
  status: "new" | "in_progress" | "done" | "cancelled",
): Promise<void> {
  const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function adminDeleteRequest(requestId: string): Promise<void> {
  const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchAdminPanel(
  panelId: string,
): Promise<import("@/types").PanelObject> {
  const res = await fetch(`/api/admin/panels/${encodeURIComponent(panelId)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { panel: import("@/types").PanelObject };
  return data.panel;
}

export type AdminPushAudience = {
  deviceCount: number;
  userCount: number;
  subscribers: Array<{
    telegramId: number;
    firstName: string;
    lastName: string;
    username: string;
    devices: number;
    updatedAt: string | null;
  }>;
};

export async function fetchAdminPushAudience(): Promise<AdminPushAudience> {
  const res = await fetch("/api/admin/push", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminPushAudience;
}

export async function adminSendPush(input: {
  title: string;
  body: string;
  url?: string;
  telegramId?: number;
}): Promise<{ users: number; sent: number }> {
  const res = await fetch("/api/admin/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { users: number; sent: number };
}

const VISITOR_KEY = "elektropasport:visitor-key";

export function getOrCreateVisitorKey(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(VISITOR_KEY)?.trim();
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return `v_${Date.now()}`;
  }
}

export async function recordInviteLinkOpen(token: string): Promise<void> {
  if (!isInviteToken(token)) return;
  try {
    await fetch("/api/invites/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        visitorKey: getOrCreateVisitorKey(),
      }),
      keepalive: true,
    });
  } catch {
    // best-effort analytics
  }
}

/* ───── Master system ───── */

export type MasterProfileData = {
  isMaster: boolean;
  role: "user" | "master";
  profile?: {
    firstName: string;
    lastName: string;
    phone: string;
    username: string;
    ordersCount: number;
    rating: number;
  };
};

export async function fetchMasterProfile(): Promise<MasterProfileData> {
  if (!canUseServer()) return { isMaster: false, role: "user" };
  const res = await fetch("/api/master/profile", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { isMaster: false, role: "user" };
  return (await res.json()) as MasterProfileData;
}

export async function fetchMasterRequests(): Promise<InstallRequest[]> {
  if (!canUseServer()) return [];
  const res = await fetch("/api/master/requests", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { requests: InstallRequest[] };
  return data.requests ?? [];
}

export async function fetchMasterRequestPanel(
  requestId: string,
): Promise<PanelObject> {
  const res = await fetch(
    `/api/master/requests/${encodeURIComponent(requestId)}/panel`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { panel: PanelObject };
  return data.panel;
}

export async function dispatchToMasters(
  requestId: string,
): Promise<{ mastersCount: number }> {
  if (!canUseServer()) return { mastersCount: 0 };
  const res = await fetch("/api/master/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ requestId }),
  });
  if (!res.ok) return { mastersCount: 0 };
  return (await res.json()) as { mastersCount: number };
}

export async function pollRequestStatus(
  requestId: string,
): Promise<{
  status: "searching" | "accepted";
  master?: {
    firstName: string;
    phone: string;
    username: string;
    rating?: number;
  };
}> {
  if (!canUseServer()) return { status: "searching" };
  const res = await fetch(
    `/api/master/request-status?requestId=${encodeURIComponent(requestId)}`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) return { status: "searching" };
  return (await res.json()) as {
    status: "searching" | "accepted";
    master?: {
      firstName: string;
      phone: string;
      username: string;
      rating?: number;
    };
  };
}

export async function submitMasterFeedback(payload: {
  requestId: string;
  userReached?: boolean;
  masterReached?: boolean;
  userScore?: number;
}): Promise<void> {
  if (!canUseServer()) return;
  await fetch("/api/master/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

export async function persistFeedback(payload: {
  message: string;
  topic: "bugs" | "tips" | "other";
  files?: File[];
}): Promise<void> {
  if (!canUseServer()) {
    throw new Error("Откройте приложение в Telegram, чтобы отправить сообщение");
  }

  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      message: payload.message,
      topic: payload.topic,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  for (const file of payload.files ?? []) {
    const form = new FormData();
    form.append("file", file, file.name);
    const attachRes = await fetch("/api/feedback/attachment", {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!attachRes.ok) {
      throw new Error(await parseError(attachRes));
    }
  }
}

export async function persistResearchSurvey(
  answers: Record<string, string | string[]>,
): Promise<void> {
  const res = await fetch("/api/research-survey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}
