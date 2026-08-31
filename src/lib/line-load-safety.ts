import type { Device } from "@/types";
import { parseLineLoads } from "@/lib/panel-identify";

const VOLTAGE_V = 230;
const CONTINUOUS_LOAD_FACTOR = 0.8;

export type LineLoadAlarm = {
  title: string;
  summary: string;
  points: string[];
  unsafeLoads: string[];
  /** Smallest standard breaker rating that fits the assigned loads. */
  recommendedAmps?: number;
};

type LoadProfile = {
  minAmps: number;
  typicalWatts: number;
  why: string;
};

const EXACT_PROFILES: Record<string, LoadProfile> = {
  свет: {
    minAmps: 6,
    typicalWatts: 300,
    why: "Освещение обычно сажают на автомат 6–10 А и кабель 1,5 мм². Для света 10 А — нормально.",
  },
  "освещение витрин": {
    minAmps: 10,
    typicalWatts: 800,
    why: "Витринное освещение может быть мощнее комнатного, но это всё ещё световая линия, не силовая.",
  },
  розетки: {
    minAmps: 16,
    typicalWatts: 2500,
    why: "Розеточную группу в квартире делают на 16 А и кабель 2,5 мм². Чайник, утюг или удлинитель легко дают больше 2 кВт — автомат 10 А эту линию не защитит корректно и будет либо часто выбивать, либо перегревать проводку, если кабель тоже слабый.",
  },
  плита: {
    minAmps: 32,
    typicalWatts: 7000,
    why: "Электроплита — отдельная силовая линия, обычно 25–32 А.",
  },
  "варочная панель": {
    minAmps: 32,
    typicalWatts: 7000,
    why: "Варочная панель почти всегда идёт отдельным кабелем и автоматом 25–32 А, не в общую розеточную группу.",
  },
  духовка: {
    minAmps: 16,
    typicalWatts: 3000,
    why: "Духовка берёт около 2,5–3,5 кВт. Для неё нужна линия не слабее 16 А.",
  },
  "стиральная машина": {
    minAmps: 16,
    typicalWatts: 2200,
    why: "Стиральная машина при нагреве воды даёт 2–2,5 кВт. Её не ставят на автомат 10 А.",
  },
  "посудомоечная машина": {
    minAmps: 16,
    typicalWatts: 2000,
    why: "Посудомойка — типично около 2 кВт, для неё нужна линия 16 А.",
  },
  "сушильная машина": {
    minAmps: 16,
    typicalWatts: 2500,
    why: "Сушилка сильно грузит линию при нагреве. Нужен автомат 16 А и отдельный кабель.",
  },
  бойлер: {
    minAmps: 16,
    typicalWatts: 2000,
    why: "Водонагреватель держит нагрузку долго. Для него нужна линия 16 А, часто отдельная.",
  },
  водонагреватель: {
    minAmps: 16,
    typicalWatts: 2000,
    why: "Водонагреватель — длительная нагрузка 1,5–3 кВт. Автомат 10 А для него мал.",
  },
  кондиционер: {
    minAmps: 16,
    typicalWatts: 1800,
    why: "Кондиционер, особенно при пуске компрессора, не рассчитан на линию 10 А.",
  },
  "тёплый пол": {
    minAmps: 16,
    typicalWatts: 1800,
    why: "Тёплый пол может держать киловатты часами. Обычно его ведут отдельной линией 16 А.",
  },
  "теплый пол": {
    minAmps: 16,
    typicalWatts: 1800,
    why: "Тёплый пол может держать киловатты часами. Обычно его ведут отдельной линией 16 А.",
  },
  микроволновка: {
    minAmps: 16,
    typicalWatts: 1500,
    why: "Микроволновка легко берёт 1,2–2 кВт. На автомате 10 А это уже перегруз.",
  },
  вытяжка: {
    minAmps: 10,
    typicalWatts: 250,
    why: "Вытяжка обычно небольшая, но если она на одной линии с плитой или розетками — смотреть нужно всю группу.",
  },
  холодильник: {
    minAmps: 10,
    typicalWatts: 250,
    why: "Холодильник сам по себе слабый, но его компрессор чувствителен к слабой линии и частым отключениям.",
  },
  морозильник: {
    minAmps: 10,
    typicalWatts: 300,
    why: "Морозильник похож на холодильник: средняя мощность невелика, но линия не должна быть перегружена другой техникой.",
  },
  пылесос: {
    minAmps: 16,
    typicalWatts: 1800,
    why: "Пылесос — кратковременная, но высокая нагрузка. На 10 А линия будет на пределе.",
  },
  утюг: {
    minAmps: 16,
    typicalWatts: 2200,
    why: "Утюг часто берёт больше 2 кВт. Это розеточная нагрузка на 16 А, не на 10 А.",
  },
  котёл: {
    minAmps: 16,
    typicalWatts: 1500,
    why: "Котёл и его насосы лучше вести отдельной надёжной линией, обычно 16 А.",
  },
  котел: {
    minAmps: 16,
    typicalWatts: 1500,
    why: "Котёл и его насосы лучше вести отдельной надёжной линией, обычно 16 А.",
  },
  насос: {
    minAmps: 16,
    typicalWatts: 1200,
    why: "Насос — двигатель с пусковым током. Для него обычно нужна линия 16 А.",
  },
  септик: {
    minAmps: 16,
    typicalWatts: 1000,
    why: "Насос септика лучше не сажать на слабую осветительную линию.",
  },
  ворота: {
    minAmps: 16,
    typicalWatts: 800,
    why: "Привод ворот — двигатель. Его обычно питают отдельной линией 16 А.",
  },
  "тепловой насос": {
    minAmps: 25,
    typicalWatts: 4000,
    why: "Тепловой насос — мощный потребитель, ему нужна выделенная линия 25–32 А, не групповой автомат 10–16 А.",
  },
  "зарядка электромобиля": {
    minAmps: 32,
    typicalWatts: 7000,
    why: "Зарядка электромобиля — отдельная силовая линия, обычно 32 А, никогда не розеточная группа 10 А.",
  },
  газонокосилка: {
    minAmps: 16,
    typicalWatts: 1500,
    why: "Садовая техника с двигателем грузит линию заметно сильнее освещения.",
  },
  вентиляция: {
    minAmps: 16,
    typicalWatts: 1200,
    why: "Приточная вентиляция и канальные вентиляторы лучше вести отдельной линией 16 А.",
  },
  охрана: {
    minAmps: 10,
    typicalWatts: 200,
    why: "Охрана и слаботочка сами по себе лёгкие, но их не смешивают с силовыми розетками.",
  },
  компрессор: {
    minAmps: 16,
    typicalWatts: 2200,
    why: "Компрессор даёт большой пусковой ток. Автомат 10 А для него мал.",
  },
  станки: {
    minAmps: 16,
    typicalWatts: 2500,
    why: "Станки — двигательная нагрузка. Нужна силовая линия, обычно от 16 А.",
  },
  сварка: {
    minAmps: 32,
    typicalWatts: 5000,
    why: "Сварка сильно грузит сеть. Для неё нужна выделенная мощная линия, не бытовой автомат 10–16 А.",
  },
  "холодильная камера": {
    minAmps: 16,
    typicalWatts: 2000,
    why: "Холодильная камера работает долго и с компрессором. Линия слабее 16 А — риск отключений и порчи продукта.",
  },
  серверная: {
    minAmps: 16,
    typicalWatts: 1500,
    why: "Серверная техника чувствительна к отключениям. Ей нужна стабильная линия не слабее 16 А.",
  },
};

