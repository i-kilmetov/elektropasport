import type { Device, DeviceStatus, DeviceType } from "@/types";

export type CatalogCategory =
  | "breaker"
  | "main_breaker"
  | "rcd"
  | "diff_breaker"
  | "voltage_relay"
  | "spd"
  | "afdd";

export interface CatalogProduct {
  id: string;
  brand: string;
  brandKey: string;
  category: CatalogCategory;
  series: string;
  model: string;
  modules: number;
  poles: string;
  rating: string;
  characteristics: Record<string, string>;
  displayName: string;
}

const BRANDS = [
  { key: "iek", brand: "IEK", seriesBreaker: "ВА47-29", seriesRcd: "ВД1-63", seriesDiff: "АВДТ32", seriesSpd: "ОПС1", seriesAfdd: "АФДД" },
  { key: "abb", brand: "ABB", seriesBreaker: "S201", seriesRcd: "F202", seriesDiff: "DS201", seriesSpd: "OVR", seriesAfdd: "S-ARC1" },
  { key: "schneider", brand: "Schneider", seriesBreaker: "iC60N", seriesRcd: "iID", seriesDiff: "iDPN Vigi", seriesSpd: "iPRD", seriesAfdd: "iARC" },
  { key: "legrand", brand: "Legrand", seriesBreaker: "TX3", seriesRcd: "TX3", seriesDiff: "DX3", seriesSpd: "SPDs", seriesAfdd: "DX3 AFDD" },
  { key: "keaz", brand: "KEAZ", seriesBreaker: "OptiDin BM63", seriesRcd: "OptiDin DM60", seriesDiff: "OptiDin VD63", seriesSpd: "OptiDin SP", seriesAfdd: "OptiDin AF" },
  { key: "ekf", brand: "EKF", seriesBreaker: "AV-6", seriesRcd: "AVD-63", seriesDiff: "AVDT-63", seriesSpd: "OPV", seriesAfdd: "AFDD-63" },
  { key: "chint", brand: "Chint", seriesBreaker: "NB1", seriesRcd: "NL1", seriesDiff: "NB1L", seriesSpd: "NU6", seriesAfdd: "NB1L-AF" },
  { key: "dekraft", brand: "DEKraft", seriesBreaker: "ВА-101", seriesRcd: "УЗО-03", seriesDiff: "АВДТ-32", seriesSpd: "ОПС", seriesAfdd: "АФД" },
  { key: "systeme", brand: "Systeme Electric", seriesBreaker: "City9", seriesRcd: "City9", seriesDiff: "City9 Diff", seriesSpd: "City9 SPD", seriesAfdd: "City9 AFDD" },
  { key: "hager", brand: "Hager", seriesBreaker: "MBN", seriesRcd: "CDNxxx", seriesDiff: "ADNxxx", seriesSpd: "SPN", seriesAfdd: "ARC" },
] as const;

function polesToModules(poles: string, category: CatalogCategory): number {
  if (category === "voltage_relay") return 1;
  if (category === "spd") {
    if (poles.includes("3+N") || poles === "4P") return 4;
    if (poles === "3P") return 3;
    if (poles === "2P") return 2;
    return 1;
  }
  if (poles === "1P") return 1;
  if (poles === "1P+N" || poles === "2P") return 2;
  if (poles === "3P") return 3;
  if (poles === "3P+N" || poles === "4P") return 4;
  return 1;
}

function pushUnique(list: CatalogProduct[], item: CatalogProduct) {
  if (list.some((x) => x.id === item.id)) return;
  list.push(item);
}

