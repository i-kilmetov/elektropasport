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
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import {
  clearBrowserSession,
  isTelegramMiniApp,
} from "@/lib/client-auth";
import { hapticNotification } from "@/lib/haptics";
import { getTelegramProfileInfo, getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  persistUserProfile,
  syncUserProfileFromServer,
  type UserGender,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

const genderOptions: Array<{ id: UserGender; label: string }> = [
  { id: "male", label: "Мужской" },
  { id: "female", label: "Женский" },
  { id: "unspecified", label: "Не указывать" },
];

type ProfileDraft = {
  displayName: string;
  birthDate: string;
  gender: UserGender | "";
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
    a.displayName.trim() === b.displayName.trim() &&
    a.birthDate === b.birthDate &&
    a.gender === b.gender &&
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
  const telegramName = useMemo(() => {
    const full = [telegram.firstName, telegram.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (full) return full;
    if (telegram.username) return telegram.username;
    return "Пользователь";
  }, [telegram]);

  const initial = useMemo(() => getUserProfile(), []);
  const initialDraft = useMemo<ProfileDraft>(
    () => ({
      displayName: initial.displayName ?? getTelegramUserName(),
      birthDate: initial.birthDate ?? "",
      gender: initial.gender ?? "",
      digits: initial.phoneDigits ?? "",
      avatarId: isAvatarId(initial.avatarId) ? initial.avatarId : "circle",
    }),
    [initial],
  );

  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [baseline, setBaseline] = useState<ProfileDraft>(initialDraft);
  const [pickerOpen, setPickerOpen] = useState(false);
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
          displayName: profile.displayName?.trim() || telegramName,
          birthDate: profile.birthDate ?? "",
          gender: profile.gender ?? "",
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
  }, [telegramName]);

  const save = async () => {
    if (saving || saveFlash || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await persistUserProfile({
        displayName: draft.displayName.trim() || undefined,
        birthDate: draft.birthDate || undefined,
        gender: draft.gender || undefined,
        phoneDigits: draft.digits || undefined,
        avatarId: draft.avatarId,
      });
      const next: ProfileDraft = {
        displayName: saved.displayName?.trim() || telegramName,
        birthDate: saved.birthDate ?? "",
        gender: saved.gender ?? "",
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
        <h1 className="text-[20px] font-semibold text-zinc-900">
          Личный кабинет
        </h1>
      </header>

      <div className="min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto pb-4">
        {loading && (
          <p className="text-[14px] text-zinc-500">Загружаем профиль…</p>
        )}
        <GlassCard className="flex items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-black/8 bg-zinc-100 transition-transform active:scale-95"
            aria-label="Сменить иконку профиля"
          >
            <AvatarIcon id={draft.avatarId} />
          </button>
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[12px] text-zinc-500">Имя</label>
            <input
              value={draft.displayName}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  displayName: e.target.value.slice(0, 80),
                }))
              }
              placeholder={telegramName}
              className="h-11 w-full min-w-0 rounded-[14px] border border-black/8 bg-zinc-50 px-3 text-[16px] font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 focus:border-zinc-300"
            />
            {telegram.username && (
              <p className="mt-1.5 truncate text-[13px] text-zinc-500">
                @{telegram.username}
              </p>
            )}
          </div>
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
            </label>

            <div>
              <span className="mb-1.5 block text-[13px] text-zinc-500">Пол</span>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, gender: option.id }))
                    }
                    className={`rounded-[14px] border px-2 py-2.5 text-[13px] font-medium transition-colors ${
                      draft.gender === option.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/8 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

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
            onClick={logout}
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
