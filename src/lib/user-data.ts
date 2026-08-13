import type { HomeListItem, InstallRequest, PanelObject } from "@/types";
import {
  authHeaders,
  canUseServerAuth,
} from "@/lib/client-auth";
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
  // Preserve local-only photos when server has the same panel without photo
  const localById = new Map(
    readLocalItems()
      .filter((i): i is PanelObject => i.kind === "panel" && Boolean(i.photoDataUrl))
      .map((i) => [i.id, i.photoDataUrl]),
  );
  const merged = data.items.map((item) => {
    if (item.kind !== "panel") return item;
    const localPhoto = localById.get(item.id);
    if (localPhoto && !item.photoDataUrl) {
      return { ...item, photoDataUrl: localPhoto };
    }
    return item;
  });
  writeLocalItems(merged);
  return merged;
}

export async function persistPanel(panel: PanelObject): Promise<void> {
  return enqueuePanelOp(panel.id, async () => {
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
      throw new Error(await parseError(res));
    }
  });
}

export async function persistPanelPatch(
  id: string,
  patch: Partial<
    Pick<
      PanelObject,
      "title" | "named" | "address" | "safety" | "phases" | "powerKw"
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
