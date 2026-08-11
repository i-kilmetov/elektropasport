import type { Device } from "@/types";
import {
  buildDemoPanelDevices,
  demoLinesCount,
  demoSafetyScore,
} from "@/lib/device-catalog";

/** Demo panel devices after photo analysis — sourced from catalog. */
export const devices: Device[] = buildDemoPanelDevices();

export const analysisSteps = [
  { id: "devices", label: "Распознаём устройства" },
  { id: "markings", label: "Читаем маркировку" },
  { id: "types", label: "Определяем типы" },
  { id: "scheme", label: "Строим схему" },
] as const;

export const safetyScore = demoSafetyScore;
export const linesCount = demoLinesCount;