function buildCatalog(): CatalogProduct[] {
  const items: CatalogProduct[] = [];

  for (const b of BRANDS) {
    // Group breakers — focus on C-curve (most common), limited B/D
    for (const poles of ["1P", "2P", "3P"] as const) {
      const amps =
        poles === "1P"
          ? ([6, 10, 16, 20, 25, 32, 40, 63] as const)
          : ([16, 25, 32, 40, 63] as const);
      for (const amp of amps) {
        const modules = polesToModules(poles, "breaker");
        pushUnique(items, {
          id: `${b.key}-brk-${poles}-c${amp}`.toLowerCase(),
          brand: b.brand,
          brandKey: b.key,
          category: "breaker",
          series: b.seriesBreaker,
          model: `${b.seriesBreaker} ${poles} C${amp}`,
          modules,
          poles,
          rating: `C${amp}`,
          displayName: `Автомат ${poles} C${amp}`,
          characteristics: {
            Тип: "Автоматический выключатель",
            Полюса: poles,
            "Кривая отключения": "C",
            "Номинальный ток": `${amp} A`,
            "Откл. способность": "6 кА",
            Модули: String(modules),
          },
        });
      }
      // A few B-curve for lighting lines
      if (poles === "1P") {
        for (const amp of [10, 16] as const) {
          const modules = polesToModules(poles, "breaker");
          pushUnique(items, {
            id: `${b.key}-brk-${poles}-b${amp}`.toLowerCase(),
            brand: b.brand,
            brandKey: b.key,
            category: "breaker",
            series: b.seriesBreaker,
            model: `${b.seriesBreaker} ${poles} B${amp}`,
            modules,
            poles,
            rating: `B${amp}`,
            displayName: `Автомат ${poles} B${amp}`,
            characteristics: {
              Тип: "Автоматический выключатель",
              Полюса: poles,
              "Кривая отключения": "B",
              "Номинальный ток": `${amp} A`,
              "Откл. способность": "6 кА",
              Модули: String(modules),
            },
          });
        }
      }
    }

    // Main / incomer
    for (const poles of ["2P", "3P", "4P"] as const) {
      for (const amp of [40, 63, 100] as const) {
        if (amp === 100 && poles === "2P") continue;
        const modules = polesToModules(poles, "main_breaker");
        pushUnique(items, {
          id: `${b.key}-main-${poles}-c${amp}`.toLowerCase(),
          brand: b.brand,
          brandKey: b.key,
          category: "main_breaker",
          series: b.seriesBreaker,
          model: `${b.seriesBreaker} ${poles} C${amp}`,
          modules,
          poles,
          rating: `C${amp}`,
          displayName: `Вводной автомат ${poles} C${amp}`,
          characteristics: {
            Тип: "Вводной автоматический выключатель",
            Полюса: poles,
            "Кривая отключения": "C",
            "Номинальный ток": `${amp} A`,
            "Откл. способность": poles === "4P" ? "10 кА" : "6 кА",
            Модули: String(modules),
          },
        });
      }
    }

    // RCD — most used sensitivities
    for (const poles of ["2P", "4P"] as const) {
      for (const amp of [25, 40, 63] as const) {
        for (const sens of [30, 100] as const) {
          const modules = polesToModules(poles, "rcd");
          pushUnique(items, {
            id: `${b.key}-rcd-${poles}-${amp}a-${sens}ma`.toLowerCase(),
            brand: b.brand,
            brandKey: b.key,
            category: "rcd",
            series: b.seriesRcd,
            model: `${b.seriesRcd} ${poles} ${amp}A ${sens}mA`,
            modules,
            poles,
            rating: `${amp}A / ${sens}mA`,
            displayName: `УЗО ${poles} ${amp}A ${sens}mA`,
            characteristics: {
              Тип: "Устройство защитного отключения (УЗО)",
              Полюса: poles,
              "Номинальный ток": `${amp} A`,
              "Ток утечки": `${sens} mA`,
              Класс: "A",
              Модули: String(modules),
            },
          });
        }
      }
    }

    // Diff breakers
    for (const poles of ["1P+N", "2P"] as const) {
      for (const amp of [10, 16, 25, 32] as const) {
        const sens = 30;
        const modules = polesToModules(poles, "diff_breaker");
        pushUnique(items, {
          id: `${b.key}-diff-${poles.replace("+", "")}-c${amp}-${sens}ma`.toLowerCase(),
          brand: b.brand,
          brandKey: b.key,
          category: "diff_breaker",
          series: b.seriesDiff,
          model: `${b.seriesDiff} ${poles} C${amp} ${sens}mA`,
          modules,
          poles,
          rating: `C${amp} / ${sens}mA`,
          displayName: `Дифавтомат ${poles} C${amp} ${sens}mA`,
          characteristics: {
            Тип: "Дифференциальный автомат",
            Полюса: poles,
            "Кривая отключения": "C",
            "Номинальный ток": `${amp} A`,
            "Ток утечки": `${sens} mA`,
            Модули: String(modules),
          },
        });
      }
    }

    // SPD
    for (const cls of [
      { code: "2", poles: "2P", uoc: "Class II" },
      { code: "2-3n", poles: "3+N", uoc: "Class II" },
    ] as const) {
      const modules = polesToModules(cls.poles, "spd");
      pushUnique(items, {
        id: `${b.key}-spd-${cls.code}`.toLowerCase(),
        brand: b.brand,
        brandKey: b.key,
        category: "spd",
        series: b.seriesSpd,
        model: `${b.seriesSpd} ${cls.uoc} ${cls.poles}`,
        modules,
        poles: cls.poles,
        rating: cls.uoc,
        displayName: `УЗИП ${cls.uoc}`,
        characteristics: {
          Тип: "Устройство защиты от импульсных перенапряжений (УЗИП)",
          Класс: cls.uoc,
          Полюса: cls.poles,
          Un: "230/400 V",
          Модули: String(modules),
        },
      });
    }

    // AFDD
    for (const amp of [16, 20] as const) {
      pushUnique(items, {
        id: `${b.key}-afdd-1pn-c${amp}`.toLowerCase(),
        brand: b.brand,
        brandKey: b.key,
        category: "afdd",
        series: b.seriesAfdd,
        model: `${b.seriesAfdd} 1P+N C${amp}`,
        modules: 2,
        poles: "1P+N",
        rating: `C${amp}`,
        displayName: `УЗДП 1P+N C${amp}`,
        characteristics: {
          Тип: "Устройство защиты от дугового пробоя (УЗДП)",
          Полюса: "1P+N",
          "Номинальный ток": `${amp} A`,
          "Кривая отключения": "C",
          Модули: "2",
        },
      });
    }
  }

  const relayBrands = [
    { key: "zubr", brand: "ZUBR", series: "D2" },
    { key: "meander", brand: "Меандр", series: "УЗМ-51М" },
    { key: "novatek", brand: "Новатек-Электро", series: "РН-104" },
    { key: "digitop", brand: "DigiTOP", series: "V-protector" },
    { key: "iek", brand: "IEK", series: "РН" },
  ] as const;

  for (const r of relayBrands) {
    for (const amp of [40, 63] as const) {
      pushUnique(items, {
        id: `${r.key}-vr-${amp}`.toLowerCase(),
        brand: r.brand,
        brandKey: r.key.toLowerCase(),
        category: "voltage_relay",
        series: r.series,
        model: `${r.series} ${amp}A`,
        modules: 1,
        poles: "1P",
        rating: `${amp}A`,
        displayName: `Реле напряжения ${amp}A`,
        characteristics: {
          Тип: "Реле контроля напряжения",
          "Номинальный ток": `${amp} A`,
          Диапазон: "120–280 V",
          Модули: "1",
        },
      });
    }
  }

  return items;
}

