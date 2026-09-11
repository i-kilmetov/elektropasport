export type GroundingExpectation =
  | "none"
  | "uncertain"
  | "expected"
  | "unknown";

export type GroundingAssessment = {
  expectation: GroundingExpectation;
  title: string;
  summary: string;
};

export type AssessGroundingInput = {
  year: number | null;
  /** Year electrical in-building networks were overhauled (done). */
  electricalLastYear?: number | null;
  /** Next planned electrical overhaul year. */
  electricalNextYear?: number | null;
};

/** Grounding norms by construction year (typical RF practice). */
export function groundingExpectationForYear(
  year: number | null,
): GroundingExpectation {
  if (year == null || !Number.isFinite(year) || year < 1800 || year > 2100) {
    return "unknown";
  }
  if (year < 1995) return "none";
  if (year < 2003) return "uncertain";
  return "expected";
}

/**
 * Grounding guess: year rules + Reform GKH electrical overhaul.
 * Pre-1995 + done electrical kapremont → treat grounding as present.
 */
export function assessGroundingForYear(
  yearOrInput: number | null | AssessGroundingInput,
): GroundingAssessment {
  const input: AssessGroundingInput =
    yearOrInput != null && typeof yearOrInput === "object"
      ? yearOrInput
      : { year: yearOrInput ?? null };

  const year = input.year;
  const last = input.electricalLastYear ?? null;
  const next = input.electricalNextYear ?? null;
  const base = groundingExpectationForYear(year);

  if (base === "none" && last != null) {
    return {
      expectation: "expected",
      title: "Заземление, скорее всего, есть",
      summary: `Дом построен до 1995 года, но сети электроснабжения уже капитально ремонтировали (${last} г.) — обычно после такого ремонта появляется PE. Точный ответ — по вводному кабелю в щитке.`,
    };
  }

  if (base === "none" && next != null) {
    return {
      expectation: "none",
      title: "Заземления, скорее всего, нет",
      summary: `В домах до 1995 года PE обычно не было. Капремонт сетей электроснабжения в программе на ${next} год — после него заземление часто появляется.`,
    };
  }

  if (base === "uncertain" && last != null) {
    return {
      expectation: "expected",
      title: "Заземление, скорее всего, есть",
      summary: `Дом переходного периода (1995–2002), а сети электроснабжения уже ремонтировали (${last} г.) — после такого ремонта обычно есть PE. Проверьте жёлто-зелёную жилу на вводе.`,
    };
  }

  switch (base) {
    case "none":
      return {
        expectation: base,
        title: "Заземления, скорее всего, нет",
        summary:
          "В домах, построенных до 1995 года, PE-шина и заземление розеток обычно не предусмотрены. Если был капремонт сетей электроснабжения — картина может быть другой.",
      };
    case "uncertain":
      return {
        expectation: base,
        title: "Заземление может быть",
        summary:
          "Для домов 1995–2002 годов нормы применялись неодинаково: где-то PE уже есть, где-то только ноль. Точный ответ — по вводному кабелю в щитке.",
      };
    case "expected":
      return {
        expectation: base,
        title: "Заземление должно быть",
        summary:
          "В домах с 2003 года заземление (жёлто-зелёная жила PE) предусмотрено нормами. Если в щитке её нет — это повод проверить ввод и этажный щит.",
      };
    default:
      return {
        expectation: "unknown",
        title: "Нужна проверка на месте",
        summary:
          "Год постройки не определили — мастер посмотрит вводной кабель и щиток и скажет, есть ли заземление.",
      };
  }
}
