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

export function assessGroundingForYear(
  year: number | null,
): GroundingAssessment {
  const expectation = groundingExpectationForYear(year);

  switch (expectation) {
    case "none":
      return {
        expectation,
        title: "Заземления, скорее всего, нет",
        summary:
          "В домах, построенных до 1995 года, PE-шина и заземление розеток обычно не предусмотрены.",
      };
    case "uncertain":
      return {
        expectation,
        title: "Заземление может быть",
        summary:
          "Для домов 1995–2002 годов нормы применялись неодинаково: где-то PE уже есть, где-то только ноль. Точный ответ — по вводному кабелю в щитке.",
      };
    case "expected":
      return {
        expectation,
        title: "Заземление должно быть",
        summary:
          "В домах с 2003 года заземление (жёлто-зелёная жила PE) предусмотрено нормами. Если в щитке её нет — это повод проверить ввод и этажный щит.",
      };
    default:
      return {
        expectation,
        title: "Нужна проверка на месте",
        summary:
          "Год постройки не определён — мастер посмотрит вводной кабель и щиток и скажет, есть ли заземление.",
      };
  }
}
