import { equipmentLabelForAppliance } from "@/lib/appliance-line-sync";
import { panelSupportsHomeAppliances } from "@/lib/panel-list-meta";
import type {
  AiConsultationRecord,
  HomeAppliance,
  HomeApplianceKind,
  HomeListItem,
  PanelObject,
} from "@/types";

export type HelpProblemOption = {
  id: string;
  label: string;
};

export type HelpLocation = "at_panel" | "elsewhere";
export type HelpCategory = "electrical" | "appliance_repair";

export type HelpElectricalContext = {
  panelId: string;
  panelTitle: string;
  panelAddress?: string;
  panelCity?: string;
  location: HelpLocation;
  category: HelpCategory;
  applianceId?: string;
  applianceLabel?: string;
  problemId: string;
  problemLabel: string;
  customProblem?: string;
};

export const PANEL_ELECTRICAL_PROBLEMS: HelpProblemOption[] = [
  { id: "no_light", label: "Нет света в комнате или части квартиры" },
  { id: "breaker_trips", label: "Выбивает автомат или УЗО" },
  { id: "spark_outlet", label: "Искрит розетка, выключатель или автомат" },
  { id: "burning_smell", label: "Запах гари от щитка или проводки" },
  { id: "add_line", label: "Нужна новая линия или группа" },
  { id: "rcd_issue", label: "Не работает УЗО или дифавтомат" },
  { id: "grounding", label: "Пробивает на корпус, проблема с заземлением" },
  {
    id: "panel_wiring_check",
    label: "Проверка расключения щитка и наклеек на автоматы",
  },
  { id: "panel_upgrade", label: "Старый щиток — нужна замена или модернизация" },
  { id: "input_breaker", label: "Часто отключается вводной автомат" },
  { id: "low_voltage", label: "Просадка или скачки напряжения" },
  { id: "other", label: "Другое" },
];

const GENERIC_APPLIANCE_PROBLEMS: HelpProblemOption[] = [
  { id: "no_power", label: "Не включается" },
  { id: "not_working", label: "Не выполняет основную функцию" },
  { id: "error_code", label: "Ошибка на дисплее или индикаторе" },
  { id: "noise_smell", label: "Странные звуки или запах" },
  { id: "leak", label: "Подтекает или протекает" },
  { id: "trips_breaker", label: "При включении выбивает автомат" },
  { id: "other", label: "Другое" },
];

const APPLIANCE_PROBLEMS: Partial<
  Record<HomeApplianceKind, HelpProblemOption[]>
> = {
  washer: [
    { id: "no_start", label: "Не включается или не запускается программа" },
    { id: "no_drain", label: "Не сливает или не набирает воду" },
    { id: "vibration", label: "Сильно вибрирует или скрипит" },
    { id: "leak", label: "Течёт" },
    { id: "error_code", label: "Ошибка на дисплее" },
    { id: "other", label: "Другое" },
  ],
  dishwasher: [
    { id: "no_start", label: "Не включается или не запускается цикл" },
    { id: "no_drain", label: "Не сливает воду" },
    { id: "poor_wash", label: "Плохо моет посуду" },
    { id: "leak", label: "Подтекает" },
    { id: "error_code", label: "Ошибка на дисплее" },
    { id: "other", label: "Другое" },
  ],
  boiler: [
    { id: "no_hot_water", label: "Не греет воду" },
    { id: "no_power", label: "Не включается" },
    { id: "leak", label: "Течёт" },
    { id: "trips_breaker", label: "Выбивает автомат при включении" },
    { id: "error_code", label: "Ошибка на дисплее" },
    { id: "other", label: "Другое" },
  ],
  fridge: [
    { id: "not_cooling", label: "Не охлаждает или не морозит" },
    { id: "noise", label: "Громко работает или постоянно включается" },
    { id: "leak", label: "Подтекает" },
    { id: "no_power", label: "Не включается" },
    { id: "other", label: "Другое" },
  ],
  oven: [
    { id: "not_heating", label: "Не нагревается" },
    { id: "uneven", label: "Неравномерно запекает" },
    { id: "no_power", label: "Не включается" },
    { id: "error_code", label: "Ошибка на дисплее" },
    { id: "other", label: "Другое" },
  ],
  hob: [
    { id: "not_heating", label: "Не нагревается одна или несколько зон" },
    { id: "no_power", label: "Не включается" },
    { id: "error_code", label: "Ошибка на дисплее" },
    { id: "trips_breaker", label: "Выбивает автомат" },
    { id: "other", label: "Другое" },
  ],
  ac: [
    { id: "not_cooling", label: "Не охлаждает или не греет" },
    { id: "noise", label: "Шумит или течёт конденсат" },
    { id: "no_start", label: "Не запускается" },
    { id: "error_code", label: "Ошибка на дисплее" },
    { id: "other", label: "Другое" },
  ],
  microwave: [
    { id: "not_heating", label: "Не греет" },
    { id: "no_power", label: "Не включается" },
    { id: "spark", label: "Искрит внутри" },
    { id: "other", label: "Другое" },
  ],
  dryer: [
    { id: "not_drying", label: "Не сушит" },
    { id: "no_start", label: "Не запускается" },
    { id: "overheat", label: "Перегревается или пахнет гарью" },
    { id: "other", label: "Другое" },
  ],
};

