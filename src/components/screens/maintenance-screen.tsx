"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import { hapticSelection } from "@/lib/haptics";
import {
  INTERVAL_OPTIONS,
  RCD_TEST_INTERVAL_DAYS,
  type MaintenanceReminderKind,
} from "@/lib/maintenance/catalog";
import {
  fetchMaintenanceReminders,
  saveMaintenanceReminder,
  type MaintenanceReminderDto,
} from "@/lib/maintenance/client";
import {
  collectApplianceServiceTargets,
  collectRcdTestTargets,
  type MaintenanceApplianceTarget,
  type MaintenancePanelTarget,
} from "@/lib/maintenance/targets";
import type { HomeListItem } from "@/types";
import { cn } from "@/lib/utils";

function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function settingsMap(rows: MaintenanceReminderDto[]) {
  const map = new Map<string, MaintenanceReminderDto>();
  for (const row of rows) map.set(row.targetKey, row);
  return map;
}

function intervalLabel(days: number | null | undefined): string {
  if (days == null) return "Раз в месяц";
  return (
    INTERVAL_OPTIONS.find((opt) => opt.days === days)?.label ??
    `Раз в ${days} дн.`
  );
}

function Toggle({
  on,
  onChange,
  label,
  stopPropagation,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  stopPropagation?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        hapticSelection();
        onChange(!on);
      }}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        on ? "bg-[#34C759]" : "bg-zinc-300",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] block h-[27px] w-[27px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.28),0_3px_8px_rgba(0,0,0,0.12)] transition-transform duration-200",
          on && "translate-x-[20px]",
        )}
      />
    </button>
  );
}

type EditorState =
  | {
      mode: "panel";
      target: MaintenancePanelTarget;
      startDate: string;
    }
  | {
      mode: "appliance";
      target: MaintenanceApplianceTarget;
      startDate: string;
      intervalDays: number;
    };

function ReminderSettingsSheet({
  editor,
  saving,
  onClose,
  onChangeStartDate,
  onChangeInterval,
  onSave,
  onHide,
  onUnhide,
  hidden,
}: {
  editor: EditorState;
  saving: boolean;
  onClose: () => void;
  onChangeStartDate: (value: string) => void;
  onChangeInterval?: (days: number) => void;
  onSave: () => void;
  onHide: () => void;
  onUnhide: () => void;
  hidden: boolean;
}) {
  const isPanel = editor.mode === "panel";
  const title = isPanel ? editor.target.panelTitle : editor.target.title;
  const subtitle = isPanel
    ? "Проверка УЗО и дифавтоматов"
    : editor.target.panelTitle;

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="ty-title">{title}</h3>
              <p className="mt-1 ty-note">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isPanel ? (
            <p className="mb-4 ty-body text-zinc-600">
              Раз в 30 дней напомните нажать «Тест» на всех УЗО и дифавтоматах
              в этом щитке
              {editor.target.deviceCount > 1
                ? ` (${editor.target.deviceCount})`
                : ""}
              .
            </p>
          ) : (
            <p className="mb-4 ty-body text-zinc-600">{editor.target.hint}</p>
          )}

          <label className="block">
            <span className="ty-meta text-zinc-500">Начать напоминания с</span>
            <input
              type="date"
              value={editor.startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="mt-1 w-full rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2.5 ty-body outline-none focus:border-zinc-400"
            />
          </label>

          {isPanel ? (
            <p className="mt-3 ty-meta text-zinc-500">Периодичность: раз в месяц</p>
          ) : (
            <label className="mt-3 block">
              <span className="ty-meta text-zinc-500">Периодичность</span>
              <select
                value={editor.intervalDays}
                onChange={(e) => onChangeInterval?.(Number(e.target.value))}
                className="mt-1 w-full rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2.5 ty-body outline-none focus:border-zinc-400"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={hidden ? onUnhide : onHide}
              disabled={saving}
            >
              {hidden ? "Показать" : "Скрыть"}
            </Button>
            <Button className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}

function ReminderCard({
  title,
  subtitle,
  meta,
  enabled,
  hidden,
  onOpen,
  onToggleEnabled,
  onUnhide,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  enabled: boolean;
  hidden: boolean;
  onOpen: () => void;
  onToggleEnabled: (next: boolean) => void;
  onUnhide: () => void;
}) {
  return (
    <GlassCard
      className="cursor-pointer p-4 transition-colors active:bg-zinc-50"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="ty-heading">{title}</div>
          <p className="mt-0.5 ty-note">{subtitle}</p>
          {meta && <p className="mt-1 ty-meta text-zinc-500">{meta}</p>}
        </div>
        {hidden ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnhide();
            }}
            className="inline-flex items-center gap-1.5 ty-subtitle text-zinc-600"
          >
            <Eye className="h-3.5 w-3.5" />
            Показать
          </button>
        ) : (
          <Toggle
            on={enabled}
            stopPropagation
            label={enabled ? "Выключить напоминание" : "Включить напоминание"}
            onChange={onToggleEnabled}
          />
        )}
      </div>
    </GlassCard>
  );
}

