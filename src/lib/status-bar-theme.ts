import { BRAND_YELLOW } from "@/components/brand-logo";

export const APP_SHELL_BG = "#f7f7f8";
export const APP_DARK_BG = "#111113";

export type StatusBarStyle = "light" | "dark";

function upsertMeta(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

/** Sync browser / PWA / Telegram chrome with the visible screen background. */
export function applyStatusBarTheme(
  color: string,
  style: StatusBarStyle = "light",
): void {
  if (typeof document === "undefined") return;

  upsertMeta("theme-color", color);
  upsertMeta(
    "apple-mobile-web-app-status-bar-style",
    style === "dark" ? "black" : "default",
  );

  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;

  const webApp = window.Telegram?.WebApp as
    | {
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      }
    | undefined;

  webApp?.setHeaderColor?.(color);
  webApp?.setBackgroundColor?.(color);
}

export function applySplashStatusBarTheme(): void {
  applyStatusBarTheme(BRAND_YELLOW, "light");
}

export function applyAppStatusBarTheme(dark = false): void {
  applyStatusBarTheme(dark ? APP_DARK_BG : APP_SHELL_BG, dark ? "dark" : "light");
}
