import { equipmentLabelForAppliance } from "@/lib/appliance-line-sync";
import { allPanelLoadsIdentified, parseLineLoads } from "@/lib/panel-identify";
import {
  analyzePanelSafety,
  safetyBadgeColors,
  type PanelSafetyAnalysis,
} from "@/lib/safety-score";
import type { Device, HomeAppliance, PanelObject } from "@/types";

export type SafetyStageId = "scheme" | "loads" | "professional";

export type SafetyStageStatus = "locked" | "available" | "done";

export type SafetyStageSnapshot = {
  id: SafetyStageId;
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  status: SafetyStageStatus;
  score: number | null;
  hint: string;
  analysis?: PanelSafetyAnalysis;
};

export type PanelSafetyStagesSnapshot = {
  stages: SafetyStageSnapshot[];
  activeStageId: SafetyStageId;
  headlineScore: number | null;
};

export const PANEL_SAFETY_STAGE_META: Array<{
  id: SafetyStageId;
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  lockedHint: string;
}> = [
  {
    id: "scheme",
    step: 1,
    title: "Схема",
    subtitle: "Цифровая схема щитка и параметры сети",
    lockedHint: "Сфотографируйте щиток и укажите фазы, мощность и землю",
  },
  {
    id: "loads",
    step: 2,
    title: "Нагрузки",
    subtitle: "Техника, свет, розетки на линиях",
    lockedHint:
      "Определите нагрузки на схеме и привяжите добавленную технику к линиям",
  },
  {
    id: "professional",
    step: 3,
    title: "Заключение",
    subtitle: "Проверка расключения электриком",
    lockedHint:
      "Нужен выезд мастера: как соединены приборы в щитке и какие кабели идут к технике",
  },
];

export const panelSafetyStagesDisclaimer =
  "Оценка строится в три этапа: сначала по схеме и параметрам сети, затем с учётом нагрузок дома, и только после проверки электрика — финальное заключение по реальной проводке.";

function railDevices(devices: Device[] | undefined): Device[] {
  return (devices ?? []).filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );
}

export function isPanelNetworkParamsReady(panel: {
  phases?: "1" | "3";
  powerKw?: string;
  hasGround?: boolean;
}): boolean {
  return (
    Boolean(panel.phases) &&
    Boolean(panel.powerKw?.trim()) &&
    panel.hasGround !== undefined
  );
}

export function isPanelSchemeStageReady(panel: {
  phases?: "1" | "3";
  powerKw?: string;
  hasGround?: boolean;
  devices?: Device[];
}): boolean {
  return isPanelNetworkParamsReady(panel) && railDevices(panel.devices).length > 0;
}

function collectLineLoadLabels(devices: Device[]): Set<string> {
  const labels = new Set<string>();
  for (const device of devices) {
    const loads = parseLineLoads(device.circuitLabel);
    for (const items of Object.values(loads)) {
      for (const item of items) {
        labels.add(item.trim().toLowerCase());
      }
    }
  }
  return labels;
}

export function appliancesLinkedToLines(
  devices: Device[],
  appliances: HomeAppliance[],
): boolean {
  if (appliances.length === 0) return true;
  const loads = collectLineLoadLabels(devices);
  return appliances.every((appliance) => {
    const label = equipmentLabelForAppliance(appliance).trim().toLowerCase();
    if (!label) return false;
    if (loads.has(label)) return true;
    for (const load of loads) {
      if (load.includes(label) || label.includes(load)) return true;
    }
    return false;
  });
}

export function isPanelLoadsStageReady(
  panel: PanelObject,
  devices: Device[] = panel.devices ?? [],
): boolean {
  if (!isPanelSchemeStageReady(panel)) return false;
  const rail = railDevices(devices);
  if (!allPanelLoadsIdentified(rail)) return false;
  return appliancesLinkedToLines(rail, panel.appliances ?? []);
}

function parsePowerKw(powerKw?: string): number | undefined {
  const value = Number((powerKw ?? "").replace(",", ".").trim());
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function stageScoreBadge(score: number | null) {
  if (score == null) {
    return {
      bg: "bg-zinc-100",
      text: "text-zinc-500",
      hover: "hover:bg-zinc-200",
    };
  }
  return safetyBadgeColors(score);
}

export function buildPanelSafetyStages(input: {
  panel: PanelObject;
  devices?: Device[];
}): PanelSafetyStagesSnapshot {
  const devices = input.devices ?? input.panel.devices ?? [];
  const rail = railDevices(devices);
  const powerKw = parsePowerKw(input.panel.powerKw);
  const schemeReady = isPanelSchemeStageReady({
    ...input.panel,
    devices: rail,
  });
  const loadsReady = isPanelLoadsStageReady(input.panel, rail);
  const professionalScore =
    typeof input.panel.professionalSafety === "number"
      ? input.panel.professionalSafety
      : null;
  const professionalDone = professionalScore != null;

  const schemeAnalysis = schemeReady
    ? analyzePanelSafety(
        rail,
        input.panel.phases,
        powerKw,
        input.panel.hasGround,
        { schemeOnly: true },
      )
    : undefined;

  const loadsAnalysis =
    loadsReady && input.panel.phases && powerKw != null
      ? analyzePanelSafety(
          rail,
          input.panel.phases,
          powerKw,
          input.panel.hasGround,
        )
      : undefined;

  const loadsScore =
    loadsAnalysis?.score ??
    (loadsReady && typeof input.panel.safety === "number"
      ? input.panel.safety
      : null);

  const stages: SafetyStageSnapshot[] = PANEL_SAFETY_STAGE_META.map((meta) => {
    if (meta.id === "scheme") {
      const score = schemeAnalysis?.score ?? null;
      return {
        id: meta.id,
        step: meta.step,
        title: meta.title,
        subtitle: meta.subtitle,
        status: score != null ? "done" : schemeReady ? "available" : "locked",
        score,
        hint: score != null ? "Оценка по составу щитка и параметрам сети" : meta.lockedHint,
        analysis: schemeAnalysis,
      };
    }
    if (meta.id === "loads") {
      const score = loadsScore;
      const status: SafetyStageStatus = score != null
        ? "done"
        : !schemeReady
          ? "locked"
          : loadsReady
            ? "available"
            : "locked";
      return {
        id: meta.id,
        step: meta.step,
        title: meta.title,
        subtitle: meta.subtitle,
        status,
        score,
        hint:
          score != null
            ? "С учётом техники, света, розеток и проверки линий"
            : !schemeReady
              ? "Сначала завершите этап «Схема»"
              : meta.lockedHint,
        analysis: loadsAnalysis,
      };
    }
    return {
      id: meta.id,
      step: meta.step,
      title: meta.title,
      subtitle: meta.subtitle,
      status: professionalDone
        ? "done"
        : loadsReady && (loadsAnalysis?.score ?? input.panel.safety) != null
          ? "available"
          : "locked",
      score: professionalDone ? professionalScore : null,
      hint: professionalDone
        ? "Профессиональное заключение после проверки на объекте"
        : meta.lockedHint,
    };
  });

  const activeStageId =
    stages.find((stage) => stage.status !== "done")?.id ??
    stages[stages.length - 1]?.id ??
    "scheme";

  const headlineScore =
    stages
      .map((stage) => stage.score)
      .filter((score): score is number => score != null)
      .at(-1) ??
    stages.find((stage) => stage.id === "scheme")?.score ??
    null;

  return { stages, activeStageId, headlineScore };
}

export { stageScoreBadge };
