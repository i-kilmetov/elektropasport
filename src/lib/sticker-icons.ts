import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AirVent,
  ArrowDownToLine,
  Baby,
  Bath,
  BatteryCharging,
  BedDouble,
  Bell,
  Blinds,
  BrickWall,
  Briefcase,
  Building2,
  Cable,
  Camera,
  Car,
  Cctv,
  ChefHat,
  CircuitBoard,
  CirclePower,
  Coffee,
  Columns3,
  CookingPot,
  Cpu,
  DoorClosed,
  DoorOpen,
  Droplets,
  Dumbbell,
  Earth,
  Fan,
  Fence,
  FileDigit,
  Fingerprint,
  Flame,
  Flower2,
  Footprints,
  Fuel,
  Gamepad2,
  Gauge,
  Hammer,
  Heater,
  Hospital,
  Hotel,
  House,
  HousePlug,
  InspectionPanel,
  KeyRound,
  Lamp,
  LampCeiling,
  LampDesk,
  Lightbulb,
  LightbulbOff,
  Lock,
  Microwave,
  Monitor,
  Package,
  ParkingCircle,
  PawPrint,
  Plug,
  PlugZap,
  Power,
  Refrigerator,
  Router,
  SatelliteDish,
  School,
  Server,
  Settings2,
  Shield,
  Shirt,
  ShowerHead,
  SmartphoneCharging,
  Siren,
  SlidersHorizontal,
  Snowflake,
  Sofa,
  SolarPanel,
  Speaker,
  SprayCan,
  Store,
  Sun,
  SunDim,
  Tent,
  Theater,
  Thermometer,
  Timer,
  ToggleLeft,
  Toilet,
  Trees,
  Tv,
  Umbrella,
  Unplug,
  Usb,
  UtilityPole,
  UtensilsCrossed,
  Warehouse,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  Wrench,
  Zap,
  ZapOff,
} from "lucide-react";
import type { Device, DeviceType } from "@/types";

export type StickerIconCategory =
  | "rooms"
  | "functions"
  | "appliances"
  | "panel";

export type StickerIconId = string;

export type StickerIconItem = {
  id: StickerIconId;
  label: string;
  Icon: LucideIcon;
  category: StickerIconCategory;
};

export const STICKER_ICON_CATEGORIES: Array<{
  id: StickerIconCategory;
  label: string;
}> = [
  { id: "rooms", label: "Комнаты" },
  { id: "panel", label: "В щитке" },
  { id: "appliances", label: "Техника" },
  { id: "functions", label: "Функции" },
];

