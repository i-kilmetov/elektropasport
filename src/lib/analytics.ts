declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Public Yandex Metrika counter id (NEXT_PUBLIC_ is intentional — visible in page HTML). */
export function yandexMetrikaId(): number | null {
  const raw = process.env.NEXT_PUBLIC_YM_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Public GA4 measurement id, e.g. G-XXXXXXXXXX. */
export function googleAnalyticsId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!raw) return null;
  return /^G-[A-Z0-9]+$/i.test(raw) ? raw.toUpperCase() : null;
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

export function trackGaPage(path: string, title?: string): void {
  const id = googleAnalyticsId();
  if (!id || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", id, {
    page_path: path,
    ...(title ? { page_title: title } : {}),
  });
}

export function trackGaEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}
