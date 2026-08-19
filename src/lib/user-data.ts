import type { AddressSuggestion } from "@/lib/dadata";
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

const LOCAL_KEY = "elektropasport:home-items";

/** In-flight ops per panel id so rename/delete wait for create. */
const panelOps = new Map<string, Promise<unknown>>();

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

function writeLocalItems(items: HomeListItem[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — ignore
  }
}

function upsertLocalItem(item: HomeListItem): void {
  const items = readLocalItems().filter((i) => i.id !== item.id);
  writeLocalItems([item, ...items]);
}

/**
 * Photos as data URLs are too large for Vercel/Neon request bodies.
 * Keep them in client memory/localStorage only; persist metadata + devices.
 */
function panelForApi(panel: PanelObject): PanelObject {
  return {
    ...panel,
    photoDataUrl: undefined,
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

export async function fetchHomeItems(): Promise<HomeListItem[]> {
  if (!canUseServer()) {
    return readLocalItems();
  }

  const res = await fetch("/api/items", {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 503) return readLocalItems();
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { items: HomeListItem[] };
  const localById = new Map(
    readLocalItems()
      .filter((i): i is PanelObject => i.kind === "panel")
      .map((i) => [i.id, i]),
  );
  const merged = data.items.map((item) => {
    if (item.kind !== "panel") return item;
    const local = localById.get(item.id);
    if (!local) return item;
    const serverDevices = item.devices ?? [];
    const localDevices = local.devices ?? [];
    return {
      ...item,
      photoDataUrl: item.photoDataUrl || local.photoDataUrl,
      devices:
        serverDevices.length > 0 ? serverDevices : localDevices,
      railCount: item.railCount ?? local.railCount,
      wires:
        item.wires && item.wires.length > 0
          ? item.wires
          : local.wires,
    };
  });
  writeLocalItems(merged);
  return merged;
}

export async function persistPanel(panel: PanelObject): Promise<void> {
  return enqueuePanelOp(panel.id, async () => {
    const already = readLocalItems().some((item) => item.id === panel.id);
    if (!already) {
      const localCount = readLocalItems().filter(
        (item) => item.kind === "panel",
      ).length;
      const quota = canUseServer()
        ? undefined
        : localPanelQuota(readLocalItems());
      if (isAtPanelLimit(quota, localCount)) {
        const error = new Error(PANEL_LIMIT_MESSAGE);
        error.name = "PanelLimitError";
        throw error;
      }
    }

    upsertLocalItem(panel);

    if (!canUseServer()) return;

    const res = await fetch("/api/panels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ panel: panelForApi(panel) }),
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
      "title" | "named" | "address" | "safety" | "phases" | "powerKw" | "hasGround"
    >
  >,
): Promise<void> {
  return enqueuePanelOp(id, async () => {
    const items = readLocalItems().map((item) =>
      item.kind === "panel" && item.id === id ? { ...item, ...patch } : item,
    );
    writeLocalItems(items);

    if (!canUseServer()) return;

    const res = await fetch(`/api/panels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      if (res.status === 503) return;
      // Create may have failed earlier — try full upsert from local copy
      if (res.status === 404) {
        const local = items.find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.id === id,
        );
        if (local) {
          const createRes = await fetch("/api/panels", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify({ panel: panelForApi({ ...local, ...patch }) }),
          });
          if (createRes.ok || createRes.status === 503) return;
          throw new Error(await parseError(createRes));
        }
      }
      throw new Error(await parseError(res));
    }
  });
}

export async function persistDeletePanel(id: string): Promise<void> {
  return enqueuePanelOp(id, async () => {
    writeLocalItems(readLocalItems().filter((item) => item.id !== id));

    if (!canUseServer()) return;

    const res = await fetch(`/api/panels/${encodeURIComponent(id)}`, {
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
    body: JSON.stringify({ query, city }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
  return Array.isArray(data.suggestions) ? data.suggestions : [];
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
