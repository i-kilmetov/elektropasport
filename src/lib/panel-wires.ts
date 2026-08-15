import type { PanelWire, TerminalRef } from "@/types";

export const WIRE_THICKNESS_OPTIONS = [
  0.75, 1, 1.5, 2.5, 4, 6, 10, 16,
] as const;

export const WIRE_COLOR_OPTIONS: Array<{ id: string; label: string; color: string }> = [
  { id: "brown", label: "Коричневый (L)", color: "#92400E" },
  { id: "black", label: "Чёрный (L)", color: "#18181B" },
  { id: "grey", label: "Серый (L)", color: "#71717A" },
  { id: "red", label: "Красный", color: "#DC2626" },
  { id: "blue", label: "Синий (N)", color: "#2563EB" },
  { id: "pe", label: "Жёлто-зелёный (PE)", color: "#CA8A04" },
  { id: "white", label: "Белый", color: "#E4E4E7" },
  { id: "orange", label: "Оранжевый", color: "#EA580C" },
];

export function terminalKey(t: TerminalRef): string {
  return `${t.deviceId}:${t.side}:${t.index}`;
}

export function sameTerminal(a: TerminalRef, b: TerminalRef): boolean {
  return (
    a.deviceId === b.deviceId && a.side === b.side && a.index === b.index
  );
}

export function wireConnectsSamePair(a: PanelWire, from: TerminalRef, to: TerminalRef): boolean {
  return (
    (sameTerminal(a.from, from) && sameTerminal(a.to, to)) ||
    (sameTerminal(a.from, to) && sameTerminal(a.to, from))
  );
}

/** Stroke width on the scheme canvas for a given mm². */
export function wireStrokeWidth(thicknessMm: number): number {
  const t = Math.max(0.5, thicknessMm);
  return Math.min(8, 1.4 + Math.sqrt(t) * 1.15);
}

export function createWireId(): string {
  return `wire-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseTerminalKey(key: string): TerminalRef | null {
  const [deviceIdRaw, side, indexRaw] = key.split(":");
  const deviceId = Number(deviceIdRaw);
  const index = Number(indexRaw);
  if (
    !Number.isFinite(deviceId) ||
    !Number.isFinite(index) ||
    (side !== "top" && side !== "bottom")
  ) {
    return null;
  }
  return { deviceId, side, index };
}