export const STICKER_ICONS: StickerIconItem[] = [
  { id: "home", label: "Дом", Icon: House, category: "rooms" },
  { id: "sofa", label: "Гостиная", Icon: Sofa, category: "rooms" },
  { id: "bed", label: "Спальня", Icon: BedDouble, category: "rooms" },
  { id: "baby", label: "Детская", Icon: Baby, category: "rooms" },
  { id: "kitchen", label: "Кухня", Icon: UtensilsCrossed, category: "rooms" },
  { id: "bath", label: "Ванная", Icon: Bath, category: "rooms" },
  { id: "shower", label: "Душ", Icon: ShowerHead, category: "rooms" },
  { id: "office", label: "Кабинет", Icon: Briefcase, category: "rooms" },
  { id: "hall", label: "Коридор", Icon: DoorClosed, category: "rooms" },
  { id: "stairs", label: "Лестница", Icon: Footprints, category: "rooms" },
  { id: "balcony", label: "Балкон", Icon: Flower2, category: "rooms" },
  { id: "storage", label: "Кладовая", Icon: Package, category: "rooms" },
  { id: "laundry", label: "Постирочная", Icon: Shirt, category: "rooms" },
  { id: "garage", label: "Гараж", Icon: Warehouse, category: "rooms" },
  { id: "garden", label: "Улица", Icon: Trees, category: "rooms" },
  { id: "fence", label: "Двор", Icon: Fence, category: "rooms" },
  { id: "dacha", label: "Дача", Icon: Tent, category: "rooms" },
  { id: "entrance", label: "Подъезд", Icon: Building2, category: "rooms" },
  { id: "gym", label: "Спорт", Icon: Dumbbell, category: "rooms" },
  { id: "pets", label: "Животные", Icon: PawPrint, category: "rooms" },
  { id: "workshop", label: "Мастерская", Icon: Hammer, category: "rooms" },
  { id: "toilet", label: "Туалет", Icon: Toilet, category: "rooms" },
  { id: "sauna", label: "Сауна", Icon: Thermometer, category: "rooms" },
  { id: "pool", label: "Бассейн", Icon: Waves, category: "rooms" },
  { id: "terrace", label: "Терраса", Icon: Umbrella, category: "rooms" },
  { id: "basement", label: "Подвал", Icon: BrickWall, category: "rooms" },
  { id: "parking", label: "Парковка", Icon: ParkingCircle, category: "rooms" },
  { id: "boiler-room", label: "Котельная", Icon: Fuel, category: "rooms" },
  { id: "shop", label: "Магазин", Icon: Store, category: "rooms" },
  { id: "school", label: "Школа", Icon: School, category: "rooms" },
  { id: "hotel", label: "Гостиница", Icon: Hotel, category: "rooms" },
  { id: "clinic", label: "Медпункт", Icon: Hospital, category: "rooms" },
  { id: "theater", label: "Кино", Icon: Theater, category: "rooms" },
  { id: "kitchen-room", label: "Столовая", Icon: ChefHat, category: "rooms" },

  { id: "light", label: "Свет", Icon: Lightbulb, category: "functions" },
  { id: "lamp", label: "Лампа", Icon: Lamp, category: "functions" },
  { id: "socket", label: "Розетки", Icon: Plug, category: "functions" },
  { id: "power", label: "Питание", Icon: Power, category: "functions" },
  { id: "fan", label: "Вентиляция", Icon: Fan, category: "functions" },
  { id: "ac", label: "Кондиционер", Icon: AirVent, category: "functions" },
  { id: "sun", label: "Тёплый пол", Icon: Sun, category: "functions" },
  { id: "heater-fn", label: "Отопление", Icon: Heater, category: "functions" },
  { id: "snow", label: "Холод", Icon: Snowflake, category: "functions" },
  { id: "wifi", label: "Роутер", Icon: Wifi, category: "functions" },
  { id: "router", label: "Сеть", Icon: Router, category: "functions" },
  { id: "door", label: "Дверь", Icon: DoorOpen, category: "functions" },
  { id: "camera", label: "Камера", Icon: Camera, category: "functions" },
  { id: "alarm", label: "Сигнализация", Icon: Bell, category: "functions" },
  { id: "pump", label: "Насос", Icon: Droplets, category: "functions" },
  { id: "speaker", label: "Аудио", Icon: Speaker, category: "functions" },
  { id: "vacuum", label: "Пылесос", Icon: Wind, category: "functions" },
  { id: "ceiling", label: "Потолок", Icon: LampCeiling, category: "functions" },
  { id: "sconce", label: "Бра", Icon: LampDesk, category: "functions" },
  { id: "dimmer", label: "Диммер", Icon: SunDim, category: "functions" },
  { id: "night", label: "Дежурный", Icon: LightbulbOff, category: "functions" },
  { id: "blinds", label: "Жалюзи", Icon: Blinds, category: "functions" },
  { id: "usb", label: "USB", Icon: Usb, category: "functions" },
  { id: "lock", label: "Замок", Icon: Lock, category: "functions" },
  { id: "keys", label: "Домофон", Icon: KeyRound, category: "functions" },
  { id: "cctv", label: "Видео", Icon: Cctv, category: "functions" },
  { id: "siren", label: "Сирена", Icon: Siren, category: "functions" },
  { id: "solar", label: "Солнце", Icon: SolarPanel, category: "functions" },
  { id: "house-in", label: "Ввод дома", Icon: HousePlug, category: "functions" },
  { id: "off", label: "Отключение", Icon: Unplug, category: "functions" },

  { id: "fridge", label: "Холодильник", Icon: Refrigerator, category: "appliances" },
  { id: "washer", label: "Стиралка", Icon: WashingMachine, category: "appliances" },
  { id: "cook", label: "Плита", Icon: CookingPot, category: "appliances" },
  { id: "microwave", label: "СВЧ", Icon: Microwave, category: "appliances" },
  { id: "coffee", label: "Кофемашина", Icon: Coffee, category: "appliances" },
  { id: "boiler", label: "Бойлер", Icon: Flame, category: "appliances" },
  { id: "tv", label: "ТВ", Icon: Tv, category: "appliances" },
  { id: "computer", label: "Компьютер", Icon: Monitor, category: "appliances" },
  { id: "game", label: "Игры", Icon: Gamepad2, category: "appliances" },
  { id: "car", label: "Авто", Icon: Car, category: "appliances" },
  { id: "ev", label: "Электромобиль", Icon: BatteryCharging, category: "appliances" },
  { id: "heater", label: "Обогреватель", Icon: Heater, category: "appliances" },
  { id: "wrench", label: "Инструмент", Icon: Wrench, category: "appliances" },
  { id: "dishwasher", label: "Посудомойка", Icon: SprayCan, category: "appliances" },
  { id: "pc", label: "ПК", Icon: Cpu, category: "appliances" },
  { id: "nas", label: "Сервер", Icon: Server, category: "appliances" },
  { id: "antenna", label: "Антенна", Icon: SatelliteDish, category: "appliances" },
  { id: "phone", label: "Телефон", Icon: SmartphoneCharging, category: "appliances" },

  { id: "main", label: "Ввод", Icon: Zap, category: "panel" },
  { id: "breaker", label: "Автомат", Icon: ToggleLeft, category: "panel" },
  { id: "protect", label: "УЗО", Icon: Shield, category: "panel" },
  { id: "diff", label: "Дифавтомат", Icon: PlugZap, category: "panel" },
  { id: "relay", label: "Реле напр.", Icon: Activity, category: "panel" },
  { id: "spd", label: "УЗИП", Icon: ArrowDownToLine, category: "panel" },
  { id: "afdd", label: "УЗДП", Icon: Flame, category: "panel" },
  { id: "timer", label: "Таймер", Icon: Timer, category: "panel" },
  { id: "gauge", label: "Измерение", Icon: Gauge, category: "panel" },
  { id: "cable", label: "Кабель", Icon: Cable, category: "panel" },
  { id: "earth", label: "Земля", Icon: Earth, category: "panel" },
  { id: "board", label: "Щиток", Icon: CircuitBoard, category: "panel" },
  { id: "meter", label: "Счётчик", Icon: FileDigit, category: "panel" },
  { id: "switch", label: "Выключатель", Icon: CirclePower, category: "panel" },
  { id: "busbar", label: "Шины", Icon: Columns3, category: "panel" },
  { id: "terminals", label: "Клеммы", Icon: InspectionPanel, category: "panel" },
  { id: "controller", label: "Контроллер", Icon: Settings2, category: "panel" },
  { id: "dim-mod", label: "Регулятор", Icon: SlidersHorizontal, category: "panel" },
  { id: "access", label: "Доступ", Icon: Fingerprint, category: "panel" },
  { id: "cutoff", label: "Откл.", Icon: ZapOff, category: "panel" },
  { id: "feeder", label: "Фидер", Icon: UtilityPole, category: "panel" },
];