const KEYWORD_PROFILES: Array<{ test: RegExp; profile: LoadProfile }> = [
  { test: /розеток|розетк/, profile: EXACT_PROFILES.розетки! },
  { test: /свет|освещ|ламп/, profile: EXACT_PROFILES.свет! },
  { test: /варочн|индукц/, profile: EXACT_PROFILES["варочная панель"]! },
  { test: /плит/, profile: EXACT_PROFILES.плита! },
  { test: /духов/, profile: EXACT_PROFILES.духовка! },
  { test: /стирал/, profile: EXACT_PROFILES["стиральная машина"]! },
  { test: /посудом/, profile: EXACT_PROFILES["посудомоечная машина"]! },
  { test: /сушиль/, profile: EXACT_PROFILES["сушильная машина"]! },
  { test: /бойлер|водонагрев/, profile: EXACT_PROFILES.бойлер! },
  { test: /кондиц/, profile: EXACT_PROFILES.кондиционер! },
  { test: /тепл\w*\s*пол/, profile: EXACT_PROFILES["теплый пол"]! },
  { test: /электромоб|зарядк/, profile: EXACT_PROFILES["зарядка электромобиля"]! },
  { test: /тепловой\s+насос/, profile: EXACT_PROFILES["тепловой насос"]! },
  { test: /сварк/, profile: EXACT_PROFILES.сварка! },
  { test: /микроволн/, profile: EXACT_PROFILES.микроволновка! },
];

