import { equipmentLabelForAppliance } from "@/lib/appliance-line-sync";
import { allPanelLoadsIdentified, parseLineLoads } from "@/lib/panel-identify";
import {
  analyzePanelSafety,
  safetyBadgeColors,
  safetyLabel,
  type PanelSafetyAnalysis,
  type SafetyAdviceItem,
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
    title: "Расключение",
    subtitle: "Проверка расключения и типа кабелей",
    lockedHint:
      "Финальное заключение — после проверки расключения щитка и типа кабелей к нагрузкам",
  },
];

export const panelSafetyStagesDisclaimer =
  "Оценка строится в три этапа: сначала по схеме и параметрам сети, затем с учётом нагрузок дома, и финальное заключение после проверки расключения и кабелей.";

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
        ? "Заключение по расключению щитка и типу кабелей"
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

export function areFirstTwoSafetyStagesDone(
  snapshot: PanelSafetyStagesSnapshot,
): boolean {
  const scheme = snapshot.stages.find((stage) => stage.id === "scheme");
  const loads = snapshot.stages.find((stage) => stage.id === "loads");
  return scheme?.status === "done" && loads?.status === "done";
}

export function formatSafetyScoreAssessment(score: number): string {
  const label = safetyLabel(score);
  if (score >= 80) {
    return `Сейчас ${score}% — ${label} показатель для этого этапа.`;
  }
  if (score >= 60) {
    return `Сейчас ${score}% — ${label} уровень, есть что улучшить.`;
  }
  return `Сейчас ${score}% — ${label} уровень, стоит обратить внимание на слабые места.`;
}

function pickAdviceLines(
  advice: SafetyAdviceItem[] | undefined,
  limit = 2,
): string[] {
  if (!advice?.length) return [];
  const improve = advice.filter((item) => item.kind === "improve");
  const good = advice.filter((item) => item.kind === "good");
  const picked = [...improve, ...good].slice(0, limit);
  return picked.map((item) => `${item.title}. ${item.detail}`);
}

export function buildSafetyStageCardCopy(
  snapshot: PanelSafetyStagesSnapshot,
): {
  summary: string;
  details: string;
} {
  const { stages, activeStageId, headlineScore } = snapshot;
  const scheme = stages.find((stage) => stage.id === "scheme");
  const loads = stages.find((stage) => stage.id === "loads");
  const professional = stages.find((stage) => stage.id === "professional");
  const activeStage = stages.find((stage) => stage.id === activeStageId);

  if (!scheme || !loads || !professional || !activeStage) {
    return {
      summary: "Оценка безопасности строится поэтапно.",
      details: panelSafetyStagesDisclaimer,
    };
  }

  const activeScore = activeStage.score ?? headlineScore;
  const scoreLine =
    activeScore != null ? formatSafetyScoreAssessment(activeScore) : null;
  const adviceLines = pickAdviceLines(activeStage.analysis?.advice);

  if (activeStageId === "scheme") {
    if (scheme.status === "locked") {
      return {
        summary:
          "Сначала нужна цифровая схема щитка и параметры сети — без этого оценку посчитать нельзя.",
        details: [scheme.hint, ...adviceLines].filter(Boolean).join("\n\n"),
      };
    }
    return {
      summary:
        scoreLine ??
        "Схема и параметры сети заполнены — можно получить оценку первого этапа.",
      details: [scheme.hint, ...adviceLines].filter(Boolean).join("\n\n"),
    };
  }

  if (activeStageId === "loads") {
    const schemeScore =
      scheme.score != null ? `${scheme.score}%` : "определена";
    return {
      summary:
        scoreLine ??
        (headlineScore != null
          ? `Этап «Схема» — ${schemeScore}. Следующий шаг — учесть нагрузки дома на линиях щитка.`
          : "Первый этап пройден. Следующий шаг — учесть нагрузки дома на линиях щитка."),
      details: [loads.hint, ...adviceLines].filter(Boolean).join("\n\n"),
    };
  }

  if (activeStageId === "professional") {
    const loadsScore =
      loads.score != null ? `${loads.score}%` : "определена";
    return {
      summary:
        scoreLine ??
        (headlineScore != null
          ? `Этап «Нагрузки» — ${loadsScore}. Дальше — проверка расключения щитка и типа кабелей.`
          : "Нагрузки учтены. Дальше — проверка расключения щитка и типа кабелей."),
      details: [professional.hint, ...adviceLines].filter(Boolean).join("\n\n"),
    };
  }

  const finalScore =
    professional.score ?? loads.score ?? scheme.score ?? headlineScore;
  return {
    summary:
      finalScore != null
        ? `Все этапы пройдены. ${formatSafetyScoreAssessment(finalScore)}`
        : "Все этапы оценки безопасности пройдены.",
    details: [professional.hint, ...adviceLines].filter(Boolean).join("\n\n"),
  };
}

export { stageScoreBadge };