const ICON_BY_ID = new Map(STICKER_ICONS.map((item) => [item.id, item]));

export function getStickerIcon(id?: string) {
  if (!id) return undefined;
  return ICON_BY_ID.get(id);
}

export function iconsInCategory(category: StickerIconCategory) {
  return STICKER_ICONS.filter((item) => item.category === category);
}

const TYPE_DEFAULT: Record<DeviceType, StickerIconId> = {
  main_breaker: "main",
  rcd: "protect",
  diff_breaker: "diff",
  voltage_relay: "relay",
  breaker: "breaker",
  spd: "spd",
  afdd: "afdd",
  pe_bus: "earth",
  n_bus: "cable",
};

const LABEL_HINTS: Array<{ match: RegExp; id: StickerIconId }> = [
  { match: /свет|люстр|бра|подсвет/i, id: "light" },
  { match: /розет/i, id: "socket" },
  { match: /кухн|посуд/i, id: "kitchen" },
  { match: /плит|вароч|духов/i, id: "cook" },
  { match: /холод/i, id: "fridge" },
  { match: /стирал|постир/i, id: "washer" },
  { match: /ванн|сануз/i, id: "bath" },
  { match: /душ/i, id: "shower" },
  { match: /бойлер|водонагр/i, id: "boiler" },
  { match: /тепл.*пол/i, id: "sun" },
  { match: /отопл|конвектор/i, id: "heater-fn" },
  { match: /кондиц|сплит/i, id: "ac" },
  { match: /вытяж|вентил/i, id: "fan" },
  { match: /телевиз|\bтв\b/i, id: "tv" },
  { match: /комп|office/i, id: "computer" },
  { match: /кабинет/i, id: "office" },
  { match: /роутер|wifi|wi-fi/i, id: "wifi" },
  { match: /спальн/i, id: "bed" },
  { match: /гостин|зал/i, id: "sofa" },
  { match: /детск/i, id: "baby" },
  { match: /коридор|прихож/i, id: "hall" },
  { match: /балкон|лоджи/i, id: "balcony" },
  { match: /кладов/i, id: "storage" },
  { match: /гараж/i, id: "garage" },
  { match: /улиц|сад|участок/i, id: "garden" },
  { match: /дач/i, id: "dacha" },
  { match: /насос|скважин/i, id: "pump" },
  { match: /туалет/i, id: "toilet" },
  { match: /саун/i, id: "sauna" },
  { match: /бассейн/i, id: "pool" },
  { match: /подвал/i, id: "basement" },
  { match: /парков/i, id: "parking" },
  { match: /котельн/i, id: "boiler-room" },
  { match: /посудом/i, id: "dishwasher" },
  { match: /домофон/i, id: "keys" },
  { match: /жалюз|роллет/i, id: "blinds" },
  { match: /счётчик|счетчик/i, id: "meter" },
  { match: /заряд|электромоб/i, id: "ev" },
  { match: /ввод/i, id: "main" },
  { match: /узо/i, id: "protect" },
  { match: /диф/i, id: "diff" },
  { match: /узип/i, id: "spd" },
  { match: /реле/i, id: "relay" },
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
