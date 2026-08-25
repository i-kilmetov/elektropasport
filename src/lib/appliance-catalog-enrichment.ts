export type CatalogApplianceKind =
  | "washer"
  | "fridge"
  | "dishwasher"
  | "oven"
  | "microwave"
  | "dryer"
  | "hob"
  | "ac"
  | "boiler"
  | "tv"
  | "heater";

export type ApplianceSpec = { label: string; value: string };

/**
 * External doc links only — we never host PDFs.
 * Prefer manufacturer support search; ManualsLib / EPREL as fallbacks.
 * Full product DBs: ApplianceAPI, Skulytics (paid), EPREL (EU energy label API).
 */
export function buildApplianceDocUrls(
  brand: string,
  model: string,
): { instructionUrl: string; manualUrl: string } {
  const brandKey = brand.toLowerCase();
  const modelQ = encodeURIComponent(model);
  const fullQ = encodeURIComponent(`${brand} ${model}`);

  const brandSupport = (url: string) => ({
    instructionUrl: url,
    manualUrl: url,
  });

  if (brandKey.includes("bosch")) {
    return brandSupport(
      `https://www.bosch-home.com/ru/service/dokumenty?SearchTerm=${modelQ}`,
    );
  }
  if (brandKey.includes("siemens")) {
    return brandSupport(
      `https://www.siemens-home.bsh-group.com/ru/service/dokumenty?SearchTerm=${modelQ}`,
    );
  }
  if (brandKey === "lg") {
    return brandSupport(
      `https://www.lg.com/ru/support/manuals-documents?search=${modelQ}`,
    );
  }
  if (brandKey.includes("samsung")) {
    return brandSupport(
      `https://www.samsung.com/ru/support/model/${encodeURIComponent(model.toLowerCase().replace(/\s+/g, "-"))}/`,
    );
  }
  if (brandKey.includes("electrolux")) {
    return brandSupport(
      `https://www.electrolux.ru/support/manuals/?q=${modelQ}`,
    );
  }
  if (
    brandKey.includes("indesit") ||
    brandKey.includes("hotpoint") ||
    brandKey.includes("ariston") ||
    brandKey.includes("whirlpool") ||
    brandKey.includes("zanussi")
  ) {
    return brandSupport(`https://docs.whirlpool.eu/index.html#/?search=${fullQ}`);
  }
  if (brandKey.includes("miele")) {
    return brandSupport(
      `https://www.miele.ru/domestic/search.htm?query=${modelQ}`,
    );
  }
  if (brandKey.includes("gorenje") || brandKey.includes("asko")) {
    return brandSupport(`https://ru.gorenje.com/support/?q=${modelQ}`);
  }
  if (brandKey.includes("beko")) {
    return brandSupport(`https://www.beko.ru/support?search=${modelQ}`);
  }
  if (brandKey.includes("haier")) {
    return brandSupport(
      `https://www.haier-europe.com/ru_RU/support/?q=${modelQ}`,
    );
  }
  if (brandKey.includes("candy")) {
    return brandSupport(
      `https://www.candy-home.com/ru_RU/support/?q=${modelQ}`,
    );
  }
  if (brandKey.includes("panasonic")) {
    return brandSupport(
      `https://www.panasonic.com/ru/support/manuals.html?q=${modelQ}`,
    );
  }
  if (brandKey.includes("liebherr")) {
    return brandSupport(
      `https://home.liebherr.com/ru/rus/support/manuals.html?q=${modelQ}`,
    );
  }
  if (brandKey.includes("atlant")) {
    return brandSupport(`https://atlant.by/support/?q=${modelQ}`);
  }
  if (brandKey.includes("weissgauff")) {
    return brandSupport(`https://weissgauff.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("hansa")) {
    return brandSupport(`https://www.hansa.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("krona")) {
    return brandSupport(`https://krona-steel.com/support/?q=${modelQ}`);
  }
  if (brandKey.includes("maunfeld")) {
    return brandSupport(`https://maunfeld.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("kuppersberg")) {
    return brandSupport(`https://kuppersberg.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("hisense")) {
    return brandSupport(`https://www.hisense.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("toshiba")) {
    return brandSupport(
      `https://www.toshiba-lifestyle.com/ru/support/?q=${modelQ}`,
    );
  }
  if (brandKey.includes("daikin")) {
    return brandSupport(`https://www.daikin.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("ballu") || brandKey.includes("electrolux home")) {
    return brandSupport(`https://ballu.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("thermex")) {
    return brandSupport(`https://thermex.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("timberk")) {
    return brandSupport(`https://timberk.ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("sony")) {
    return brandSupport(
      `https://www.sony.ru/electronics/support/manuals/${modelQ}`,
    );
  }
  if (brandKey.includes("philips") || brandKey.includes("tp vision")) {
    return brandSupport(`https://www.philips.ru/c-w/support-home.html?q=${modelQ}`);
  }
  if (brandKey.includes("xiaomi") || brandKey.includes("mi tv")) {
    return brandSupport(`https://www.mi.com/ru/support/?q=${modelQ}`);
  }
  if (brandKey.includes("tcl")) {
    return brandSupport(`https://www.tcl.com/ru/ru/service?q=${modelQ}`);
  }
  if (brandKey.includes("bbk")) {
    return brandSupport(`https://bbk.ru/support/?q=${modelQ}`);
  }

  // Universal PDF index — PDFs stay on the source host.
  const manualsLibInstruction = `https://www.manualslib.com/search.php?q=${encodeURIComponent(`${brand} ${model} installation`)}`;
  const manualsLibManual = `https://www.manualslib.com/search.php?q=${encodeURIComponent(`${brand} ${model} user manual`)}`;
  return {
    instructionUrl: manualsLibInstruction,
    manualUrl: manualsLibManual,
  };
}

/** Public EPREL group search (no API key). Null when product group is unsupported. */
export function buildEprelPublicUrl(
  kind: CatalogApplianceKind,
  brand: string,
  model: string,
): string | null {
  // Lazy import avoided — keep URL builder local to enrichment for client bundles.
  const groups: Partial<Record<CatalogApplianceKind, string>> = {
    washer: "washingmachines",
    dryer: "tumbledriers",
    dishwasher: "dishwashers",
    fridge: "refrigeratingappliances",
    oven: "ovens",
    ac: "airconditioners",
    boiler: "waterheaters",
    tv: "electronicdisplays",
    heater: "localspaceheaters",
  };
  const group = groups[kind];
  if (!group) return null;
  const params = new URLSearchParams();
  if (brand.trim()) params.set("supplierOrTrademark", brand.trim());
  if (model.trim()) params.set("modelIdentifier", model.trim());
  const qs = params.toString();
  return `https://eprel.ec.europa.eu/screen/product/${group}${qs ? `?${qs}` : ""}`;
}

function pick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length]!;
}

function extractFirstNumber(model: string): number | null {
  const match = model.match(/(\d{2,4})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Typical retail specs for catalog models (power is always authoritative). */
export function buildApplianceSpecs(
  kind: CatalogApplianceKind,
  brand: string,
  model: string,
  maxPowerW: number,
): ApplianceSpec[] {
  const seed = `${kind}|${brand}|${model}`;
  const n = extractFirstNumber(model);
  const energy = pick(["A", "A+", "A++", "A+++", "B"], seed);
  const power: ApplianceSpec = {
    label: "Максимальная мощность",
    value: `${Math.round(maxPowerW)} Вт`,
  };

  switch (kind) {
    case "washer": {
      const kg =
        n && n >= 5 && n <= 12
          ? n
          : n && n >= 50 && n <= 120
            ? Math.round(n / 10)
            : pick([6, 7, 8, 9, 10], seed);
      const rpm = pick([1000, 1200, 1400, 1600], seed);
      return [
        power,
        { label: "Загрузка", value: `${kg} кг` },
        { label: "Отжим", value: `${rpm} об/мин` },
        { label: "Класс энергопотребления", value: energy },
        {
          label: "Тип управления",
          value: pick(["Электронный", "Сенсорный"], seed),
        },
      ];
    }
    case "fridge": {
      const liters =
        n && n >= 120 && n <= 450
          ? n
          : n && n >= 20 && n <= 60
            ? n * 10
            : pick([250, 280, 320, 350, 380], seed);
      return [
        power,
        { label: "Общий объём", value: `${liters} л` },
        { label: "Класс энергопотребления", value: energy },
        {
          label: "Уровень шума",
          value: `${pick([35, 37, 39, 41, 42], seed)} дБ`,
        },
        {
          label: "Система No Frost",
          value: pick(["Да", "Частичный", "Нет"], seed),
        },
      ];
    }
    case "dishwasher": {
      const sets =
        n && n >= 9 && n <= 16
          ? n
          : pick([9, 10, 12, 13, 14], seed);
      return [
        power,
        { label: "Вместимость", value: `${sets} комплектов` },
        { label: "Класс энергопотребления", value: energy },
        {
          label: "Уровень шума",
          value: `${pick([42, 44, 46, 48], seed)} дБ`,
        },
        {
          label: "Тип сушки",
          value: pick(["Конденсационная", "Zeolite", "Турбо"], seed),
        },
      ];
    }
    case "oven": {
      const liters =
        n && n >= 40 && n <= 80 ? n : pick([56, 60, 65, 67, 71], seed);
      return [
        power,
        { label: "Объём камеры", value: `${liters} л` },
        {
          label: "Тип",
          value: pick(["Электрический", "Электрический с паром"], seed),
        },
        { label: "Класс энергопотребления", value: energy },
        {
          label: "Очистка",
          value: pick(["Каталитическая", "Пиролитическая", "Эмаль"], seed),
        },
      ];
    }
    case "microwave": {
      const liters =
        n && n >= 17 && n <= 32 ? n : pick([20, 23, 25, 28], seed);
      return [
        power,
        { label: "Объём камеры", value: `${liters} л` },
        {
          label: "Гриль",
          value: pick(["Есть", "Нет", "Есть"], seed),
        },
        {
          label: "Управление",
          value: pick(["Электронное", "Механическое", "Сенсорное"], seed),
        },
        {
          label: "Диаметр поддона",
          value: `${pick([245, 270, 288, 315], seed)} мм`,
        },
      ];
    }
    case "dryer": {
      const kg =
        n && n >= 6 && n <= 10
          ? n
          : n && n >= 60 && n <= 100
            ? Math.round(n / 10)
            : pick([7, 8, 9], seed);
      return [
        power,
        { label: "Загрузка", value: `${kg} кг` },
        {
          label: "Тип сушки",
          value: pick(
            ["Тепловой насос", "Конденсационная", "С выводом воздуха"],
            seed,
          ),
        },
        { label: "Класс энергопотребления", value: energy },
        {
          label: "Уровень шума",
          value: `${pick([62, 64, 65, 67], seed)} дБ`,
        },
      ];
    }
    case "hob": {
      const zones = pick([3, 4, 4, 5], seed);
      return [
        power,
        {
          label: "Тип",
          value: pick(
            ["Индукционная", "Стеклокерамическая", "Индукционная"],
            seed,
          ),
        },
        { label: "Количество конфорок", value: String(zones) },
        {
          label: "Ширина",
          value: `${pick([45, 60, 60, 80], seed)} см`,
        },
        {
          label: "Управление",
          value: pick(["Сенсорное", "Слайдерное"], seed),
        },
      ];
    }
    case "ac": {
      const btu =
        n && n >= 7 && n <= 24
          ? n * 1000
          : pick([7000, 9000, 12000, 18000, 24000], seed);
      return [
        power,
        { label: "Холодопроизводительность", value: `${btu} BTU` },
        {
          label: "Тип",
          value: pick(["Сплит-система", "Инверторный сплит"], seed),
        },
        { label: "Класс энергопотребления", value: energy },
        {
          label: "Уровень шума (внутр.)",
          value: `${pick([19, 22, 24, 28, 32], seed)} дБ`,
        },
      ];
    }
    case "boiler": {
      const liters =
        n && n >= 30 && n <= 200
          ? n
          : pick([30, 50, 80, 100, 150], seed);
      return [
        power,
        { label: "Объём бака", value: `${liters} л` },
        {
          label: "Тип",
          value: pick(
            ["Накопительный", "Проточный", "Накопительный"],
            seed,
          ),
        },
        {
          label: "Установка",
          value: pick(["Настенный", "Напольный"], seed),
        },
        {
          label: "Внутреннее покрытие",
          value: pick(["Эмаль", "Нержавеющая сталь", "Стеклокерамика"], seed),
        },
      ];
    }
    case "tv": {
      const inches =
        n && n >= 24 && n <= 85
          ? n
          : pick([32, 43, 50, 55, 65], seed);
      return [
        power,
        { label: "Диагональ", value: `${inches}"` },
        {
          label: "Разрешение",
          value: pick(["Full HD", "4K UHD", "4K UHD"], seed),
        },
        {
          label: "Тип панели",
          value: pick(["LED", "QLED", "OLED", "LCD"], seed),
        },
        {
          label: "Smart TV",
          value: pick(["Да", "Да", "Нет"], seed),
        },
      ];
    }
    case "heater": {
      return [
        power,
        {
          label: "Тип",
          value: pick(
            ["Конвектор", "Масляный", "Инфракрасный", "Тепловентилятор"],
            seed,
          ),
        },
        {
          label: "Площадь обогрева",
          value: `${pick([10, 15, 20, 25, 30], seed)} м²`,
        },
        {
          label: "Термостат",
          value: pick(["Механический", "Электронный"], seed),
        },
        {
          label: "Защита от перегрева",
          value: "Да",
        },
      ];
    }
    default:
      return [power];
  }
}
