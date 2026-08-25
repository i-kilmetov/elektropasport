export type CatalogApplianceKind =
  | "washer"
  | "fridge"
  | "oven"
  | "microwave"
  | "dryer"
  | "hob";

export type ApplianceSpec = { label: string; value: string };

/** Stable external doc links — PDFs open at the source, never stored in our DB as files. */
export function buildApplianceDocUrls(
  brand: string,
  model: string,
): { instructionUrl: string; manualUrl: string } {
  const brandKey = brand.toLowerCase();
  const modelQ = encodeURIComponent(model);
  const fullQ = encodeURIComponent(`${brand} ${model}`);

  if (brandKey.includes("bosch")) {
    const url = `https://www.bosch-home.com/ru/service/dokumenty?SearchTerm=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("siemens")) {
    const url = `https://www.siemens-home.bsh-group.com/ru/service/dokumenty?SearchTerm=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey === "lg") {
    const url = `https://www.lg.com/ru/support/manuals-documents?search=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("samsung")) {
    const url = `https://www.samsung.com/ru/support/model/${encodeURIComponent(model.toLowerCase().replace(/\s+/g, "-"))}/`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("electrolux")) {
    const url = `https://www.electrolux.ru/support/manuals/?q=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("indesit") || brandKey.includes("hotpoint") || brandKey.includes("ariston") || brandKey.includes("whirlpool")) {
    const url = `https://docs.whirlpool.eu/index.html#/?search=${fullQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("miele")) {
    const url = `https://www.miele.ru/domestic/search.htm?query=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("gorenje") || brandKey.includes("asko")) {
    const url = `https://ru.gorenje.com/support/?q=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("beko")) {
    const url = `https://www.beko.ru/support?search=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("haier")) {
    const url = `https://www.haier-europe.com/ru_RU/support/?q=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("candy")) {
    const url = `https://www.candy-home.com/ru_RU/support/?q=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("panasonic")) {
    const url = `https://www.panasonic.com/ru/support/manuals.html?q=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }
  if (brandKey.includes("liebherr")) {
    const url = `https://home.liebherr.com/ru/rus/support/manuals.html?q=${modelQ}`;
    return { instructionUrl: url, manualUrl: url };
  }

  // Universal PDF index — opens search with manuals/PDFs at the source host.
  return {
    instructionUrl: `https://www.manualslib.com/search.php?q=${encodeURIComponent(`${brand} ${model} installation instructions`)}`,
    manualUrl: `https://www.manualslib.com/search.php?q=${encodeURIComponent(`${brand} ${model} user manual`)}`,
  };
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
    default:
      return [power];
  }
}
