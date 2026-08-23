import type { AddressSuggestion } from "@/lib/dadata";
import type { HouseInsight, PanelHouseSnapshot } from "@/lib/house-insight";
import type { HomeListItem, InstallRequest, PanelObject } from "@/types";
import {
  authHeaders,
  canUseServerAuth,
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
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(sortHomeItemsByRecency(slim)),
    );
  } catch (error) {
    console.error("Failed to write home items cache", error);
  }
}

function upsertLocalItem(item: HomeListItem): void {
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
  return {
    ...panel,
    photoDataUrl: undefined,
    appliances: panel.appliances?.map((item) => ({
      ...item,
      photoDataUrl: undefined,
    })),
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Ошибка ${res.status}`;
  } catch {
    return `Ошибка ${res.status}`;
  }
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
    throw new Error(await parseError(res));
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
  const released = Promise.race([
    previous.catch(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 3_000);
    }),
  ]);
  const next = released.then(op);
  panelOps.set(
    id,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function syncPanelPatchToServer(
  id: string,
  sanitized: ReturnType<typeof sanitizePanelPatch>,
  items: HomeListItem[],
): Promise<void> {
  if (!canUseServer()) return;

  const res = await fetchWithTimeout(`/api/panels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(sanitized),
  });

  if (!res.ok) {
    if (res.status === 404) {
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
}

async function fetchServerHomeItems(): Promise<HomeListItem[]> {
  const res = await fetch("/api/items", {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 503) return readLocalItems();
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { items: HomeListItem[] };
  return Array.isArray(data.items) ? data.items : [];
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

/** Keep in-memory house/address edits when a stale fetch completes. */
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
    return { ...item, ...mergePanelHouseFields(live, item) };
  });

  for (const item of current) {
    if (!fetchedIds.has(item.id)) merged.push(item);
  }

  return sortHomeItemsByRecency(merged);
}

function mergeServerWithLocal(serverItems: HomeListItem[]): HomeListItem[] {
  const localItems = readLocalItems();
  const localById = new Map(
    localItems
      .filter((i): i is PanelObject => i.kind === "panel")
      .map((i) => [i.id, i]),
  );
  const serverIds = new Set(serverItems.map((item) => item.id));

  const mergedServer = serverItems.map((item) => {
    if (item.kind !== "panel") return item;
    const local = localById.get(item.id);
    if (!local) return item;
    const serverDevices = item.devices ?? [];
    const localDevices = local.devices ?? [];
    const serverAppliances = item.appliances ?? [];
    const localAppliances = local.appliances ?? [];
    return {
      ...item,
      photoDataUrl: item.photoDataUrl || local.photoDataUrl,
      devices: serverDevices.length > 0 ? serverDevices : localDevices,
      appliances:
        serverAppliances.length > 0
          ? serverAppliances.map((remote) => {
              const localMatch = localAppliances.find((a) => a.id === remote.id);
              if (!localMatch) return remote;
              return {
                ...remote,
                photoDataUrl: remote.photoDataUrl || localMatch.photoDataUrl,
              };
            })
          : localAppliances,
      railCount: item.railCount ?? local.railCount,
      wires:
        item.wires && item.wires.length > 0 ? item.wires : local.wires,
      ...mergePanelHouseFields(local, item),
    };
  });

  // Never drop local-only panels if the server does not have them yet.
  const orphans = localItems.filter((item) => !serverIds.has(item.id));
  return sortHomeItemsByRecency([...mergedServer, ...orphans]);
}

export async function fetchHomeItems(): Promise<HomeListItem[]> {
  if (!canUseServer()) {
    return readLocalItems();
  }

  const serverItems = await fetchServerHomeItems();
  const merged = mergeServerWithLocal(serverItems);
  writeLocalItems(merged);

  // Push local-only panels in the background — do not block the home screen.
  const serverIds = new Set(serverItems.map((item) => item.id));
  const hasOrphans = readLocalItems().some(
    (item) => item.kind === "panel" && !serverIds.has(item.id),
  );
  if (hasOrphans) {
    void uploadLocalOnlyPanels(serverItems)
      .then(async (uploaded) => {
        if (uploaded <= 0) return;
        const fresh = await fetchServerHomeItems();
        writeLocalItems(mergeServerWithLocal(fresh));
      })
      .catch((error) => console.error(error));
  }

  return merged;
}

/** Force-upload every local-only panel, then return the refreshed list. */
export async function syncLocalPanelsToServer(): Promise<{
  uploaded: number;
  items: HomeListItem[];
}> {
  if (!canUseServer()) {
    return { uploaded: 0, items: readLocalItems() };
  }
  const before = await fetchServerHomeItems();
  const uploaded = await uploadLocalOnlyPanels(before);
  const items = await fetchHomeItems();
  return { uploaded, items };
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
    const stored = readLocalItems().find(
      (item): item is PanelObject =>
        item.kind === "panel" && item.id === panel.id,
    );
    const merged: PanelObject = stored
      ? {
          ...stored,
          ...panel,
          address:
            panel.address && panel.address !== "Добавлен по фото"
              ? panel.address
              : stored.address,
          houseSnapshot: panel.houseSnapshot ?? stored.houseSnapshot,
          devices: panel.devices ?? stored.devices,
          wires: panel.wires ?? stored.wires,
          appliances: panel.appliances ?? stored.appliances,
        }
      : panel;

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
      if (res.status === 503) return;
      if (res.status === 403) {
        writeLocalItems(readLocalItems().filter((item) => item.id !== panel.id));
        const error = new Error(await parseError(res));
        error.name = "PanelLimitError";
        throw error;
      }
      throw new Error(await parseError(res));
    }
  });
}

export async function createPanelShare(
  panelId: string,
): Promise<{ token: string; url: string }> {
  const res = await fetch(`/api/panels/${encodeURIComponent(panelId)}/share`, {
    method: "POST",
    headers: authHeaders(),
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
  const sanitized = sanitizePanelPatch(patch);

  const items = readLocalItems().map((item) =>
    item.kind === "panel" && item.id === id
      ? applyPanelPatch(item, sanitized)
      : item,
  );
  writeLocalItems(items);

  await syncPanelPatchToServer(id, sanitized, items);
}

export async function persistDeletePanel(id: string): Promise<void> {
  return enqueuePanelOp(id, async () => {
    writeLocalItems(readLocalItems().filter((item) => item.id !== id));

    if (!canUseServer()) return;

    const res = await fetchWithTimeout(`/api/panels/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!res.ok) {
      if (res.status === 503 || res.status === 404) return;
      throw new Error(await parseError(res));
    }
  });
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
    Pick<InstallRequest, "title" | "status" | "statusLabel" | "exactAddress">
  >,
): Promise<void> {
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
  writeLocalItems(readLocalItems().filter((item) => item.id !== id));

  if (!canUseServer()) return;

  const res = await fetch(`/api/install-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
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
}): Promise<void> {
  if (!canUseServer()) return;

  const res = await fetch("/api/master-applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 503) return;
    throw new Error(await parseError(res));
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
  master?: { firstName: string; phone: string; username: string };
}> {
  if (!canUseServer()) return { status: "searching" };
  const res = await fetch(
    `/api/master/request-status?requestId=${encodeURIComponent(requestId)}`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) return { status: "searching" };
  return (await res.json()) as {
    status: "searching" | "accepted";
    master?: { firstName: string; phone: string; username: string };
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
