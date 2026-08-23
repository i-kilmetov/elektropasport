export const SCHEME_TOUR_VERSION = "v3";

export function schemeTourSeenKey(panelId: string): string {
  return `elektropasport:scheme-tour-${SCHEME_TOUR_VERSION}:${panelId}`;
}

export function hasSeenSchemeTour(panelId?: string | null): boolean {
  if (!panelId) return false;
  try {
    return localStorage.getItem(schemeTourSeenKey(panelId)) === "1";
  } catch {
    return false;
  }
}

export function markSchemeTourSeen(panelId: string): void {
  try {
    localStorage.setItem(schemeTourSeenKey(panelId), "1");
  } catch {
    // private mode
  }
}

/** Allow the spotlight tour again after a new photo analysis. */
export function clearSchemeTourSeen(panelId: string): void {
  try {
    localStorage.removeItem(schemeTourSeenKey(panelId));
  } catch {
    // private mode
  }
}

export function shouldRunSchemeTour(
  panelId: string | null | undefined,
  force = false,
): boolean {
  if (!panelId) return false;
  if (force) return true;
  return !hasSeenSchemeTour(panelId);
}

export type SchemeTourStepId =
  | "scheme"
  | "tabs"
  | "terminals"
  | "stickers"
  | "network"
  | "safety"
  | "guide";

export type SchemeTourStep = {
  id: SchemeTourStepId;
  title: string;
  body: string;
};

export const SCHEME_TOUR_STEPS: SchemeTourStep[] = [
  {
    id: "scheme",
    title: "Цифровая копия щитка",
    body: "Это схема вашего щитка по фото: приборы на DIN-рейках в том же порядке. Нажмите на прибор, чтобы уточнить характеристики или определить, за какую линию он отвечает.",
  },
  {
    id: "tabs",
    title: "Схема и фото",
    body: "Переключайтесь между цифровой схемой и исходным снимком, чтобы сверить распознавание с реальным щитком.",
  },
  {
    id: "terminals",
    title: "Клеммы",
    body: "Включите режим клемм, чтобы наметить связи между приборами на схеме. Сейчас это доступно мастерам — остальным можно оставить заявку на доступ.",
  },
  {
    id: "stickers",
    title: "Стикеры в щиток",
    body: "Когда линии подписаны, здесь можно собрать и распечатать наклейки для автоматов — чтобы в реальном щитке было так же понятно, как на схеме.",
  },
  {
    id: "network",
    title: "Параметры сети",
    body: "Укажите фазы, мощность и наличие земли. Без этого нельзя честно оценить безопасность щитка.",
  },
  {
    id: "safety",
    title: "Безопасность щитка",
    body: "После определения нагрузок и параметров сети здесь появятся оценки по человеку, пожару и технике — и пояснения, на что обратить внимание.",
  },
  {
    id: "guide",
    title: "Что в этом щитке",
    body: "Краткий разбор типов приборов на схеме: что уже есть и чего может не хватать для более безопасной сборки.",
  },
];
