import type { GroundingAssessment, GroundingExpectation } from "@/lib/grounding-assessment";

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

/** Persisted on panel after address lookup on scheme page. */
export type PanelHouseSnapshot = {
  city: string;
  address: string;
  buildingYear: number | null;
  operationYear?: number | null;
  groundingExpectation: GroundingExpectation;
  groundingTitle: string;
  groundingSummary: string;
  capitalRepairMessage?: string | null;
  capitalRepairStartYear?: number | null;
  capitalRepairEndYear?: number | null;
  dataSource?: string | null;
};

export type HouseInsight = {
  address: string;
  city: string | null;
  fiasId: string | null;
  buildingYear: number | null;
  operationYear: number | null;
  electrical: ElectricalGuess;
  grounding: GroundingAssessment;
  /** @deprecated Kept for payload compatibility; always null. */
  capitalRepair: null;
  /** @deprecated Kept for payload compatibility; always null. */
  management: HouseManagementCompany | null;
  managementType: string | null;
  /** Source label when building year was resolved (e.g. DaData). */
  dataSource?: string | null;
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
        "До 1995 года в типовых домах часто алюминиевая проводка, общие автоматы на этаже и нет заземления в квартире.",
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

export function houseInsightToPanelSnapshot(
  insight: HouseInsight,
): PanelHouseSnapshot {
  return {
    city: insight.city ?? "Москва",
    address: insight.address,
    buildingYear: insight.buildingYear,
    operationYear: insight.operationYear,
    groundingExpectation: insight.grounding.expectation,
    groundingTitle: insight.grounding.title,
    groundingSummary: insight.grounding.summary,
    capitalRepairMessage: null,
    capitalRepairStartYear: null,
    capitalRepairEndYear: null,
    dataSource: insight.dataSource ?? null,
  };
}

export function groundingToHasGround(
  expectation: GroundingExpectation,
): boolean | undefined {
  if (expectation === "expected") return true;
  if (expectation === "none") return false;
  return undefined;
}

export function formatBuildingYear(year: number | null): string {
  if (year == null) return "неизвестно";
  return `${year} г.`;
}
