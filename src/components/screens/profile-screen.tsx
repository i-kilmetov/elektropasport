"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Infinity,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
import { PushNotificationsCard } from "@/components/ui/push-notifications-card";
import {
  authHeaders,
  clearLocalAppData,
  isTelegramMiniApp,
} from "@/lib/client-auth";
import { listAchievements, type Achievement } from "@/lib/achievements";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { getTelegramProfileInfo } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  formatProfileDisplayName,
  getUserProfile,
  persistUserProfile,
  profileInitials,
  syncUserProfileFromServer,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  digits: string;
  email: string;
};

function sameDraft(a: ProfileDraft, b: ProfileDraft): boolean {
  return (
    a.firstName.trim() === b.firstName.trim() &&
    a.lastName.trim() === b.lastName.trim() &&
    a.digits === b.digits &&
    a.email.trim().toLowerCase() === b.email.trim().toLowerCase()
  );
}

export function ProfileScreen({
  onBack,
  onLoggedOut,
  panelsUnlimited = false,
  inviteCount = 0,
  panelCount = 0,
  applianceCount = 0,
  onOpenInvites,
  isAdmin = false,
  onOpenAdmin,
}: {
  onBack: () => void;
  onLoggedOut?: () => void;
  panelsUnlimited?: boolean;
  inviteCount?: number;
  panelCount?: number;
  applianceCount?: number;
  onOpenInvites?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
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
      digits: initial.phoneDigits ?? "",
      email: initial.email ?? "",
    }),
    [initial, telegramDefaults],
  );

  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [baseline, setBaseline] = useState<ProfileDraft>(initialDraft);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
          digits: profile.phoneDigits ?? "",
          email: profile.email ?? "",
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
        ...getUserProfile(),
        firstName: draft.firstName.trim() || undefined,
        lastName: draft.lastName.trim() || undefined,
        phoneDigits: draft.digits || undefined,
        email: draft.email.trim().toLowerCase() || undefined,
      });
      const next: ProfileDraft = {
        firstName: saved.firstName ?? telegramDefaults.firstName,
        lastName: saved.lastName ?? telegramDefaults.lastName,
        digits: saved.phoneDigits ?? "",
        email: saved.email ?? "",
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

  const initials = profileInitials(
    { firstName: draft.firstName, lastName: draft.lastName },
    telegram.username,
  );
  const achievements = useMemo(
    () => listAchievements({ panelCount, applianceCount, inviteCount }),
    [panelCount, applianceCount, inviteCount],
  );
  const [openAchievement, setOpenAchievement] = useState<Achievement | null>(
    null,
  );

  const logout = () => {
    clearLocalAppData();
    hapticNotification("success");
    if (onLoggedOut) {
      onLoggedOut();
      return;
    }
    window.location.assign("/");
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Не удалось удалить аккаунт");
      }
      clearLocalAppData();
      hapticNotification("success");
      setDeleteArmed(false);
      if (onLoggedOut) {
        onLoggedOut();
        return;
      }
      window.location.assign("/");
    } catch (err) {
      hapticNotification("error");
      setError(
        err instanceof Error ? err.message : "Не удалось удалить аккаунт",
      );
      setDeleteArmed(false);
    } finally {
      setDeleting(false);
    }
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
          disabled={saving || deleting}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900 disabled:opacity-40"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 ty-title">
          Личный кабинет
        </h1>
      </header>

      <div className="min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto pb-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#6B8AFD] ty-display tracking-wide text-white"
            aria-hidden
          >
            {initials || "?"}
          </div>
          {telegram.username && (
            <p className="truncate ty-body">
              @{telegram.username}
            </p>
          )}
          {!formatProfileDisplayName({
            firstName: draft.firstName,
            lastName: draft.lastName,
          }) && (
            <p className="ty-meta">Укажите имя и фамилию</p>
          )}
        </div>

        {panelsUnlimited ? (
          onOpenInvites ? (
            <button
              type="button"
              onClick={onOpenInvites}
              className="w-full text-left"
            >
              <GlassCard className="flex gap-3 p-4 transition active:scale-[0.99]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-500/12 text-emerald-700">
                  <Infinity className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 ty-heading">
                      Безлимит на щитки
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                  </div>
                  <p className="mt-1 ty-note">
                    {inviteCount > 0
                      ? `Ограничение снято. Приглашено: ${inviteCount}`
                      : "Можно добавлять любое количество щитков — ограничение снято."}
                  </p>
                </div>
              </GlassCard>
            </button>
          ) : (
            <GlassCard className="flex gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-500/12 text-emerald-700">
                <Infinity className="h-5 w-5" />
              </span>
              <div>
                <div className="ty-heading">
                  Безлимит на щитки
                </div>
                <p className="mt-1 ty-note">
                  Можно добавлять любое количество щитков — ограничение снято.
                </p>
              </div>
            </GlassCard>
          )
        ) : null}

        <div className="flex flex-col items-center">
          <div className="flex items-start justify-center pt-1">
            {achievements.map((item, index) => (
              <AchievementMedal
                key={item.id}
                item={item}
                index={index}
                raised={openAchievement?.id === item.id}
                onOpen={() => {
                  hapticImpact("light");
                  setOpenAchievement((prev) =>
                    prev?.id === item.id ? null : item,
                  );
                }}
              />
            ))}
          </div>
          <p className="mt-1.5 min-h-[2.75rem] max-w-[17.5rem] px-2 text-center">
            {openAchievement ? (
              <>
                <span className="block ty-label leading-snug">
                  {openAchievement.title}
                </span>
                <span className="mt-0.5 block ty-meta text-zinc-500">
                  {openAchievement.hint}
                </span>
              </>
            ) : null}
          </p>
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
          <h3 className="mb-2 ty-subtitle text-zinc-600">
            Дополнительно
          </h3>
          <GlassCard className="space-y-4 overflow-hidden p-4">
            <label className="block min-w-0">
              <span className="mb-1.5 block ty-note">
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
              <span className="mt-1.5 block ty-meta text-zinc-400">
                Номер может понадобиться при запросе консультации или оформлении
                заявок.
              </span>
            </label>

            <div className="block min-w-0">
              <span className="mb-1.5 block ty-note">
                Электронная почта
              </span>
              <span className="flex h-12 min-w-0 items-center gap-2 rounded-[16px] border border-black/8 bg-zinc-50 px-3 focus-within:border-zinc-300">
                <Mail className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      email: e.target.value.slice(0, 120),
                    }))
                  }
                  placeholder="name@example.com"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </span>
              <span className="mt-2 block ty-note">
                Сообщать о новых функциях и изменениях
              </span>
            </div>
          </GlassCard>
        </div>

        <PushNotificationsCard />
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
            disabled={saving || loading || deleting}
            onClick={() => void save()}
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </Button>
        )}
        {isAdmin && onOpenAdmin && (
          <button
            type="button"
            disabled={saving || deleting}
            onClick={onOpenAdmin}
            className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100 disabled:opacity-40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
              <Shield className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block ty-heading">
                Админка
              </span>
              <span className="mt-0.5 block ty-note">
                Пользователи, заявки, роли
              </span>
            </span>
          </button>
        )}
        {showLogout && (
          <Button
            className="w-full"
            variant="secondary"
            disabled={saving || deleting}
            onClick={() => setLogoutOpen(true)}
          >
            Выйти из аккаунта
          </Button>
        )}
        <Button
          className="w-full text-rose-600 hover:bg-rose-50"
          variant="secondary"
          disabled={saving || deleting}
          onClick={() => setDeleteOpen(true)}
        >
          Удалить аккаунт
        </Button>
      </div>

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
        {deleteOpen && (
          <ConfirmDialog
            title="Удалить аккаунт?"
            description="После удаления аккаунта все ваши данные, включая добавленные щитки и заявки, будут безвозвратно удалены на этом сайте."
            confirmLabel="Удалить"
            cancelLabel="Отмена"
            danger
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              setDeleteOpen(false);
              setDeleteArmed(true);
            }}
          />
        )}
      </AnimatePresence>

      </AnimatePresence>

      <UndoSnackbarHost
        action={
          deleteArmed
            ? {
                key: "delete-account",
                message: "Аккаунт будет удалён",
                onUndo: () => setDeleteArmed(false),
                onCommit: () => {
                  void deleteAccount();
                },
              }
            : null
        }
      />

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
                <p className="ty-title">
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

