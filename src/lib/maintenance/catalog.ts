import type { DeviceType, HomeApplianceKind } from "@/types";

export type MaintenanceReminderKind = "rcd_test" | "appliance_service";

/** Devices that need a monthly TEST button press (УЗО / дифавтомат). */
export const RCD_TEST_DEVICE_TYPES: readonly DeviceType[] = [
  "rcd",
  "diff_breaker",
] as const;

export const RCD_TEST_INTERVAL_DAYS = 30;

export type ApplianceServicePreset = {
  kind: HomeApplianceKind;
  title: string;
  hint: string;
  defaultIntervalDays: number;
};

/** Appliances that typically need recurring care. */
export const APPLIANCE_SERVICE_PRESETS: readonly ApplianceServicePreset[] = [
  {
    kind: "washer",
    title: "Стиральная машина",
    hint: "Чистка манжеты, фильтра и барабана",
    defaultIntervalDays: 90,
  },
  {
    kind: "dishwasher",
    title: "Посудомоечная машина",
    hint: "Чистка фильтра и отсека для соли/ополаскивателя",
    defaultIntervalDays: 90,
  },
  {
    kind: "dryer",
    title: "Сушильная машина",
    hint: "Очистка фильтра и конденсатора",
    defaultIntervalDays: 60,
  },
  {
    kind: "coffee_maker",
    title: "Кофемашина",
    hint: "Удаление накипи и чистка заварочного блока",
    defaultIntervalDays: 30,
  },
  {
    kind: "ac",
    title: "Кондиционер",
    hint: "Чистка или замена фильтров",
    defaultIntervalDays: 90,
  },
  {
    kind: "boiler",
    title: "Бойлер",
    hint: "Проверка и обслуживание бака / ТЭНа",
    defaultIntervalDays: 180,
  },
  {
    kind: "hood",
    title: "Вытяжка",
    hint: "Чистка жировых фильтров",
    defaultIntervalDays: 90,
  },
  {
    kind: "vacuum",
    title: "Пылесос",
    hint: "Чистка фильтров и контейнера",
    defaultIntervalDays: 30,
  },
  {
    kind: "robot_vacuum",
    title: "Робот-пылесос",
    hint: "Чистка щёток, датчиков и фильтра",
    defaultIntervalDays: 30,
  },
  {
    kind: "humidifier",
    title: "Увлажнитель",
    hint: "Промывка резервуара и фильтров",
    defaultIntervalDays: 30,
  },
  {
    kind: "fridge",
    title: "Холодильник",
    hint: "Чистка решётки/конденсатора и уплотнителей",
    defaultIntervalDays: 180,
  },
  {
    kind: "oven",
    title: "Духовой шкаф",
    hint: "Чистка камеры и вентиляционных отверстий",
    defaultIntervalDays: 90,
  },
  {
    kind: "microwave",
    title: "Микроволновка",
    hint: "Чистка камеры и вентиляции",
    defaultIntervalDays: 90,
  },
] as const;

const APPLIANCE_SERVICE_KIND_SET = new Set(
  APPLIANCE_SERVICE_PRESETS.map((item) => item.kind),
);

export function isRcdTestDeviceType(type: DeviceType): boolean {
  return RCD_TEST_DEVICE_TYPES.includes(type);
}

export function isServiceableApplianceKind(kind: string): boolean {
  return APPLIANCE_SERVICE_KIND_SET.has(kind as HomeApplianceKind);
}

export function applianceServicePreset(
  kind: HomeApplianceKind,
): ApplianceServicePreset | null {
  return APPLIANCE_SERVICE_PRESETS.find((item) => item.kind === kind) ?? null;
}

export const INTERVAL_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 30, label: "Раз в месяц" },
  { days: 60, label: "Раз в 2 месяца" },
  { days: 90, label: "Раз в 3 месяца" },
  { days: 180, label: "Раз в полгода" },
  { days: 365, label: "Раз в год" },
];

/** One reminder per panel for all УЗО / дифавтоматы inside it. */
export function rcdPanelTargetKey(panelId: string): string {
  return `rcd:${panelId}`;
}

export function applianceTargetKey(panelId: string, applianceId: string): string {
  return `appliance:${panelId}:${applianceId}`;
}
