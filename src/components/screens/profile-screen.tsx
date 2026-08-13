"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Phone, X } from "lucide-react";
import {
  AvatarIcon,
  AVATAR_IDS,
  isAvatarId,
  type AvatarId,
} from "@/components/icons/avatar-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import {
  clearBrowserSession,
  isTelegramMiniApp,
} from "@/lib/client-auth";
import { hapticNotification } from "@/lib/haptics";
import { getTelegramProfileInfo } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  formatProfileDisplayName,
  getUserProfile,
  persistUserProfile,
  syncUserProfileFromServer,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  birthDate: string;
  digits: string;
  avatarId: AvatarId;
};

function AvatarPickerSheet({
  selected,
  onSelect,
  onClose,
}: {
  selected: AvatarId;
  onSelect: (id: AvatarId) => void;
  onClose: () => void;
}) {
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-zinc-900">
                Иконка профиля
              </h2>
              <p className="mt-0.5 text-[13px] text-zinc-500">
                Выберите схематичный аватар
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelect(id);
                  onClose();
                }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-[20px] border p-2 transition-colors",
                  selected === id
                    ? "border-zinc-900 bg-zinc-900/5 ring-2 ring-zinc-900"
                    : "border-black/8 bg-zinc-50 hover:bg-zinc-100",
                )}
                aria-label={`Аватар ${id}`}
                aria-pressed={selected === id}
              >
                <AvatarIcon id={id} className="h-full w-full" />
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}

function sameDraft(a: ProfileDraft, b: ProfileDraft): boolean {
  return (
    a.firstName.trim() === b.firstName.trim() &&
    a.lastName.trim() === b.lastName.trim() &&
    a.birthDate === b.birthDate &&
    a.digits === b.digits &&
    a.avatarId === b.avatarId
  );
}