const MEDAL_FACE: Record<
  "locked" | "bronze" | "silver" | "gold",
  { fill: string; icon: string }
> = {
  locked: {
    fill: "radial-gradient(circle at 34% 28%, #ececee 0%, #c2c2c6 46%, #8e8e94 100%)",
    icon: "#5a5a62",
  },
  bronze: {
    fill: "radial-gradient(circle at 34% 28%, #f3c49a 0%, #c07838 48%, #7a3e16 100%)",
    icon: "#4a240c",
  },
  silver: {
    fill: "radial-gradient(circle at 34% 28%, #f6f8fb 0%, #c5ccd6 48%, #7b8492 100%)",
    icon: "#3e4650",
  },
  gold: {
    fill: "radial-gradient(circle at 34% 28%, #fff3c0 0%, #d4b12a 48%, #8a6a10 100%)",
    icon: "#4a3a08",
  },
};

const RIBBON: Record<
  Achievement["ribbon"],
  { fill: string; shadow: string }
> = {
  pe: {
    fill: "repeating-linear-gradient(90deg, #E6C200 0 3px, #1B8A3A 3px 6px)",
    shadow: "0 2px 4px rgba(27, 90, 30, 0.28)",
  },
  brown: {
    fill: "repeating-linear-gradient(90deg, #6E3A12 0 2px, #C56A28 2px 4px, #8B4E1A 4px 5px, #C56A28 5px 7px)",
    shadow: "0 2px 4px rgba(90, 40, 10, 0.28)",
  },
  black: {
    fill: "repeating-linear-gradient(90deg, #1A1A1D 0 2px, #4A4A50 2px 4px, #2A2A2E 4px 5px, #4A4A50 5px 7px)",
    shadow: "0 2px 4px rgba(0, 0, 0, 0.28)",
  },
  grey: {
    fill: "repeating-linear-gradient(90deg, #6E727A 0 2px, #C4C7CE 2px 4px, #8A8E96 4px 5px, #C4C7CE 5px 7px)",
    shadow: "0 2px 4px rgba(70, 74, 82, 0.22)",
  },
  blue: {
    fill: "repeating-linear-gradient(90deg, #163E78 0 2px, #3D8AD4 2px 4px, #1E5AA8 4px 5px, #3D8AD4 5px 7px)",
    shadow: "0 2px 4px rgba(20, 60, 120, 0.28)",
  },
};

