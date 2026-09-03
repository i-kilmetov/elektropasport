import type { HomeListItem, InstallRequest } from "@/types";

export function isWiringCheckRequest(request: InstallRequest): boolean {
  const haystack = `${request.setupTitle ?? ""} ${request.subtitle ?? ""}`;
  return haystack.includes("Проверка расключения");
}

/** Active (non-deleted) wiring-check request linked to a panel, newest first. */
export function findWiringCheckRequestForPanel(
  items: HomeListItem[],
  panelId: string | null | undefined,
): InstallRequest | null {
  if (!panelId) return null;
  const matches = items.filter(
    (item): item is InstallRequest =>
      item.kind === "install_request" &&
      item.panelId === panelId &&
      item.status !== "deleted" &&
      isWiringCheckRequest(item),
  );
  if (matches.length === 0) return null;
  const preferred =
    matches.find(
      (item) =>
        item.status === "new" ||
        item.status === "payment" ||
        item.status === "in_progress",
    ) ??
    matches[0];
  return preferred ?? null;
}
