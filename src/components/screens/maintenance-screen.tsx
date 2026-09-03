"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
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

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
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

const fieldClassName =
  "mt-1 w-full rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2.5 ty-body outline-none focus:border-zinc-400";

function ReminderCard({
  title,
  subtitle,
  enabled,
  hidden,
  startDate,
  intervalDays,
  fixedIntervalLabel,
  onToggleEnabled,
  onChangeStartDate,
  onChangeInterval,
  onHide,
  onUnhide,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  hidden: boolean;
  startDate: string;
  intervalDays?: number;
  fixedIntervalLabel?: string;
  onToggleEnabled: (next: boolean) => void;
  onChangeStartDate: (value: string) => void;
  onChangeInterval?: (days: number) => void;
  onHide: () => void;
  onUnhide: () => void;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="ty-heading">{title}</div>
          <p className="mt-0.5 ty-note">{subtitle}</p>
        </div>
        {hidden ? (
          <button
            type="button"
            onClick={onUnhide}
            className="inline-flex items-center gap-1.5 ty-subtitle text-zinc-600"
          >
            <Eye className="h-3.5 w-3.5" />
            Показать
          </button>
        ) : (
          <Toggle
            on={enabled}
            label={enabled ? "Выключить напоминание" : "Включить напоминание"}
            onChange={onToggleEnabled}
          />
        )}
      </div>

      {!hidden && (
        <div className="mt-3 space-y-3 border-t border-black/[0.06] pt-3">
          <label className="block">
            <span className="ty-meta text-zinc-500">Начать напоминания с</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className={fieldClassName}
            />
          </label>

          {fixedIntervalLabel ? (
            <p className="ty-meta text-zinc-500">
              Периодичность: {fixedIntervalLabel}
            </p>
          ) : (
            <label className="block">
              <span className="ty-meta text-zinc-500">Периодичность</span>
              <select
                value={intervalDays}
                onChange={(e) => onChangeInterval?.(Number(e.target.value))}
                className={fieldClassName}
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={onHide}
            className="ty-meta text-zinc-500 underline decoration-zinc-300 underline-offset-2"
          >
            Скрыть из списка
          </button>
        </div>
      )}
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

  const persistPanel = (
    target: MaintenancePanelTarget,
    patch: {
      enabled?: boolean;
      startDate?: string | null;
      hidden?: boolean;
    },
  ) => {
    const row = byKey.get(target.targetKey);
    const enabled = patch.enabled ?? row?.enabled ?? false;
    const startDate =
      patch.startDate === undefined
        ? (row?.startDate ?? todayLocalIso())
        : (patch.startDate ?? todayLocalIso());
    const hidden = patch.hidden ?? row?.hidden ?? false;
    saveOptimistic(
      target.targetKey,
      {
        kind: "rcd_test",
        targetKey: target.targetKey,
        panelId: target.panelId,
        enabled: hidden ? false : enabled,
        hidden,
        startDate,
        intervalDays: RCD_TEST_INTERVAL_DAYS,
      },
      makeOptimistic(target.targetKey, "rcd_test", target.panelId, {
        enabled: hidden ? false : enabled,
        hidden,
        startDate,
        intervalDays: RCD_TEST_INTERVAL_DAYS,
      }),
    );
  };

  const persistAppliance = (
    target: MaintenanceApplianceTarget,
    patch: {
      enabled?: boolean;
      startDate?: string | null;
      intervalDays?: number;
      hidden?: boolean;
    },
  ) => {
    const row = byKey.get(target.targetKey);
    const enabled = patch.enabled ?? row?.enabled ?? false;
    const startDate =
      patch.startDate === undefined
        ? (row?.startDate ?? todayLocalIso())
        : (patch.startDate ?? todayLocalIso());
    const intervalDays =
      patch.intervalDays ?? row?.intervalDays ?? target.defaultIntervalDays;
    const hidden = patch.hidden ?? row?.hidden ?? false;
    saveOptimistic(
      target.targetKey,
      {
        kind: "appliance_service",
        targetKey: target.targetKey,
        panelId: target.panelId,
        enabled: hidden ? false : enabled,
        hidden,
        startDate,
        intervalDays,
      },
      makeOptimistic(target.targetKey, "appliance_service", target.panelId, {
        enabled: hidden ? false : enabled,
        hidden,
        startDate,
        intervalDays,
      }),
    );
  };

  const renderPanel = (target: MaintenancePanelTarget, hidden: boolean) => {
    const row = byKey.get(target.targetKey);
    const enabled = row?.enabled ?? false;
    const devicesLabel =
      target.deviceCount === 1
        ? "1 УЗО/дифавтомат"
        : `${target.deviceCount} УЗО/дифавтомата`;
    return (
      <ReminderCard
        key={target.targetKey}
        title={target.panelTitle}
        subtitle={devicesLabel}
        enabled={enabled}
        hidden={hidden}
        startDate={row?.startDate ?? todayLocalIso()}
        fixedIntervalLabel="раз в месяц"
        onToggleEnabled={(next) => persistPanel(target, { enabled: next })}
        onChangeStartDate={(value) =>
          persistPanel(target, {
            startDate: value,
          })
        }
        onHide={() => persistPanel(target, { hidden: true })}
        onUnhide={() => persistPanel(target, { hidden: false })}
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
    return (
      <ReminderCard
        key={target.targetKey}
        title={target.title}
        subtitle={target.panelTitle}
        enabled={enabled}
        hidden={hidden}
        startDate={row?.startDate ?? todayLocalIso()}
        intervalDays={intervalDays}
        onToggleEnabled={(next) => persistAppliance(target, { enabled: next })}
        onChangeStartDate={(value) =>
          persistAppliance(target, {
            startDate: value,
          })
        }
        onChangeInterval={(days) =>
          persistAppliance(target, {
            intervalDays: days,
          })
        }
        onHide={() => persistAppliance(target, { hidden: true })}
        onUnhide={() => persistAppliance(target, { hidden: false })}
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
          <h1 className="ty-title truncate">Техобслуживание</h1>
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
    </motion.div>
  );
}
