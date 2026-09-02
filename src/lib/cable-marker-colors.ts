export type CableMarkerStyle = {
  face: string;
  faceLight: string;
  side: string;
  text: string;
};

/** IEC-style wire marker colors (0–9). */
export const CABLE_MARKER_BY_DIGIT: Record<string, CableMarkerStyle> = {
  "0": {
    face: "#1a1a1c",
    faceLight: "#3f3f46",
    side: "#0f0f11",
    text: "#ffffff",
  },
  "1": {
    face: "#7c4a2d",
    faceLight: "#a66b45",
    side: "#5c3520",
    text: "#ffffff",
  },
  "2": {
    face: "#dc2626",
    faceLight: "#f87171",
    side: "#b91c1c",
    text: "#ffffff",
  },
  "3": {
    face: "#ea580c",
    faceLight: "#fb923c",
    side: "#c2410c",
    text: "#ffffff",
  },
  "4": {
    face: "#facc15",
    faceLight: "#fde047",
    side: "#ca8a04",
    text: "#111113",
  },
  "5": {
    face: "#16a34a",
    faceLight: "#4ade80",
    side: "#15803d",
    text: "#ffffff",
  },
  "6": {
    face: "#2563eb",
    faceLight: "#60a5fa",
    side: "#1d4ed8",
    text: "#ffffff",
  },
  "7": {
    face: "#7c3aed",
    faceLight: "#a78bfa",
    side: "#6d28d9",
    text: "#ffffff",
  },
  "8": {
    face: "#9ca3af",
    faceLight: "#d1d5db",
    side: "#6b7280",
    text: "#111113",
  },
  "9": {
    face: "#f4f4f5",
    faceLight: "#ffffff",
    side: "#d4d4d8",
    text: "#111113",
  },
};

export function cableMarkerStyleForDigit(digit: string): CableMarkerStyle {
  return CABLE_MARKER_BY_DIGIT[digit] ?? CABLE_MARKER_BY_DIGIT["0"];
}
