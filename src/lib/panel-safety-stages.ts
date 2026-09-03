import { equipmentLabelForAppliance } from "@/lib/appliance-line-sync";
import { allPanelLoadsIdentified, parseLineLoads } from "@/lib/panel-identify";
import { analyzeProfessionalWiringSafety } from "@/lib/professional-wiring-safety";
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
      "Финальное заключение — после проверки расключения щитка профессиональным электриком Током",
  },
];

export const panelSafetyStagesDisclaimer =
  "Оценка строится в три этапа: сначала по схеме и параметрам сети, затем с учётом нагрузок дома, и финальное заключение после проверки расключения и кабелей.";

/** Пояснение к финальному этапу — показывается, когда этап «Нагрузки» уже оценён. */
export const wiringCheckMasterExplanation =
  "Для финальной оценки щитка нужно проверить корректность расключения. Это делают профессиональные электрики Током: мастер сверяет существующую схему соединений, указывает её в приложении и подтягивает все контакты.";

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

function collectLineLoadsByRoom(devices: Device[]): Map<string, Set<string>> {
  const byRoom = new Map<string, Set<string>>();
  for (const device of devices) {
    const loads = parseLineLoads(device.circuitLabel);
    for (const [room, items] of Object.entries(loads)) {
      const roomKey = room.trim().toLowerCase();
      if (!roomKey) continue;
      const bucket = byRoom.get(roomKey) ?? new Set<string>();
      for (const item of items) {
        bucket.add(item.trim().toLowerCase());
      }
      byRoom.set(roomKey, bucket);
    }
  }
  return byRoom;
}

function labelMatchesLoadSet(label: string, loads: Set<string>): boolean {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return false;
  if (loads.has(normalized)) return true;
  for (const load of loads) {
    if (load.includes(normalized) || normalized.includes(load)) return true;
  }
  return false;
}

export function appliancesLinkedToLines(
  devices: Device[],
  appliances: HomeAppliance[],
  applianceRooms: Record<string, string> = {},
): boolean {
  if (appliances.length === 0) return true;
  const flatLoads = collectLineLoadLabels(devices);
  const loadsByRoom = collectLineLoadsByRoom(devices);
  return appliances.every((appliance) => {
    const label = equipmentLabelForAppliance(appliance).trim().toLowerCase();
    if (!label) return false;
    if (labelMatchesLoadSet(label, flatLoads)) return true;

    const room = applianceRooms[appliance.id]?.trim().toLowerCase();
    if (!room) return false;
    const roomLoads = loadsByRoom.get(room);
    if (!roomLoads || roomLoads.size === 0) return false;
    if (labelMatchesLoadSet(label, roomLoads)) return true;
    // Room already covered on a breaker — stationary appliance is in that room.
    return true;
  });
}

export function getLoadsStageBlockers(
  panel: PanelObject,
  devices: Device[] = panel.devices ?? [],
  applianceRooms: Record<string, string> = {},
): string[] {
  const blockers: string[] = [];
  if (
    !isPanelSchemeStageReady({
      ...panel,
      devices,
    })
  ) {
    blockers.push(
      "Укажите параметры сети: число фаз, выделенную мощность и наличие земли.",
    );
  }
  const rail = railDevices(devices);
  if (!allPanelLoadsIdentified(rail)) {
    blockers.push(
      "Для каждого автомата и дифавтомата на схеме укажите помещения и нагрузки.",
    );
  }
  const unlinked = (panel.appliances ?? []).filter((appliance) => {
    const label = equipmentLabelForAppliance(appliance).trim().toLowerCase();
    if (!label) return true;
    const flatLoads = collectLineLoadLabels(rail);
    if (labelMatchesLoadSet(label, flatLoads)) return false;
    const room = applianceRooms[appliance.id]?.trim().toLowerCase();
    if (!room) return true;
    const roomLoads = collectLineLoadsByRoom(rail).get(room);
    return !roomLoads || roomLoads.size === 0;
  });
  if (unlinked.length > 0) {
    blockers.push(
      unlinked.length === 1
        ? "Привяжите добавленную технику к линиям: укажите её в нагрузках нужной комнаты или пройдите «Определить линии»."
        : `Привяжите ${unlinked.length} единицы техники к линиям — укажите их в нагрузках нужных комнат.`,
    );
  }
  return blockers;
}

export function isPanelLoadsStageReady(
  panel: PanelObject,
  devices: Device[] = panel.devices ?? [],
  applianceRooms: Record<string, string> = {},
): boolean {
  if (!isPanelSchemeStageReady(panel)) return false;
  const rail = railDevices(devices);
  if (!allPanelLoadsIdentified(rail)) return false;
  return appliancesLinkedToLines(rail, panel.appliances ?? [], applianceRooms);
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
  applianceRooms?: Record<string, string>;
}): PanelSafetyStagesSnapshot {
  const devices = input.devices ?? input.panel.devices ?? [];
  const rail = railDevices(devices);
  const applianceRooms = input.applianceRooms ?? {};
  const powerKw = parsePowerKw(input.panel.powerKw);
  const schemeReady = isPanelSchemeStageReady({
    ...input.panel,
    devices: rail,
  });
  const loadsReady = isPanelLoadsStageReady(input.panel, rail, applianceRooms);
  const loadsBlockers = loadsReady
    ? []
    : getLoadsStageBlockers(input.panel, rail, applianceRooms);
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

  const professionalAnalysis = professionalDone
    ? analyzeProfessionalWiringSafety({
        devices: input.panel.devices ?? rail,
        wires: input.panel.wires ?? [],
        phases: input.panel.phases,
        powerKw,
        hasGround: input.panel.hasGround,
        loadsScore,
      })
    : undefined;

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
              : loadsBlockers[0] ?? meta.lockedHint,
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
      analysis: professionalAnalysis
        ? {
            ...professionalAnalysis,
            score: professionalScore ?? professionalAnalysis.score,
          }
        : undefined,
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

export function getLastCompletedSafetyStage(
  snapshot: PanelSafetyStagesSnapshot,
): SafetyStageSnapshot | null {
  for (let i = snapshot.stages.length - 1; i >= 0; i--) {
    const stage = snapshot.stages[i];
    if (stage.score != null) return stage;
  }
  return null;
}

export function buildSafetyBarSheetDetails(
  snapshot: PanelSafetyStagesSnapshot,
): string[] {
  const lastCompleted = getLastCompletedSafetyStage(snapshot);
  if (!lastCompleted) {
    const copy = buildSafetyStageCardCopy(snapshot);
    return copy.details.split("\n\n").filter(Boolean);
  }

  const paragraphs = [
    lastCompleted.hint,
    ...pickAdviceLines(lastCompleted.analysis?.advice),
  ].filter(Boolean);

  const nextStage = snapshot.stages.find((stage) => stage.status !== "done");
  if (nextStage && nextStage.id !== lastCompleted.id && nextStage.hint) {
    paragraphs.push(nextStage.hint);
  }

  return paragraphs;
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
