import type { Device, DeviceType } from "@/types";

/** Near-100% recognition — only then show type, logo and specs on the scheme. */
export const DEVICE_DETAILS_CONFIDENCE = 95;

export type ManufacturerBrandKey =
  | "abb"
  | "schneider"
  | "systeme"
  | "legrand"
  | "hager"
  | "chint"
  | "iek"
  | "ekf"
  | "dekraft"
  | "keaz"
  | "tdm"
  | "zubr"
  | "meander"
  | "novatek"
  | "digitop"
  | "navigator"
  | "kontaktor";

/** Shared DIN housing fill — same for every brand. */
export const DEVICE_BODY_COLOR = "#F4F4F5";
export const DEVICE_BORDER_COLOR = "#D4D4D8";

export type ManufacturerPalette = {
  /** DIN housing fill (always neutral; kept for API compatibility) */
  body: string;
  /** Top stripe + powered lever */
  accent: string;
  border: string;
  text: string;
};

export type ManufacturerBrand = {
  key: ManufacturerBrandKey;
  label: string;
  aliases: string[];
  palette: ManufacturerPalette;
};

/**
 * Compact brand list: global + common Russian DIN / relay makers.
 * Palettes follow typical product housing + accent colors on real modules.
 */
export const MANUFACTURER_BRANDS: ManufacturerBrand[] = [
  {
    key: "abb",
    label: "ABB",
    aliases: ["abb"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#FF000F",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "schneider",
    label: "Schneider Electric",
    aliases: ["schneider", "schneider electric", "se"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#3DCD58",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "systeme",
    label: "Systeme Electric",
    aliases: ["systeme", "systeme electric", "systeme electric"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#3DCD58",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "legrand",
    label: "Legrand",
    aliases: ["legrand"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#C8102E",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "hager",
    label: "Hager",
    aliases: ["hager"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#E30613",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "chint",
    label: "Chint",
    aliases: ["chint", "чинт"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#00A0E3",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "iek",
    label: "IEK",
    aliases: ["iek", "иэк"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#E30613",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "ekf",
    label: "EKF",
    aliases: ["ekf", "экф"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#F36F21",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "dekraft",
    label: "DEKraft",
    aliases: ["dekraft", "декрафт"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#1B4F9C",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "keaz",
    label: "KEAZ",
    aliases: ["keaz", "кэаз"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#0033A0",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "tdm",
    label: "TDM Electric",
    aliases: ["tdm", "tdm electric", "тдм"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#EA580C",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "zubr",
    label: "ZUBR",
    aliases: ["zubr", "зубр"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#D97706",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "meander",
    label: "Меандр",
    aliases: ["meander", "меандр"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#0F766E",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "novatek",
    label: "Новатек-Электро",
    aliases: ["novatek", "новатек", "новатек-электро", "новатэк-электро"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#1D4ED8",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "digitop",
    label: "Digitop",
    aliases: ["digitop", "дигитоп"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#7C3AED",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "navigator",
    label: "Navigator",
    aliases: ["navigator", "навигатор"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#0F172A",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
  {
    key: "kontaktor",
    label: "Контактор",
    aliases: ["kontaktor", "контактор"],
    palette: {
      body: DEVICE_BODY_COLOR,
      accent: "#BE123C",
      border: DEVICE_BORDER_COLOR,
      text: "#18181B",
    },
  },
];

const BRAND_BY_KEY = new Map(
  MANUFACTURER_BRANDS.map((brand) => [brand.key, brand]),
);

const DEFAULT_PALETTE: ManufacturerPalette = {
  body: DEVICE_BODY_COLOR,
  accent: "#71717A",
  border: DEVICE_BORDER_COLOR,
  text: "#18181B",
};

export function resolveBrandKey(
  brandKey?: string,
  brand?: string,
): ManufacturerBrandKey | undefined {
  const raw = `${brandKey ?? ""} ${brand ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return undefined;

  const compact = raw.replace(/[\s._-]+/g, "");

  for (const item of MANUFACTURER_BRANDS) {
    if (item.key === compact || item.key === raw) return item.key;
    for (const alias of item.aliases) {
      const a = alias.toLowerCase();
      if (raw.includes(a) || compact.includes(a.replace(/[\s._-]+/g, ""))) {
        return item.key;
      }
    }
  }
  return undefined;
}

export function getManufacturerBrand(
  brandKey?: string,
  brand?: string,
): ManufacturerBrand | undefined {
  const key = resolveBrandKey(brandKey, brand);
  return key ? BRAND_BY_KEY.get(key) : undefined;
}

export function getManufacturerPalette(
  brandKey?: string,
  brand?: string,
): ManufacturerPalette {
  return getManufacturerBrand(brandKey, brand)?.palette ?? DEFAULT_PALETTE;
}

export function isDeviceDetailsConfident(device: Device): boolean {
  if (device.status === "unknown") return false;
  if (typeof device.confidence !== "number") {
    return device.status === "verified";
  }
  return device.confidence >= DEVICE_DETAILS_CONFIDENCE;
}

export const DEVICE_TYPE_OPTIONS: Array<{
  type: DeviceType;
  label: string;
}> = [
  { type: "main_breaker", label: "Вводной автомат" },
  { type: "breaker", label: "Автомат" },
  { type: "rcd", label: "УЗО" },
  { type: "diff_breaker", label: "Дифавтомат" },
  { type: "voltage_relay", label: "Реле напряжения" },
  { type: "spd", label: "УЗИП" },
  { type: "afdd", label: "УЗДП" },
];
