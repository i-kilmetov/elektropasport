const PENDING_PANEL_SHARE_KEY = "ep_pending_panel_share";

export function readPendingPanelShare(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = sessionStorage.getItem(PENDING_PANEL_SHARE_KEY)?.trim();
    return token || null;
  } catch {
    return null;
  }
}

export function writePendingPanelShare(token: string): void {
  try {
    sessionStorage.setItem(PENDING_PANEL_SHARE_KEY, token);
  } catch {
    // private mode
  }
}

export function clearPendingPanelShare(): void {
  try {
    sessionStorage.removeItem(PENDING_PANEL_SHARE_KEY);
  } catch {
    // ignore
  }
}
