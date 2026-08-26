import type { HomeListItem, InstallRequest, PanelObject } from "@/types";
import { formatPanelDeviceCount } from "@/lib/panel-rails";

/** Stable sort key: persisted createdAt, panel id timestamp, or zero. */
export function panelSortTime(panel: PanelObject): number {
  if (panel.createdAt) {
    const parsed = Date.parse(panel.createdAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  const fromId = /^panel-(\d+)$/.exec(panel.id);
  if (fromId?.[1]) return Number(fromId[1]);
  return 0;
}

function requestSortTime(request: InstallRequest): number {
  const parsed = Date.parse(request.createdAt);
  if (Number.isFinite(parsed)) return parsed;
  const ru = parseRuDateLabel(request.createdAt);
  return ru ?? 0;
}

function parseRuDateLabel(label: string): number | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(label.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const parsed = Date.parse(`${yyyy}-${mm}-${dd}T12:00:00`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortHomeItemsByRecency(items: HomeListItem[]): HomeListItem[] {
  return [...items].sort((a, b) => {
    const ta =
      a.kind === "panel"
        ? panelSortTime(a)
        : a.kind === "install_request"
          ? requestSortTime(a)
          : 0;
    const tb =
      b.kind === "panel"
        ? panelSortTime(b)
        : b.kind === "install_request"
          ? requestSortTime(b)
          : 0;
    if (tb !== ta) return tb - ta;
    return a.id.localeCompare(b.id);
  });
}

export function formatPanelActivityLabel(lastCheck: string): string {
  const trimmed = lastCheck.trim();
  if (!trimmed) return "—";
  if (trimmed === "сегодня") return "сегодня";
  const today = new Date().toLocaleDateString("ru-RU");
  if (trimmed === today) return "сегодня";
  return trimmed;
}

export function formatPanelAddedLabel(panel: PanelObject): string {
  if (panel.createdAt) {
    const parsed = Date.parse(panel.createdAt);
    if (Number.isFinite(parsed)) {
      const label = new Date(parsed).toLocaleDateString("ru-RU");
      const today = new Date().toLocaleDateString("ru-RU");
      return label === today ? "сегодня" : label;
    }
  }
  const fromId = /^panel-(\d+)$/.exec(panel.id);
  if (fromId?.[1]) {
    const parsed = Number(fromId[1]);
    const label = new Date(parsed).toLocaleDateString("ru-RU");
    const today = new Date().toLocaleDateString("ru-RU");
    return label === today ? "сегодня" : label;
  }
  return formatPanelActivityLabel(panel.lastCheck);
}

export function formatPanelListMeta(panel: PanelObject): string {
  const added = `добавлен ${formatPanelAddedLabel(panel)}`;
  if (panel.noPanelSetupId) {
    const n = panel.appliances?.length ?? 0;
    if (n > 0) {
      return `${n} шт. техники · ${added}`;
    }
    return `без щитка · ${added}`;
  }
  return `${formatPanelDeviceCount(panel)} · ${added}`;
}
