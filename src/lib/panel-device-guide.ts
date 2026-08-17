import type { Device, DeviceType } from "@/types";
import { getSampleCatalogDevice } from "@/lib/device-catalog";

export type DeviceGuideEntry = {
  title: string;
  /** What this device does in plain language */
  role: string;
  /** Why it can be useful if the user does not have one yet */
  benefit: string;
};

const RAIL_TYPES = [
  "main_breaker",
  "breaker",
  "rcd",
  "diff_breaker",
  "voltage_relay",
  "spd",
  "afdd",
] as const satisfies readonly DeviceType[];

type RailDeviceType = (typeof RAIL_TYPES)[number];

export const deviceTypeGuide: Record<
  Exclude<DeviceType, "pe_bus" | "n_bus">,
  DeviceGuideEntry
> = {
  main_breaker: {
    title: "Вводной автомат",
    role: "Главный «рубильник» квартиры или дома: ограничивает общий ток и отключает питание целиком при перегрузке или коротком замыкании на вводе.",
    benefit: "Без него нельзя безопасно ограничить мощность всего объекта и быстро обесточить щиток.",
  },
  breaker: {
    title: "Автоматический выключатель",
    role: "Защищает отдельную линию — розетки, свет, технику. При перегрузке или КЗ отключает только эту линию, а не весь дом.",
    benefit: "Каждая группа проводки должна иметь свой автомат под ожидаемую нагрузку.",
  },
  rcd: {
    title: "УЗО",
    role: "Следит за утечкой тока на землю. Если ток «утекает» через человека или повреждённую изоляцию — быстро отключает цепь.",
    benefit: "Снижает риск поражения током во влажных зонах и на старых линиях без заземления розеток.",
  },
  diff_breaker: {
    title: "Дифавтомат",
    role: "Сочетает автомат и УЗО в одном корпусе: защищает линию и от перегрузки, и от утечки.",
    benefit: "Удобен там, где нужна защита от утечки на одной линии без установки отдельного УЗО.",
  },
  voltage_relay: {
    title: "Реле напряжения",
    role: "Следит за напряжением в сети. При слишком низком или высоком напряжении отключает нагрузку, чтобы не сгорела техника.",
    benefit: "Полезно при нестабильной сети, частых скачках или «просадках» напряжения.",
  },
  spd: {
    title: "УЗИП",
    role: "Принимает на себя импульсные перенапряжения — от грозы, включения мощной нагрузки в сети, скачков на линии.",
    benefit: "Помогает сохранить электронику и бытовую технику при редких, но опасных всплесках напряжения.",
  },
  afdd: {
    title: "УЗДП",
    role: "Распознаёт дуговой пробой в проводке или соединениях и отключает линию до возгорания.",
    benefit: "Дополнительная защита там, где важна пожаробезопасность старой или скрытой проводки.",
  },
};

export const panelGuideDisclaimer =
  "Токщиток показывает, какие приборы видны на фото и в схеме. Сервис не проверяет, правильно ли они соединены между собой, подобраны ли номиналы и исправно ли всё работает на самом деле. Окончательную оценку может дать только очный осмотр электрика.";

export function summarizePanelDevices(devices: Device[]): {
  present: Array<{
    type: RailDeviceType;
    count: number;
    guide: DeviceGuideEntry;
    sample: Device;
  }>;
  missing: Array<{
    type: RailDeviceType;
    guide: DeviceGuideEntry;
    sample: Device;
  }>;
} {
  const counts = new Map<RailDeviceType, number>();
  const samples = new Map<RailDeviceType, Device>();

  for (const device of devices) {
    if (device.type === "pe_bus" || device.type === "n_bus") continue;
    const type = device.type as RailDeviceType;
    if (!RAIL_TYPES.includes(type)) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (!samples.has(type)) samples.set(type, device);
  }

  const present = RAIL_TYPES.filter((type) => (counts.get(type) ?? 0) > 0).map(
    (type) => ({
      type,
      count: counts.get(type) ?? 0,
      guide: deviceTypeGuide[type],
      sample: samples.get(type)!,
    }),
  );

  const missing = RAIL_TYPES.filter((type) => !(counts.get(type) ?? 0)).map(
    (type) => {
      const sample =
        getSampleCatalogDevice(type) ??
        ({
          id: 0,
          type,
          name: deviceTypeGuide[type].title,
          rating: "—",
          status: "unknown" as const,
          modules: 1,
        } satisfies Device);
      return {
        type,
        guide: deviceTypeGuide[type],
        sample,
      };
    },
  );

  return { present, missing };
}
