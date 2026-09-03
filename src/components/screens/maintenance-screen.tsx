"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, EyeOff, Eye } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PushNotificationsCard } from "@/components/ui/push-notifications-card";
import { hapticSelection } from "@/lib/haptics";
import {
  INTERVAL_OPTIONS,
  RCD_TEST_INTERVAL_DAYS,
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
  type MaintenanceRcdTarget,
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
  disabled,
  onChange,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        hapticSelection();
        onChange(!on);
      }}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-45",
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

function ReminderCard({
  title,
  subtitle,
  hint,
  enabled,
  hidden,
  startDate,
  intervalDays,
  showInterval,
  busy,
  onToggleEnabled,
  onStartDateChange,
  onIntervalChange,
  onHide,
  onUnhide,
}: {
  title: string;
  subtitle: string;
  hint?: string;
  enabled: boolean;
  hidden: boolean;
  startDate: string | null;
  intervalDays: number | null;
  showInterval?: boolean;
  busy?: boolean;
  onToggleEnabled: (next: boolean) => void;
  onStartDateChange: (next: string) => void;
  onIntervalChange?: (days: number) => void;
  onHide: () => void;
  onUnhide: () => void;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="ty-heading">{title}</div>
          <p className="mt-0.5 ty-note">{subtitle}</p>
          {hint && <p className="mt-1 ty-meta text-zinc-500">{hint}</p>}
        </div>
        {!hidden && (
          <Toggle
            on={enabled}
            disabled={busy}
            label={enabled ? "Выключить напоминание" : "Включить напоминание"}
            onChange={onToggleEnabled}
          />
        )}
      </div>

      {!hidden && enabled && (
        <div className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
          <label className="block">
            <span className="ty-meta text-zinc-500">Начать с даты</span>
            <input
              type="date"
              value={startDate ?? todayLocalIso()}
              disabled={busy}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1 w-full rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2.5 ty-body outline-none focus:border-zinc-400"
            />
          </label>
          {showInterval && onIntervalChange && (
            <label className="block">
              <span className="ty-meta text-zinc-500">Периодичность</span>
              <select
                value={intervalDays ?? INTERVAL_OPTIONS[2]?.days}
                disabled={busy}
                onChange={(e) => onIntervalChange(Number(e.target.value))}
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
          {!showInterval && (
            <p className="ty-meta text-zinc-500">
              Раз в месяц · кнопка «Тест»
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        {hidden ? (
          <button
            type="button"
            disabled={busy}
            onClick={onUnhide}
            className="inline-flex items-center gap-1.5 ty-subtitle text-zinc-600 underline decoration-zinc-300 underline-offset-4"
          >
            <Eye className="h-3.5 w-3.5" />
            Показать
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onHide}
            className="inline-flex items-center gap-1.5 ty-subtitle text-zinc-500 underline decoration-zinc-300 underline-offset-4"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Скрыть
          </button>
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
  const rcdTargets = useMemo(() => collectRcdTestTargets(items), [items]);
  const applianceTargets = useMemo(
    () => collectApplianceServiceTargets(items),
    [items],
  );

  const [reminders, setReminders] = useState<MaintenanceReminderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
            err instanceof Error ? err.message : "Не удалось загрузить настройки",
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

  const save = async (
    targetKey: string,
    payload: Parameters<typeof saveMaintenanceReminder>[0],
  ) => {
    setBusyKey(targetKey);
    setError(null);
    try {
      const saved = await saveMaintenanceReminder(payload);
      patchLocal(saved);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const rcdVisible = rcdTargets.filter((t) => !byKey.get(t.targetKey)?.hidden);
  const rcdHidden = rcdTargets.filter((t) => byKey.get(t.targetKey)?.hidden);
  const appVisible = applianceTargets.filter(
    (t) => !byKey.get(t.targetKey)?.hidden,
  );
  const appHidden = applianceTargets.filter(
    (t) => byKey.get(t.targetKey)?.hidden,
  );
  const hiddenCount = rcdHidden.length + appHidden.length;

  const renderRcd = (target: MaintenanceRcdTarget, hidden: boolean) => {
    const row = byKey.get(target.targetKey);
    const enabled = row?.enabled ?? false;
    const startDate = row?.startDate ?? null;
    return (
      <ReminderCard
        key={target.targetKey}
        title={target.deviceName}
        subtitle={`${target.deviceType === "rcd" ? "УЗО" : "Дифавтомат"} · ${target.panelTitle}`}
        hint="Ежемесячно нажимайте кнопку «Тест»"
        enabled={enabled}
        hidden={hidden}
        startDate={startDate}
        intervalDays={RCD_TEST_INTERVAL_DAYS}
        busy={busyKey === target.targetKey}
        onToggleEnabled={(next) =>
          void save(target.targetKey, {
            kind: "rcd_test",
            targetKey: target.targetKey,
            panelId: target.panelId,
            enabled: next,
            startDate: next ? startDate ?? todayLocalIso() : startDate,
            intervalDays: RCD_TEST_INTERVAL_DAYS,
          })
        }
        onStartDateChange={(next) =>
          void save(target.targetKey, {
            kind: "rcd_test",
            targetKey: target.targetKey,
            panelId: target.panelId,
            enabled: true,
            startDate: next,
            intervalDays: RCD_TEST_INTERVAL_DAYS,
          })
        }
        onHide={() =>
          void save(target.targetKey, {
            kind: "rcd_test",
            targetKey: target.targetKey,
            panelId: target.panelId,
            hidden: true,
            enabled: false,
          })
        }
        onUnhide={() =>
          void save(target.targetKey, {
            kind: "rcd_test",
            targetKey: target.targetKey,
            panelId: target.panelId,
            hidden: false,
          })
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
    const startDate = row?.startDate ?? null;
    const intervalDays = row?.intervalDays ?? target.defaultIntervalDays;
    return (
      <ReminderCard
        key={target.targetKey}
        title={target.title}
        subtitle={target.panelTitle}
        hint={target.hint}
        enabled={enabled}
        hidden={hidden}
        startDate={startDate}
        intervalDays={intervalDays}
        showInterval
        busy={busyKey === target.targetKey}
        onToggleEnabled={(next) =>
          void save(target.targetKey, {
            kind: "appliance_service",
            targetKey: target.targetKey,
            panelId: target.panelId,
            enabled: next,
            startDate: next ? startDate ?? todayLocalIso() : startDate,
            intervalDays,
          })
        }
        onStartDateChange={(next) =>
          void save(target.targetKey, {
            kind: "appliance_service",
            targetKey: target.targetKey,
            panelId: target.panelId,
            enabled: true,
            startDate: next,
            intervalDays,
          })
        }
        onIntervalChange={(days) =>
          void save(target.targetKey, {
            kind: "appliance_service",
            targetKey: target.targetKey,
            panelId: target.panelId,
            enabled: true,
            startDate: startDate ?? todayLocalIso(),
            intervalDays: days,
          })
        }
        onHide={() =>
          void save(target.targetKey, {
            kind: "appliance_service",
            targetKey: target.targetKey,
            panelId: target.panelId,
            hidden: true,
            enabled: false,
          })
        }
        onUnhide={() =>
          void save(target.targetKey, {
            kind: "appliance_service",
            targetKey: target.targetKey,
            panelId: target.panelId,
            hidden: false,
          })
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
          <p className="ty-note">Напоминания о кнопке «Тест» и уходе за техникой</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <PushNotificationsCard />

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
                <h2 className="ty-heading">Проверка УЗО и дифавтоматов</h2>
                <p className="mt-0.5 ty-note">
                  Раз в месяц нажимайте кнопку «Тест» на приборе
                </p>
              </div>
              {rcdVisible.length === 0 ? (
                <p className="ty-note text-zinc-500">
                  Нет приборов для показа
                </p>
              ) : (
                rcdVisible.map((t) => renderRcd(t, false))
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="ty-heading">Обслуживание техники</h2>
                <p className="mt-0.5 ty-note">
                  Чистка и уход по расписанию
                </p>
              </div>
              {appVisible.length === 0 ? (
                <p className="ty-note text-zinc-500">
                  Добавьте технику в доме — появятся напоминания об обслуживании
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
                  className="ty-subtitle text-zinc-600 underline decoration-zinc-300 underline-offset-4"
                >
                  {showHidden
                    ? "Скрыть список"
                    : `Скрытые приборы (${hiddenCount})`}
                </button>
                {showHidden && (
                  <div className="mt-3 space-y-3">
                    {rcdHidden.map((t) => renderRcd(t, true))}
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