export function MaintenanceScreen({
  items,
  onBack,
}: {
  items: HomeListItem[];
  onBack: () => void;
}) {
  const panelTargets = useMemo(() => collectRcdTestTargets(items), [items]);
  const applianceTargets = useMemo(
    () => collectApplianceServiceTargets(items),
    [items],
  );

  const [reminders, setReminders] = useState<MaintenanceReminderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [sheetSaving, setSheetSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchMaintenanceReminders();
        if (!cancelled) setReminders(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить настройки",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byKey = useMemo(() => settingsMap(reminders), [reminders]);

  const patchLocal = (next: MaintenanceReminderDto) => {
    setReminders((prev) => {
      const idx = prev.findIndex((r) => r.targetKey === next.targetKey);
      if (idx === -1) return [...prev, next];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  };

  const removeLocal = (targetKey: string) => {
    setReminders((prev) => prev.filter((r) => r.targetKey !== targetKey));
  };

  /** Optimistic local update, then persist in background. */
  const saveOptimistic = (
    targetKey: string,
    payload: Parameters<typeof saveMaintenanceReminder>[0],
    optimistic: MaintenanceReminderDto,
  ) => {
    const previous = byKey.get(targetKey) ?? null;
    patchLocal(optimistic);
    setError(null);
    void (async () => {
      try {
        const saved = await saveMaintenanceReminder(payload);
        patchLocal(saved);
      } catch (err) {
        if (previous) patchLocal(previous);
        else removeLocal(targetKey);
        setError(err instanceof Error ? err.message : "Не удалось сохранить");
      }
    })();
  };

  const makeOptimistic = (
    targetKey: string,
    kind: MaintenanceReminderKind,
    panelId: string,
    patch: Partial<MaintenanceReminderDto>,
  ): MaintenanceReminderDto => {
    const prev = byKey.get(targetKey);
    return {
      id: prev?.id ?? `local-${targetKey}`,
      kind,
      targetKey,
      panelId,
      enabled: patch.enabled ?? prev?.enabled ?? false,
      hidden: patch.hidden ?? prev?.hidden ?? false,
      startDate:
        patch.startDate === undefined
          ? (prev?.startDate ?? null)
          : patch.startDate,
      intervalDays:
        patch.intervalDays === undefined
          ? (prev?.intervalDays ?? null)
          : patch.intervalDays,
      lastSentAt: prev?.lastSentAt ?? null,
      updatedAt: new Date().toISOString(),
    };
  };

  const panelVisible = panelTargets.filter(
    (t) => !byKey.get(t.targetKey)?.hidden,
  );
  const panelHidden = panelTargets.filter(
    (t) => byKey.get(t.targetKey)?.hidden,
  );
  const appVisible = applianceTargets.filter(
    (t) => !byKey.get(t.targetKey)?.hidden,
  );
  const appHidden = applianceTargets.filter(
    (t) => byKey.get(t.targetKey)?.hidden,
  );
  const hiddenCount = panelHidden.length + appHidden.length;

  const openPanelEditor = (target: MaintenancePanelTarget) => {
    const row = byKey.get(target.targetKey);
    setEditor({
      mode: "panel",
      target,
      startDate: row?.startDate ?? todayLocalIso(),
    });
  };

  const openApplianceEditor = (target: MaintenanceApplianceTarget) => {
    const row = byKey.get(target.targetKey);
    setEditor({
      mode: "appliance",
      target,
      startDate: row?.startDate ?? todayLocalIso(),
      intervalDays: row?.intervalDays ?? target.defaultIntervalDays,
    });
  };

  const togglePanel = (target: MaintenancePanelTarget, next: boolean) => {
    const startDate =
      byKey.get(target.targetKey)?.startDate ?? todayLocalIso();
    saveOptimistic(
      target.targetKey,
      {
        kind: "rcd_test",
        targetKey: target.targetKey,
        panelId: target.panelId,
        enabled: next,
        startDate: next ? startDate : byKey.get(target.targetKey)?.startDate,
        intervalDays: RCD_TEST_INTERVAL_DAYS,
      },
      makeOptimistic(target.targetKey, "rcd_test", target.panelId, {
        enabled: next,
        startDate: next
          ? startDate
          : (byKey.get(target.targetKey)?.startDate ?? null),
        intervalDays: RCD_TEST_INTERVAL_DAYS,
      }),
    );
  };

  const toggleAppliance = (
    target: MaintenanceApplianceTarget,
    next: boolean,
  ) => {
    const row = byKey.get(target.targetKey);
    const startDate = row?.startDate ?? todayLocalIso();
    const intervalDays = row?.intervalDays ?? target.defaultIntervalDays;
    saveOptimistic(
      target.targetKey,
      {
        kind: "appliance_service",
        targetKey: target.targetKey,
        panelId: target.panelId,
        enabled: next,
        startDate: next ? startDate : row?.startDate,
        intervalDays,
      },
      makeOptimistic(target.targetKey, "appliance_service", target.panelId, {
        enabled: next,
        startDate: next ? startDate : (row?.startDate ?? null),
        intervalDays,
      }),
    );
  };

  const hideTarget = (
    kind: MaintenanceReminderKind,
    targetKey: string,
    panelId: string,
    hidden: boolean,
  ) => {
    saveOptimistic(
      targetKey,
      {
        kind,
        targetKey,
        panelId,
        hidden,
        enabled: hidden ? false : byKey.get(targetKey)?.enabled,
      },
      makeOptimistic(targetKey, kind, panelId, {
        hidden,
        enabled: hidden ? false : (byKey.get(targetKey)?.enabled ?? false),
      }),
    );
    if (hidden) setEditor(null);
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSheetSaving(true);
    setError(null);
    try {
      if (editor.mode === "panel") {
        const saved = await saveMaintenanceReminder({
          kind: "rcd_test",
          targetKey: editor.target.targetKey,
          panelId: editor.target.panelId,
          enabled: true,
          startDate: editor.startDate,
          intervalDays: RCD_TEST_INTERVAL_DAYS,
        });
        patchLocal(saved);
      } else {
        const saved = await saveMaintenanceReminder({
          kind: "appliance_service",
          targetKey: editor.target.targetKey,
          panelId: editor.target.panelId,
          enabled: true,
          startDate: editor.startDate,
          intervalDays: editor.intervalDays,
        });
        patchLocal(saved);
      }
      setEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSheetSaving(false);
    }
  };

  const renderPanel = (target: MaintenancePanelTarget, hidden: boolean) => {
    const row = byKey.get(target.targetKey);
    const enabled = row?.enabled ?? false;
    const devicesLabel =
      target.deviceCount === 1
        ? "1 УЗО/дифавтомат"
        : `${target.deviceCount} УЗО/дифавтомата`;
    const meta = enabled
      ? `С ${row?.startDate ?? "—"} · раз в месяц`
      : "Напоминание выключено";
    return (
      <ReminderCard
        key={target.targetKey}
        title={target.panelTitle}
        subtitle={devicesLabel}
        meta={meta}
        enabled={enabled}
        hidden={hidden}
        onOpen={() => openPanelEditor(target)}
        onToggleEnabled={(next) => togglePanel(target, next)}
        onUnhide={() =>
          hideTarget("rcd_test", target.targetKey, target.panelId, false)
        }
      />
    );
  };

  const renderAppliance = (
    target: MaintenanceApplianceTarget,
    hidden: boolean,
  ) => {
    const row = byKey.get(target.targetKey);
    const enabled = row?.enabled ?? false;
    const intervalDays = row?.intervalDays ?? target.defaultIntervalDays;
    const meta = enabled
      ? `С ${row?.startDate ?? "—"} · ${intervalLabel(intervalDays)}`
      : target.hint;
    return (
      <ReminderCard
        key={target.targetKey}
        title={target.title}
        subtitle={target.panelTitle}
        meta={meta}
        enabled={enabled}
        hidden={hidden}
        onOpen={() => openApplianceEditor(target)}
        onToggleEnabled={(next) => toggleAppliance(target, next)}
        onUnhide={() =>
          hideTarget(
            "appliance_service",
            target.targetKey,
            target.panelId,
            false,
          )
        }
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-zinc-700"
          aria-label="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="ty-title truncate">Проверка и обслуживание</h1>
          <p className="ty-note">
            Напоминания о кнопке «Тест» и уходе за техникой
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {error && (
          <p className="rounded-[16px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="ty-note text-zinc-500">Загрузка…</p>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h2 className="ty-heading">Проверка щитков</h2>
                <p className="mt-0.5 ty-note">
                  Раз в месяц — кнопка «Тест» на всех УЗО и дифавтоматах
                </p>
              </div>
              {panelVisible.length === 0 ? (
                <p className="ty-note text-zinc-500">Нет щитков для показа</p>
              ) : (
                panelVisible.map((t) => renderPanel(t, false))
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="ty-heading">Обслуживание техники</h2>
                <p className="mt-0.5 ty-note">Чистка и уход по расписанию</p>
              </div>
              {appVisible.length === 0 ? (
                <p className="ty-note text-zinc-500">
                  Добавьте технику в доме — появятся напоминания об
                  обслуживании
                </p>
              ) : (
                appVisible.map((t) => renderAppliance(t, false))
              )}
            </section>

            {hiddenCount > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowHidden((v) => !v)}
                  className="inline-flex items-center gap-1.5 ty-subtitle text-zinc-600 underline decoration-zinc-300 underline-offset-4"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  {showHidden
                    ? "Скрыть список"
                    : `Скрытые приборы (${hiddenCount})`}
                </button>
                {showHidden && (
                  <div className="mt-3 space-y-3">
                    {panelHidden.map((t) => renderPanel(t, true))}
                    {appHidden.map((t) => renderAppliance(t, true))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {editor && (
          <ReminderSettingsSheet
            editor={editor}
            saving={sheetSaving}
            hidden={Boolean(byKey.get(editor.target.targetKey)?.hidden)}
            onClose={() => setEditor(null)}
            onChangeStartDate={(value) =>
              setEditor((prev) =>
                prev ? { ...prev, startDate: value } : prev,
              )
            }
            onChangeInterval={(days) =>
              setEditor((prev) =>
                prev && prev.mode === "appliance"
                  ? { ...prev, intervalDays: days }
                  : prev,
              )
            }
            onSave={() => void saveEditor()}
            onHide={() =>
              hideTarget(
                editor.mode === "panel" ? "rcd_test" : "appliance_service",
                editor.target.targetKey,
                editor.target.panelId,
                true,
              )
            }
            onUnhide={() =>
              hideTarget(
                editor.mode === "panel" ? "rcd_test" : "appliance_service",
                editor.target.targetKey,
                editor.target.panelId,
                false,
              )
            }
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
