const PENDING_PANEL_SHARE_KEY = "ep_pending_panel_share";

export type PendingPanelShare = {
  token: string;
  includeAppliances: boolean;
};

function parsePending(raw: string | null): PendingPanelShare | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PendingPanelShare).token === "string"
    ) {
      const token = (parsed as PendingPanelShare).token.trim();
      if (!token) return null;
      return {
        token,
        includeAppliances:
          (parsed as PendingPanelShare).includeAppliances !== false,
      };
    }
  } catch {
    // legacy plain token string
  }
  return { token: raw.trim(), includeAppliances: true };
}

export function readPendingPanelShare(): PendingPanelShare | null {
  if (typeof window === "undefined") return null;
  try {
    return parsePending(sessionStorage.getItem(PENDING_PANEL_SHARE_KEY));
  } catch {
    return null;
  }
}

export function writePendingPanelShare(
  token: string,
  includeAppliances = true,
): void {
  try {
    sessionStorage.setItem(
      PENDING_PANEL_SHARE_KEY,
      JSON.stringify({ token, includeAppliances }),
    );
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
