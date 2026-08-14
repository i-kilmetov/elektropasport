import type { Device } from "@/types";
import { deviceModules } from "@/lib/panel-rails";

/** IEC DIN module pitch. */
export const STICKER_MODULE_MM = 18;
/**
 * Height of the designation strip on typical panel covers —
 * enough for an icon and a caption, without covering levers or terminals.
 */
export const STICKER_HEIGHT_MM = 15;
/** A4 landscape, millimetres. */
export const A4_LANDSCAPE_MM = { width: 297, height: 210 } as const;
/** Safe printer inset on each side. */
export const PRINT_MARGIN_MM = 10;
/** Gap between cut strips on the sheet. */
export const STRIP_GAP_MM = 8;
export const STRIP_CAPTION_MM = 5;

export function stickerDeviceModules(device: Device): number {
  return Math.min(4, Math.max(1, deviceModules(device)));
}

export function printableAreaMm(): { width: number; height: number } {
  return {
    width: A4_LANDSCAPE_MM.width - PRINT_MARGIN_MM * 2,
    height: A4_LANDSCAPE_MM.height - PRINT_MARGIN_MM * 2,
  };
}

export function maxModulesPerStrip(): number {
  return Math.max(1, Math.floor(printableAreaMm().width / STICKER_MODULE_MM));
}

export type StickerStrip = {
  railIndex: number;
  partIndex: number;
  partCount: number;
  devices: Device[];
  modules: number;
};

/**
 * Split a DIN-rail of devices into strips that fit A4 landscape at 1:1.
 * Never splits a multi-module device across two strips.
 */
export function splitRailIntoStrips(
  devices: Device[],
  railIndex: number,
): StickerStrip[] {
  const maxModules = maxModulesPerStrip();
  const rows: Device[][] = [];
  let current: Device[] = [];
  let used = 0;

  for (const device of devices) {
    const modules = stickerDeviceModules(device);
    if (current.length > 0 && used + modules > maxModules) {
      rows.push(current);
      current = [device];
      used = modules;
    } else {
      current.push(device);
      used += modules;
    }
  }
  if (current.length > 0) rows.push(current);

  return rows.map((row, partIndex) => ({
    railIndex,
    partIndex,
    partCount: rows.length,
    devices: row,
    modules: row.reduce((sum, device) => sum + stickerDeviceModules(device), 0),
  }));
}

export function buildStickerStrips(rails: Device[][]): StickerStrip[] {
  return rails.flatMap((rail, railIndex) => {
    if (rail.length === 0) return [];
    return splitRailIntoStrips(rail, railIndex);
  });
}

export function stripWidthMm(modules: number): number {
  return modules * STICKER_MODULE_MM;
}

export function stripsPerPrintPage(): number {
  const rowHeight = STICKER_HEIGHT_MM + STRIP_CAPTION_MM + STRIP_GAP_MM;
  return Math.max(1, Math.floor(printableAreaMm().height / rowHeight));
}

export function paginateStrips(strips: StickerStrip[]): StickerStrip[][] {
  const perPage = stripsPerPrintPage();
  const pages: StickerStrip[][] = [];
  for (let i = 0; i < strips.length; i += perPage) {
    pages.push(strips.slice(i, i + perPage));
  }
  return pages.length > 0 ? pages : [[]];
}
