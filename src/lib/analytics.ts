declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

/** Public Yandex Metrika counter id (NEXT_PUBLIC_ is intentional — visible in page HTML). */
export function yandexMetrikaId(): number | null {
  const raw = process.env.NEXT_PUBLIC_YM_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function trackMetrikaPage(path: string, title?: string): void {
  const id = yandexMetrikaId();
  if (!id || typeof window === "undefined" || !window.ym) return;
  window.ym(id, "hit", path, title ? { title } : undefined);
}

export function trackMetrikaGoal(goal: string): void {
  const id = yandexMetrikaId();
  if (!id || typeof window === "undefined" || !window.ym) return;
  window.ym(id, "reachGoal", goal);
}
