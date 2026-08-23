import type { CapitalRepairInfo } from "@/lib/moscow-capital-repair";
import type { GroundingAssessment } from "@/lib/grounding-assessment";

export type ElectricalEra = "legacy" | "transitional" | "modern" | "unknown";

export type ElectricalGuess = {
  era: ElectricalEra;
  title: string;
  description: string;
};

export type HouseManagementCompany = {
  name: string;
  phone: string | null;
  ogrn: string | null;
};

export type HouseInsight = {
  address: string;
  city: string | null;
  fiasId: string | null;
  buildingYear: number | null;
  operationYear: number | null;
  electrical: ElectricalGuess;
  grounding: GroundingAssessment;
  capitalRepair: CapitalRepairInfo | null;
  management: HouseManagementCompany | null;
  managementType: string | null;
};

export function electricalGuessForYear(year: number | null): ElectricalGuess {
  if (year == null || !Number.isFinite(year) || year < 1800 || year > 2100) {
    return {
      era: "unknown",
      title: "Тип электрики пока неясен",
      description:
        "Не удалось определить год дома. Мастер Током на месте оценит щит, кабель и заземление.",
    };
  }

  if (year < 1995) {
    return {
      era: "legacy",
      title: "Старая электрика",
      description:
        "До 1995 года в типовых домах часто алюминиевая проводка, общие автоматы на этаже и нет заземления в квартире. Обновление стояков и PE обычно привязано к капремонту дома.",
    };
  }

  if (year < 2003) {
    return {
      era: "transitional",
      title: "Переходный период (1995–2002)",
      description:
        "В этот период нормы по заземлению применялись по-разному: в одних домах PE уже есть, в других — только ноль. Нужна проверка вводного кабеля в щитке.",
    };
  }

  return {
    era: "modern",
    title: "Современные нормы (с 2003 года)",
    description:
      "С 2003 года в новых домах предусмотрено заземление (PE). Если в щитке только фаза и ноль — это повод проверить ввод и этажный щит.",
  };
}

export function formatBuildingYear(year: number | null): string {
  if (year == null) return "неизвестно";
  return `${year} г.`;
}
