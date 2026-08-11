import type { HomeListItem, InstallRequest, PanelObject } from "@/types";

const LOCAL_KEY = "elektropasport:home-items";

function getInitData(): string | null {
  if (typeof window === "undefined") return null;
  const webApp = window.Telegram?.WebApp as
    | { initData?: string }
    | undefined;
  const initData = webApp?.initData?.trim();
  return initData || null;
}

function authHeaders(): HeadersInit {
  const initData = getInitData();
  if (!initData) return {};
  return { Authorization: `tma ${initData}` };
}

function canUseServer(): boolean {
  return Boolean(getInitData());
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

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Ошибка ${res.status}`;
  } catch {
    return `Ошибка ${res.status}`;
  }
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
    // Fallback so local/dev without DB still works
    if (res.status === 503) return readLocalItems();
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { items: HomeListItem[] };
  writeLocalItems(data.items);
  return data.items;
}

export async function persistPanel(panel: PanelObject): Promise<void> {
  if (!canUseServer()) {
    const items = readLocalItems();
    writeLocalItems([panel, ...items.filter((i) => i.id !== panel.id)]);
    return;
  }

  const res = await fetch("/api/panels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ panel }),
  });

  if (!res.ok) {
    if (res.status === 503) {
      const items = readLocalItems();
      writeLocalItems([panel, ...items.filter((i) => i.id !== panel.id)]);
      return;
    }
    throw new Error(await parseError(res));
  }

  const items = readLocalItems();
  writeLocalItems([panel, ...items.filter((i) => i.id !== panel.id)]);
}

export async function persistPanelPatch(
  id: string,
  patch: Partial<Pick<PanelObject, "title" | "named" | "address">>,
): Promise<void> {
  if (!canUseServer()) {
    const items = readLocalItems().map((item) =>
      item.kind === "panel" && item.id === id ? { ...item, ...patch } : item,
    );
    writeLocalItems(items);
    return;
  }

  const res = await fetch(`/api/panels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    if (res.status === 503) {
      const items = readLocalItems().map((item) =>
        item.kind === "panel" && item.id === id ? { ...item, ...patch } : item,
      );
      writeLocalItems(items);
      return;
    }
    throw new Error(await parseError(res));
  }

  const items = readLocalItems().map((item) =>
    item.kind === "panel" && item.id === id ? { ...item, ...patch } : item,
  );
  writeLocalItems(items);
}

export async function persistDeletePanel(id: string): Promise<void> {
  if (!canUseServer()) {
    writeLocalItems(readLocalItems().filter((item) => item.id !== id));
    return;
  }

  const res = await fetch(`/api/panels/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    if (res.status === 503) {
      writeLocalItems(readLocalItems().filter((item) => item.id !== id));
      return;
    }
    throw new Error(await parseError(res));
  }

  writeLocalItems(readLocalItems().filter((item) => item.id !== id));
}

export async function persistInstallRequest(
  request: InstallRequest,
): Promise<void> {
  if (!canUseServer()) {
    const items = readLocalItems();
    writeLocalItems([request, ...items.filter((i) => i.id !== request.id)]);
    return;
  }

  const res = await fetch("/api/install-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ request }),
  });

  if (!res.ok) {
    if (res.status === 503) {
      const items = readLocalItems();
      writeLocalItems([request, ...items.filter((i) => i.id !== request.id)]);
      return;
    }
    throw new Error(await parseError(res));
  }

  const items = readLocalItems();
  writeLocalItems([request, ...items.filter((i) => i.id !== request.id)]);
}