function medalTone(
  item: Achievement,
): keyof typeof MEDAL_FACE {
  if (item.maxLevel) {
    const level = item.level ?? 0;
    if (level >= 3) return "gold";
    if (level === 2) return "silver";
    if (level === 1) return "bronze";
    return "locked";
  }
  return item.unlocked ? "gold" : "locked";
}

function AchievementMedal({
  item,
  index,
  raised,
  onOpen,
}: {
  item: Achievement;
  index: number;
  raised: boolean;
  onOpen: () => void;
}) {
  const Icon = item.icon;
  const tone = medalTone(item);
  const face = MEDAL_FACE[tone];
  const ribbon = RIBBON[item.ribbon];
  const raisedIcon = item.unlocked;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={item.title}
      aria-pressed={raised}
      className={cn(
        "relative h-[4.7rem] w-11 shrink-0 transition-transform duration-200",
        index > 0 && "-ml-3.5",
        raised && "z-30 -translate-y-0.5",
      )}
      style={{ zIndex: raised ? 30 : index + 1 }}
    >
      <span
        aria-hidden
        className="absolute top-[20px] left-1/2 h-[34px] w-[17px] -translate-x-1/2"
        style={{
          background: ribbon.fill,
          clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)",
          boxShadow: ribbon.shadow,
          opacity: item.unlocked ? 1 : 0.5,
          filter: item.unlocked ? undefined : "saturate(0.7)",
        }}
      >
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(108deg, transparent 26%, rgba(255,255,255,0.4) 46%, transparent 64%), repeating-linear-gradient(180deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 3px)",
          }}
        />
      </span>
      <span
        className="absolute top-0 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full"
        style={{
          background: face.fill,
          boxShadow: [
            "0 1px 0 rgba(255,255,255,0.45)",
            "0 3px 7px rgba(17,17,19,0.22)",
            "inset 0 1px 1px rgba(255,255,255,0.62)",
            "inset 0 -1.5px 2px rgba(0,0,0,0.32)",
            "inset 0 0 0 1.5px rgba(255,255,255,0.22)",
            "inset 0 0 0 2px rgba(0,0,0,0.22)",
          ].join(", "),
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[12%] top-[8%] h-[36%] rounded-full opacity-55"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
        <Icon
          className="relative h-[1.05rem] w-[1.05rem]"
          strokeWidth={2.2}
          color={face.icon}
          style={{
            filter: raisedIcon
              ? "drop-shadow(0.55px 0.7px 0 rgba(0,0,0,0.38)) drop-shadow(-0.55px -0.65px 0 rgba(255,255,255,0.5))"
              : "drop-shadow(0.5px 0.55px 0 rgba(255,255,255,0.42)) drop-shadow(-0.45px -0.5px 0 rgba(0,0,0,0.38))",
          }}
        />
      </span>
    </button>
  );
}