const UNKNOWN_PROFILE: LoadProfile = {
  minAmps: 16,
  typicalWatts: 1500,
  why: "Неизвестную нагрузку безопаснее считать силовой: для бытовой техники обычно нужна линия 16 А, а не осветительный автомат 6–10 А.",
};

function normalizeLoadName(name: string): string {
  return name.trim().toLowerCase().replace(/ё/g, "е");
}

export function profileForLoad(load: string): LoadProfile {
  const key = normalizeLoadName(load);
  if (EXACT_PROFILES[key]) return EXACT_PROFILES[key];
  const hinted = KEYWORD_PROFILES.find((item) => item.test.test(key));
  if (hinted) return hinted.profile;
  return UNKNOWN_PROFILE;
}

/** Nominal current of a breaker / RCBO from rating text like C16, 10A, 10 А. */
export function parseBreakerAmps(
  rating: string | undefined,
  characteristics?: Record<string, string>,
): number | null {
  const chunks = [
    characteristics?.["Номинальный ток"],
    characteristics?.["Номинал"],
    rating,
  ].filter((item): item is string => Boolean(item?.trim()));

  for (const chunk of chunks) {
    const amps = parseAmpsFromText(chunk);
    if (amps) return amps;
  }
  return null;
}

function parseAmpsFromText(text: string): number | null {
  const withoutMilli = text.replace(/\d+(?:[.,]\d+)?\s*mA/gi, " ");
  const curve = withoutMilli.match(/\b[BCDEFG]\s*(\d{1,3})\b/i);
  if (curve) {
    const value = Number(curve[1]);
    if (Number.isFinite(value) && value >= 1 && value <= 125) return value;
  }
  const withUnit = withoutMilli.match(/(\d+(?:[.,]\d+)?)\s*[AА]\b/i);
  if (withUnit) {
    const value = Number(withUnit[1].replace(",", "."));
    if (Number.isFinite(value) && value >= 1 && value <= 125) return value;
  }
  return null;
}

function looksThreePhase(poles?: string): boolean {
  if (!poles) return false;
  const normalized = poles.toUpperCase().replace(/\s+/g, "");
  return (
    normalized.includes("3P") ||
    normalized.includes("4P") ||
    normalized.includes("3P+N")
  );
}

function breakerCapacityWatts(amps: number, poles?: string): number {
  if (looksThreePhase(poles)) return amps * 400 * Math.sqrt(3);
  return amps * VOLTAGE_V;
}

function formatKw(watts: number): string {
  const kw = watts / 1000;
  const digits = kw >= 10 ? 0 : 1;
  return `${kw.toLocaleString("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} кВт`;
}

function snapBreakerAmps(amps: number): number {
  const standard = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  for (const value of standard) {
    if (value >= amps) return value;
  }
  return amps;
}

function recommendedAmpsForLoads(
  device: Pick<Device, "rating" | "characteristics" | "poles">,
  loadsByRoom: Record<string, string[]>,
  typicalWatts: number,
  overloaded: boolean,
): number | undefined {
  const selected = Object.values(loadsByRoom)
    .flat()
    .map((item) => item.trim())
    .filter(Boolean);
  if (selected.length === 0) return undefined;

  const current = parseBreakerAmps(device.rating, device.characteristics);
  let recommended = 0;
  for (const load of Array.from(new Set(selected))) {
    recommended = Math.max(recommended, profileForLoad(load).minAmps);
  }
  if (overloaded && current) {
    const needed = Math.ceil(
      typicalWatts / (VOLTAGE_V * CONTINUOUS_LOAD_FACTOR),
    );
    recommended = Math.max(recommended, needed);
  }
  recommended = snapBreakerAmps(recommended);
  if (current && recommended <= current) return undefined;
  return recommended;
}