export const deviceCatalog: CatalogProduct[] = buildCatalog();

export function getCatalogProduct(id: string): CatalogProduct | undefined {
  return deviceCatalog.find((p) => p.id === id);
}

export function catalogCategoryToDeviceType(
  category: CatalogCategory,
): DeviceType {
  return category;
}

export function deviceTypeToCategory(type: DeviceType): CatalogCategory | null {
  if (type === "pe_bus" || type === "n_bus") return null;
  return type;
}

export type CatalogFilters = {
  brand?: string;
  modules?: number;
  poles?: string;
  search?: string;
};

export function filterCatalogProducts(
  category: CatalogCategory,
  filters: CatalogFilters = {},
): CatalogProduct[] {
  const q = filters.search?.trim().toLowerCase();
  return deviceCatalog.filter((product) => {
    if (product.category !== category) return false;
    if (filters.brand && filters.brand !== "all" && product.brand !== filters.brand)
      return false;
    if (filters.modules && product.modules !== filters.modules) return false;
    if (filters.poles && filters.poles !== "all" && product.poles !== filters.poles)
      return false;
    if (q) {
      const haystack = [
        product.displayName,
        product.model,
        product.brand,
        product.rating,
        product.poles,
        ...Object.values(product.characteristics),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function getCatalogBrands(category: CatalogCategory): string[] {
  return [...new Set(deviceCatalog.filter((p) => p.category === category).map((p) => p.brand))].sort();
}

export function getSampleCatalogDevice(type: DeviceType): Device | null {
  const category = deviceTypeToCategory(type);
  if (!category) return null;
  const product = deviceCatalog.find((p) => p.category === category);
  if (!product) return null;
  return productToDevice(product, { id: 0, position: 0, status: "verified" });
}

export function productToDevice(
  product: CatalogProduct,
  opts: {
    id: number;
    position: number;
    status?: DeviceStatus;
    confidence?: number;
    circuitLabel?: string;
  },
): Device {
  return {
    id: opts.id,
    type: catalogCategoryToDeviceType(product.category),
    name: opts.circuitLabel?.trim() || product.displayName,
    rating: product.rating,
    status: opts.status ?? "verified",
    manufacturer: product.brand,
    confidence: opts.confidence ?? 92,
    position: opts.position,
    modules: product.modules,
    catalogId: product.id,
    poles: product.poles,
    series: product.series,
    model: product.model,
    characteristics: product.characteristics,
    circuitLabel: opts.circuitLabel,
    brandKey: product.brandKey,
  };
}

/** Realistic demo apartment panel built from catalog SKUs (no room names). */
export function buildDemoPanelDevices(): Device[] {
  const pick = (id: string) => {
    const p = getCatalogProduct(id);
    if (!p) throw new Error(`Catalog miss: ${id}`);
    return p;
  };

  const picks: Array<{ id: string; status: DeviceStatus; confidence: number }> =
    [
      { id: "abb-main-3p-c63", status: "verified", confidence: 96 },
      { id: "abb-rcd-4p-63a-30ma", status: "verified", confidence: 94 },
      { id: "zubr-vr-63", status: "verified", confidence: 91 },
      { id: "iek-spd-2", status: "verified", confidence: 89 },
      { id: "dekraft-brk-1p-c16", status: "pending", confidence: 88 },
      { id: "dekraft-brk-1p-c10", status: "verified", confidence: 93 },
      { id: "schneider-diff-1pn-c16-30ma", status: "pending", confidence: 87 },
      { id: "dekraft-brk-1p-c16", status: "verified", confidence: 95 },
      { id: "abb-brk-1p-c10", status: "verified", confidence: 92 },
      { id: "ekf-afdd-1pn-c16", status: "pending", confidence: 84 },
    ];

  // Unique catalog ids for duplicate C16 picks — second use another brand
  picks[7] = { id: "iek-brk-1p-c16", status: "verified", confidence: 95 };

  const rail = picks.map((row, index) =>
    productToDevice(pick(row.id), {
      id: index + 1,
      position: index,
      status: row.status,
      confidence: row.confidence,
    }),
  );

  return rail;
}

export const demoSafetyScore = 78;
export const demoLinesCount = 6;

export const circuitIdentifySteps = [
  "Убедитесь, что в квартире/доме безопасно: свет и розетки можно кратковременно отключать.",
  "Включите во всех комнатах свет и оставьте в розетках заметные нагрузки (лампа, зарядка, радио).",
  "Осторожно отключите только этот прибор на схеме (рычаг вниз).",
  "Обойдите помещения: где пропал свет или перестала работать розетка — это линия прибора.",
  "Верните рычаг вверх и подпишите линию (например: «Кухня розетки», «Свет коридор»).",
] as const;

export function catalogStats() {
  const byCategory = deviceCatalog.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  return { total: deviceCatalog.length, byCategory };
}
