"use client";

import { useEffect } from "react";
import {
  applyAppStatusBarTheme,
  applyStatusBarTheme,
  type StatusBarStyle,
} from "@/lib/status-bar-theme";

export function useStatusBarTheme(
  active: boolean,
  color: string,
  style: StatusBarStyle = "light",
) {
  useEffect(() => {
    if (!active) return;
    applyStatusBarTheme(color, style);
  }, [active, color, style]);
}

export function useAppStatusBarTheme(active: boolean, dark = false) {
  useEffect(() => {
    if (!active) return;
    applyAppStatusBarTheme(dark);
  }, [active, dark]);
}