export function assessLineLoadSafety(
  device: Pick<Device, "rating" | "characteristics" | "poles">,
  loadsByRoom: Record<string, string[]>,
): LineLoadAlarm | null {
  const selected = Object.values(loadsByRoom).flat().map((item) => item.trim()).filter(Boolean);
  if (selected.length === 0) return null;

  const amps = parseBreakerAmps(device.rating, device.characteristics);
  if (!amps) return null;

  const uniqueLoads = Array.from(new Set(selected));
  const unsafeLoads: string[] = [];
  const points: string[] = [];
  const seenWhy = new Set<string>();

  for (const load of uniqueLoads) {
    const profile = profileForLoad(load);
    if (profile.minAmps <= amps) continue;
    unsafeLoads.push(load);
    if (seenWhy.has(profile.why)) continue;
    seenWhy.add(profile.why);
    points.push(`«${load}»: ${profile.why}`);
  }

  let typicalWatts = 0;
  const socketRooms = Object.values(loadsByRoom).filter((loads) =>
    loads.some((load) => normalizeLoadName(load).includes("розет")),
  ).length;
  const lightRooms = Object.values(loadsByRoom).filter((loads) =>
    loads.some((load) => {
      const key = normalizeLoadName(load);
      return key === "свет" || /освещ/.test(key);
    }),
  ).length;

  const counted = new Set<string>();
  for (const [room, loads] of Object.entries(loadsByRoom)) {
    for (const load of loads) {
      const key = `${room}::${normalizeLoadName(load)}`;
      if (counted.has(key)) continue;
      counted.add(key);
      const profile = profileForLoad(load);
      const name = normalizeLoadName(load);
      if (name.includes("розет") || name === "свет" || /освещ/.test(name)) {
        continue;
      }
      typicalWatts += profile.typicalWatts;
    }
  }
  if (socketRooms > 0) typicalWatts += 2500 + Math.max(0, socketRooms - 1) * 600;
  if (lightRooms > 0) typicalWatts += 300 * lightRooms;

  const capacityWatts = breakerCapacityWatts(amps, device.poles);
  const allowedWatts = capacityWatts * CONTINUOUS_LOAD_FACTOR;
  const overloaded = typicalWatts > allowedWatts + 150;

  if (overloaded) {
    points.push(
      `В сумме отмеченные нагрузки могут давать около ${formatKw(typicalWatts)}. Автомат на ${amps} А рассчитан примерно на ${formatKw(capacityWatts)}, а длительно лучше не грузить его больше чем на ${formatKw(allowedWatts)}.`,
    );
  }

  if (unsafeLoads.length === 0 && !overloaded) return null;

  const ratingLabel = `${amps} А`;
  const title = "Это небезопасно";
  const summary = overloaded && unsafeLoads.length === 0
    ? `Прибор на ${ratingLabel} слишком слабый для выбранного набора нагрузок.`
    : `Автомат на ${ratingLabel} не соответствует выбранной нагрузке. Так оставлять линию нельзя.`;

  const closing =
    "Автомат должен быть согласован с кабелем и нагрузкой. Если слабый автомат стоит на толстом кабеле, он будет часто выбивать. Если слабый автомат стоит на тонком кабеле освещения, а к линии повесили розетки — кабель может греться до повреждения изоляции. Это стоит поправить: отдельная линия нужного номинала или перенос нагрузки.";

  const recommendedAmps = recommendedAmpsForLoads(
    device,
    loadsByRoom,
    typicalWatts,
    overloaded,
  );

  return {
    title,
    summary,
    points: [...points, closing],
    unsafeLoads,
    recommendedAmps,
  };
}

export function assessDeviceLineLoadSafety(
  device: Pick<Device, "rating" | "characteristics" | "poles" | "circuitLabel">,
): LineLoadAlarm | null {
  return assessLineLoadSafety(device, parseLineLoads(device.circuitLabel));
}