export function listHelpElectricalPanels(items: HomeListItem[]): PanelObject[] {
  return items.filter(
    (item): item is PanelObject =>
      item.kind === "panel" && !item.noPanelSetupId,
  );
}

export function panelHasHelpAppliances(panel: PanelObject): boolean {
  return (
    panelSupportsHomeAppliances(panel) &&
    (panel.appliances?.length ?? 0) > 0
  );
}

export function getApplianceProblems(
  kind: HomeApplianceKind,
): HelpProblemOption[] {
  return APPLIANCE_PROBLEMS[kind] ?? GENERIC_APPLIANCE_PROBLEMS;
}

export function buildHelpElectricalAiPrompt(
  context: HelpElectricalContext,
): string {
  const problem = context.customProblem?.trim() || context.problemLabel;
  const lines = [
    "Пользователь обратился в сервис Током за помощью.",
    `Щиток: ${context.panelTitle}.`,
  ];
  if (context.panelAddress) {
    lines.push(`Адрес объекта: ${context.panelAddress}.`);
  }
  if (context.location === "at_panel") {
    lines.push(
      context.category === "appliance_repair"
        ? `Нужна помощь с ремонтом техники: ${context.applianceLabel ?? "техника"}.`
        : "Нужна помощь с электрикой на объекте, где установлен этот щиток.",
    );
  } else if (context.category === "appliance_repair") {
    lines.push(
      `Нужна помощь с ремонтом техники по другому адресу: ${context.applianceLabel ?? "техника"}.`,
    );
  } else {
    lines.push("Нужна помощь с электрикой в другом месте.");
  }
  lines.push(`Проблема: ${problem}.`);
  lines.push(
    "Ответь по-русски: в чём может быть причина, что можно безопасно проверить самому, и когда нужен мастер. Без markdown и списков с маркерами — короткими абзацами.",
  );
  return lines.join("\n");
}

export function buildAiConsultationTopicLabel(
  context: HelpElectricalContext,
): string {
  if (context.category === "appliance_repair") {
    return context.applianceLabel ?? "Ремонт техники";
  }
  return "Электрика";
}

export function buildAiConsultationSubtitle(
  context: HelpElectricalContext,
): string {
  return `Консультация · ${buildAiConsultationTopicLabel(context)}`;
}

export function buildAiConsultationRecord(
  context: HelpElectricalContext,
  aiReply: string,
): AiConsultationRecord {
  return {
    category: context.category,
    topicLabel: buildAiConsultationTopicLabel(context),
    problemLabel: context.customProblem?.trim() || context.problemLabel,
    customProblem: context.customProblem,
    aiReply,
    panelId: context.panelId,
    panelTitle: context.panelTitle,
  };
}

export function buildHelpElectricalContext(input: {
  panel?: PanelObject | null;
  city?: string | null;
  address?: string | null;
  location: HelpLocation;
  category: HelpCategory;
  appliance?: HomeAppliance;
  applianceLabel?: string;
  problem: HelpProblemOption;
  customProblem?: string;
}): HelpElectricalContext {
  const panel = input.panel ?? null;
  return {
    panelId: panel?.id ?? "",
    panelTitle: panel?.title ?? "Другой адрес",
    panelAddress:
      input.address?.trim() ||
      panel?.houseSnapshot?.address ||
      panel?.address,
    panelCity: input.city?.trim() || panel?.houseSnapshot?.city,
    location: input.location,
    category: input.category,
    applianceId: input.appliance?.id,
    applianceLabel:
      input.applianceLabel?.trim() ||
      (input.appliance ? equipmentLabelForAppliance(input.appliance) : undefined),
    problemId: input.problem.id,
    problemLabel: input.problem.label,
    customProblem: input.customProblem,
  };
}
