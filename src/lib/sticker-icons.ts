import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  Baby,
  Bath,
  BatteryCharging,
  BedDouble,
  Bell,
  Briefcase,
  Camera,
  Car,
  CookingPot,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  House,
  Lamp,
  Lightbulb,
  Monitor,
  Plug,
  Power,
  Refrigerator,
  Shield,
  Snowflake,
  Sofa,
  Sun,
  Trees,
  Tv,
  UtensilsCrossed,
  Warehouse,
  WashingMachine,
  Wifi,
  Wind,
  Zap,
} from "lucide-react";
import type { Device, DeviceType } from "@/types";

export type StickerIconId =
  | "light"
  | "lamp"
  | "socket"
  | "kitchen"
  | "cook"
  | "fridge"
  | "washer"
  | "bath"
  | "boiler"
  | "heater"
  | "ac"
  | "fan"
  | "snow"
  | "sun"
  | "tv"
  | "computer"
  | "wifi"
  | "door"
  | "home"
  | "bed"
  | "sofa"
  | "baby"
  | "office"
  | "garage"
  | "garden"
  | "pump"
  | "car"
  | "ev"
  | "camera"
  | "alarm"
  | "main"
  | "protect"
  | "power"
  | "vacuum";

export const STICKER_ICONS: Array<{
  id: StickerIconId;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "light", label: "Свет", Icon: Lightbulb },
  { id: "lamp", label: "Лампа", Icon: Lamp },
  { id: "socket", label: "Розетки", Icon: Plug },
  { id: "kitchen", label: "Кухня", Icon: UtensilsCrossed },
  { id: "cook", label: "Плита", Icon: CookingPot },
  { id: "fridge", label: "Холодильник", Icon: Refrigerator },
  { id: "washer", label: "Стиралка", Icon: WashingMachine },
  { id: "bath", label: "Ванная", Icon: Bath },
  { id: "boiler", label: "Бойлер", Icon: Flame },
  { id: "heater", label: "Отопление", Icon: Wind },
  { id: "ac", label: "Кондиционер", Icon: AirVent },
  { id: "fan", label: "Вентиляция", Icon: Fan },
  { id: "snow", label: "Холод", Icon: Snowflake },
  { id: "sun", label: "Тёплый пол", Icon: Sun },
  { id: "tv", label: "ТВ", Icon: Tv },
  { id: "computer", label: "Компьютер", Icon: Monitor },
  { id: "wifi", label: "Роутер", Icon: Wifi },
  { id: "door", label: "Дверь", Icon: DoorOpen },
  { id: "home", label: "Дом", Icon: House },
  { id: "bed", label: "Спальня", Icon: BedDouble },
  { id: "sofa", label: "Гостиная", Icon: Sofa },
  { id: "baby", label: "Детская", Icon: Baby },
  { id: "office", label: "Кабинет", Icon: Briefcase },
  { id: "garage", label: "Гараж", Icon: Warehouse },
  { id: "garden", label: "Улица", Icon: Trees },
  { id: "pump", label: "Насос", Icon: Droplets },
  { id: "car", label: "Авто", Icon: Car },
  { id: "ev", label: "Зарядка", Icon: BatteryCharging },
  { id: "camera", label: "Камера", Icon: Camera },
  { id: "alarm", label: "Сигнализация", Icon: Bell },
  { id: "main", label: "Ввод", Icon: Zap },
  { id: "protect", label: "Защита", Icon: Shield },
  { id: "power", label: "Питание", Icon: Power },
  { id: "vacuum", label: "Пылесос", Icon: Wind },
];

const ICON_BY_ID = new Map(STICKER_ICONS.map((item) => [item.id, item]));

export function getStickerIcon(id?: string) {
  if (!id) return undefined;
  return ICON_BY_ID.get(id as StickerIconId);
}

const TYPE_DEFAULT: Record<DeviceType, StickerIconId> = {
  main_breaker: "main",
  rcd: "protect",
  diff_breaker: "protect",
  voltage_relay: "power",
  breaker: "socket",
  spd: "protect",
  afdd: "boiler",
  pe_bus: "protect",
  n_bus: "power",
};

const LABEL_HINTS: Array<{ match: RegExp; id: StickerIconId }> = [
  { match: /свет|люстр|бра|подсвет/i, id: "light" },
  { match: /розет/i, id: "socket" },
  { match: /кухн|посуд/i, id: "kitchen" },
  { match: /плит|вароч|духов/i, id: "cook" },
  { match: /холод/i, id: "fridge" },
  { match: /стирал|постир/i, id: "washer" },
  { match: /ванн|душ|сануз|туалет/i, id: "bath" },
  { match: /бойлер|водонагр/i, id: "boiler" },
  { match: /тепл.*пол|отопл|конвектор/i, id: "sun" },
  { match: /кондиц|сплит/i, id: "ac" },
  { match: /вытяж|вентил/i, id: "fan" },
  { match: /телевиз|\bтв\b/i, id: "tv" },
  { match: /комп|кабинет|office/i, id: "computer" },
  { match: /роутер|wifi|wi-fi/i, id: "wifi" },
  { match: /спальн/i, id: "bed" },
  { match: /гостин|зал/i, id: "sofa" },
  { match: /детск/i, id: "baby" },
  { match: /гараж/i, id: "garage" },
  { match: /улиц|сад|участок/i, id: "garden" },
  { match: /насос|скважин/i, id: "pump" },
  { match: /заряд|электромоб/i, id: "ev" },
  { match: /ввод|питание/i, id: "main" },
];

export function suggestedStickerIcon(device: Device): StickerIconId {
  const label = device.circuitLabel ?? device.name ?? "";
  const hinted = LABEL_HINTS.find((item) => item.match.test(label));
  if (hinted) return hinted.id;
  return TYPE_DEFAULT[device.type] ?? "socket";
}

export function stickerCaption(device: Device): string {
  const label = device.circuitLabel?.trim();
  if (label) return label;
  switch (device.type) {
    case "main_breaker":
      return "Ввод";
    case "rcd":
      return "УЗО";
    case "diff_breaker":
      return "Диф";
    case "voltage_relay":
      return "Реле";
    case "spd":
      return "УЗИП";
    case "afdd":
      return "УЗДП";
    default:
      return device.rating || "Линия";
  }
}
