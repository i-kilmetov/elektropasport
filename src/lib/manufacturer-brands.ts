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

export type ManufacturerPalette = {
  /** DIN housing fill */
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
      body: "#F4F4F5",
      accent: "#FF000F",
      border: "#D4D4D8",
      text: "#18181B",
    },
  },
  {
    key: "schneider",
    label: "Schneider Electric",
    aliases: ["schneider", "schneider electric", "se"],
    palette: {
      body: "#F7FBF7",
      accent: "#3DCD58",
      border: "#CDE8D4",
      text: "#14532D",
    },
  },
  {
    key: "systeme",
    label: "Systeme Electric",
    aliases: ["systeme", "systeme electric", "systeme electric"],
    palette: {
      body: "#F7FBF7",
      accent: "#3DCD58",
      border: "#CDE8D4",
      text: "#14532D",
    },
  },
  {
    key: "legrand",
    label: "Legrand",
    aliases: ["legrand"],
    palette: {
      body: "#FAFAFA",
      accent: "#C8102E",
      border: "#E4E4E7",
      text: "#18181B",
    },
  },
  {
    key: "hager",
    label: "Hager",
    aliases: ["hager"],
    palette: {
      body: "#FAFAF9",
      accent: "#E30613",
      border: "#E4E4E7",
      text: "#18181B",
    },
  },
  {
    key: "chint",
    label: "Chint",
    aliases: ["chint", "чинт"],
    palette: {
      body: "#F5FBFE",
      accent: "#00A0E3",
      border: "#BFE6F7",
      text: "#0C4A6E",
    },
  },
  {
    key: "iek",
    label: "IEK",
    aliases: ["iek", "иэк"],
    palette: {
      body: "#FFF8F8",
      accent: "#E30613",
      border: "#FECACA",
      text: "#7F1D1D",
    },
  },
  {
    key: "ekf",
    label: "EKF",
    aliases: ["ekf", "экф"],
    palette: {
      body: "#FFFAF5",
      accent: "#F36F21",
      border: "#FED7AA",
      text: "#9A3412",
    },
  },
  {
    key: "dekraft",
    label: "DEKraft",
    aliases: ["dekraft", "декрафт"],
    palette: {
      body: "#F5F8FC",
      accent: "#1B4F9C",
      border: "#BFDBFE",
      text: "#1E3A8A",
    },
  },
  {
    key: "keaz",
    label: "KEAZ",
    aliases: ["keaz", "кэаз"],
    palette: {
      body: "#F5F8FF",
      accent: "#0033A0",
      border: "#BFDBFE",
      text: "#1E3A8A",
    },
  },
  {
    key: "tdm",
    label: "TDM Electric",
    aliases: ["tdm", "tdm electric", "тдм"],
    palette: {
      body: "#FFF7ED",
      accent: "#EA580C",
      border: "#FED7AA",
      text: "#9A3412",
    },
  },
  {
    key: "zubr",
    label: "ZUBR",
    aliases: ["zubr", "зубр"],
    palette: {
      body: "#FFFBEB",
      accent: "#D97706",
      border: "#FDE68A",
      text: "#92400E",
    },
  },
  {
    key: "meander",
    label: "Меандр",
    aliases: ["meander", "меандр"],
    palette: {
      body: "#F0FDFA",
      accent: "#0F766E",
      border: "#99F6E4",
      text: "#134E4A",
    },
  },
  {
    key: "novatek",
    label: "Новатек-Электро",
    aliases: ["novatek", "новатек", "новатек-электро", "новатэк-электро"],
    palette: {
      body: "#EFF6FF",
      accent: "#1D4ED8",
      border: "#BFDBFE",
      text: "#1E3A8A",
    },
  },
  {
    key: "digitop",
    label: "Digitop",
    aliases: ["digitop", "дигитоп"],
    palette: {
      body: "#F5F3FF",
      accent: "#7C3AED",
      border: "#DDD6FE",
      text: "#5B21B6",
    },
  },
  {
    key: "navigator",
    label: "Navigator",
    aliases: ["navigator", "навигатор"],
    palette: {
      body: "#F8FAFC",
      accent: "#0F172A",
      border: "#CBD5E1",
      text: "#0F172A",
    },
  },
  {
    key: "kontaktor",
    label: "Контактор",
    aliases: ["kontaktor", "контактор"],
    palette: {
      body: "#FFF1F2",
      accent: "#BE123C",
      border: "#FECDD3",
      text: "#9F1239",
    },
  },
];

const BRAND_BY_KEY = new Map(
  MANUFACTURER_BRANDS.map((brand) => [brand.key, brand]),
);

const DEFAULT_PALETTE: ManufacturerPalette = {
  body: "#FFFFFF",
  accent: "#71717A",
  border: "#D4D4D8",
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