export function ProfileScreen({
  onBack,
  onLoggedOut,
}: {
  onBack: () => void;
  onLoggedOut?: () => void;
}) {
  const showLogout = !isTelegramMiniApp();
  const telegram = useMemo(() => getTelegramProfileInfo(), []);
  const telegramDefaults = useMemo(
    () => ({
      firstName: telegram.firstName?.trim() ?? "",
      lastName: telegram.lastName?.trim() ?? "",
    }),
    [telegram],
  );

  const initial = useMemo(() => getUserProfile(), []);
  const initialDraft = useMemo<ProfileDraft>(
    () => ({
      firstName: initial.firstName ?? telegramDefaults.firstName,
      lastName: initial.lastName ?? telegramDefaults.lastName,
      birthDate: initial.birthDate ?? "",
      digits: initial.phoneDigits ?? "",
      avatarId: isAvatarId(initial.avatarId) ? initial.avatarId : "circle",
    }),
    [initial, telegramDefaults],
  );

  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [baseline, setBaseline] = useState<ProfileDraft>(initialDraft);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDisplay = useMemo(
    () => formatPhoneDigits(draft.digits),
    [draft.digits],
  );
  const dirty = !sameDraft(draft, baseline);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await syncUserProfileFromServer();
        if (cancelled) return;
        const next: ProfileDraft = {
          firstName: profile.firstName ?? telegramDefaults.firstName,
          lastName: profile.lastName ?? telegramDefaults.lastName,
          birthDate: profile.birthDate ?? "",
          digits: profile.phoneDigits ?? "",
          avatarId: isAvatarId(profile.avatarId) ? profile.avatarId : "circle",
        };
        setDraft(next);
        setBaseline(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [telegramDefaults]);

  const save = async () => {
    if (saving || saveFlash || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await persistUserProfile({
        firstName: draft.firstName.trim() || undefined,
        lastName: draft.lastName.trim() || undefined,
        birthDate: draft.birthDate || undefined,
        phoneDigits: draft.digits || undefined,
        avatarId: draft.avatarId,
      });
      const next: ProfileDraft = {
        firstName: saved.firstName ?? telegramDefaults.firstName,
        lastName: saved.lastName ?? telegramDefaults.lastName,
        birthDate: saved.birthDate ?? "",
        digits: saved.phoneDigits ?? "",
        avatarId: isAvatarId(saved.avatarId) ? saved.avatarId : draft.avatarId,
      };
      setDraft(next);
      setBaseline(next);
      hapticNotification("success");
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 1400);
    } catch (err) {
      hapticNotification("error");
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить профиль",
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearBrowserSession();
    hapticNotification("success");
    if (onLoggedOut) {
      onLoggedOut();
      return;
    }
    window.location.assign("/");
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative flex min-h-dvh min-w-0 flex-col overflow-x-hidden px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900 disabled:opacity-40"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-[20px] font-semibold text-zinc-900">
          Личный кабинет
        </h1>
      </header>

      <div className="min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto pb-4">
        {loading && (
          <p className="text-[14px] text-zinc-500">Загружаем профиль…</p>
        )}

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-black/8 bg-zinc-100 transition-transform active:scale-95"
            aria-label="Сменить иконку профиля"
          >
            <AvatarIcon id={draft.avatarId} />
          </button>
          {telegram.username && (
            <p className="truncate text-[14px] text-zinc-500">
              @{telegram.username}
            </p>
          )}
          {!formatProfileDisplayName({
            firstName: draft.firstName,
            lastName: draft.lastName,
          }) && (
            <p className="text-[13px] text-zinc-400">Укажите имя и фамилию</p>
          )}
        </div>

        <GlassCard className="overflow-hidden p-0">
          <label className="block px-4 py-3">
            <span className="sr-only">Имя</span>
            <input
              value={draft.firstName}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  firstName: e.target.value.slice(0, 64),
                }))
              }
              placeholder="Имя"
              className="h-8 w-full bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
          <div className="mx-4 border-t border-black/[0.08]" />
          <label className="block px-4 py-3">
            <span className="sr-only">Фамилия</span>
            <input
              value={draft.lastName}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  lastName: e.target.value.slice(0, 64),
                }))
              }
              placeholder="Фамилия"
              className="h-8 w-full bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </GlassCard>

        <div className="min-w-0">
          <h3 className="mb-2 text-[14px] font-medium text-zinc-600">
            Дополнительно
          </h3>
          <GlassCard className="space-y-4 overflow-hidden p-4">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[13px] text-zinc-500">
                Дата рождения
              </span>
              <input
                type="date"
                value={draft.birthDate}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, birthDate: e.target.value }))
                }
                className="h-12 w-full min-w-0 max-w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none focus:border-zinc-300"
              />
              <span className="mt-1.5 block text-[12px] leading-relaxed text-zinc-400">
                Нам интересно знать возраст наших пользователей, но со своей
                стороны мы будем стараться радовать вас в день рождения.
              </span>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-[13px] text-zinc-500">
                Номер телефона
              </span>
              <span className="flex h-12 min-w-0 items-center gap-2 rounded-[16px] border border-black/8 bg-zinc-50 px-3 focus-within:border-zinc-300">
                <Phone className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="shrink-0 text-[15px] font-medium text-zinc-700">
                  +7
                </span>
                <input
                  inputMode="numeric"
                  value={phoneDisplay}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setDraft((prev) => ({ ...prev, digits }));
                  }}
                  placeholder="999 000-00-00"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </span>
              <span className="mt-1.5 block text-[12px] leading-relaxed text-zinc-400">
                Номер может понадобиться при запросе консультации или оформлении
                заявок.
              </span>
            </label>
          </GlassCard>
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-2">
        {error && (
          <p className="text-center text-[13px] leading-relaxed text-rose-600">
            {error}
          </p>
        )}
        {dirty && (
          <Button
            className="w-full"
            disabled={saving || loading}
            onClick={() => void save()}
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </Button>
        )}
        {showLogout && (
          <Button
            className="w-full"
            variant="secondary"
            disabled={saving}
            onClick={() => setLogoutOpen(true)}
          >
            Выйти из аккаунта
          </Button>
        )}
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <AvatarPickerSheet
            selected={draft.avatarId}
            onSelect={(id) => setDraft((prev) => ({ ...prev, avatarId: id }))}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {logoutOpen && (
          <ConfirmDialog
            title="Выйти из аккаунта?"
            description="Сессия на этом устройстве завершится. Чтобы снова пользоваться сервисом в браузере, нужно будет войти через Telegram."
            confirmLabel="Выйти"
            cancelLabel="Отмена"
            danger
            onCancel={() => setLogoutOpen(false)}
            onConfirm={() => {
              setLogoutOpen(false);
              logout();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saveFlash && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-6 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="flex w-full max-w-xs flex-col items-center rounded-[24px] border border-emerald-200 bg-white px-6 py-7 text-center shadow-2xl"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <p className="text-[18px] font-semibold text-zinc-900">
                  Данные сохранены
                </p>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
