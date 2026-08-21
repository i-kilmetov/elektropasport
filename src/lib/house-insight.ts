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

  if (year < 1980) {
    return {
      era: "legacy",
      title: "Скорее всего старая электрика",
      description:
        "В домах этого периода часто стоят пробки или автоматы в общем коридоре, алюминиевая проводка и нет нормального заземления. Проблемы на стояке или в этажном щите обычно решает управляющая компания.",
    };
  }

  if (year < 2005) {
    return {
      era: "transitional",
      title: "Переходный вариант",
      description:
        "Часто смешанная схема: алюминий в стенах, частичная замена на медь, заземление может быть неполным. Если гаснет весь стояк или греется этажный щит — сначала в управляющую компанию.",
    };
  }

  return {
    era: "modern",
    title: "Скорее всего современная электрика",
    description:
      "В домах после середины 2000-х обычно многожильный медный кабель, отдельные автоматы и заземление. Если проблема в квартире — вызывайте мастера Током; если на вводе в дом или в этажном щите — обращайтесь в УК.",
  };
}

export function formatBuildingYear(year: number | null): string {
  if (year == null) return "неизвестно";
  return `${year} г.`;
}
