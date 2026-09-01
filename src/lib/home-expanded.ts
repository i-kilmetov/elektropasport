const COLLAPSED_KEY = "elektropasport:home-collapsed-panels";
const LEGACY_EXPANDED_KEY = "elektropasport:home-expanded-panel";
const EXPAND_FOR_APPLIANCES_KEY = "elektropasport:home-expand-appliances";

export function markHomeExpandPanelForAppliances(panelId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EXPAND_FOR_APPLIANCES_KEY, panelId);
  } catch {
    // private mode
  }
}

export function consumeHomeExpandPanelForAppliances(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const panelId = sessionStorage.getItem(EXPAND_FOR_APPLIANCES_KEY);
    sessionStorage.removeItem(EXPAND_FOR_APPLIANCES_KEY);
    return panelId;
  } catch {
    return null;
  }
}

export function readHomeCollapsedPanelIds(
  allPanelIds: string[] = [],
): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return new Set(
          parsed.filter((id): id is string => typeof id === "string"),
        );
      }
    }
  } catch {
    // ignore
  }

  try {
    const legacyExpanded = localStorage.getItem(LEGACY_EXPANDED_KEY);
    if (legacyExpanded && allPanelIds.includes(legacyExpanded)) {
      const collapsed = allPanelIds.filter((id) => id !== legacyExpanded);
      writeHomeCollapsedPanelIds(collapsed);
      localStorage.removeItem(LEGACY_EXPANDED_KEY);
      return new Set(collapsed);
    }
    if (legacyExpanded) {
      localStorage.removeItem(LEGACY_EXPANDED_KEY);
    }
  } catch {
    // ignore
  }

  return new Set();
}

export function writeHomeCollapsedPanelIds(ids: Iterable<string>): void {
  try {
    const list = [...ids];
    if (list.length) {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(list));
    } else {
      localStorage.removeItem(COLLAPSED_KEY);
    }
  } catch {
    // private mode
  }
}

/** @deprecated Use readHomeCollapsedPanelIds */
export function readHomeExpandedPanelId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LEGACY_EXPANDED_KEY);
  } catch {
    return null;
  }
}

/** @deprecated Use writeHomeCollapsedPanelIds */
export function writeHomeExpandedPanelId(_id: string | null): void {
  // no-op — migrated to collapsed set
}
