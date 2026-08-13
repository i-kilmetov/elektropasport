"use client";

import { useMemo, useState } from "react";
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
import { hapticNotification } from "@/lib/haptics";
import { getTelegramProfileInfo, getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  saveUserProfile,
  type UserGender,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

const genderOptions: Array<{ id: UserGender; label: string }> = [
  { id: "male", label: "Мужской" },
  { id: "female", label: "Женский" },
  { id: "unspecified", label: "Не указывать" },
];

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

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const telegram = useMemo(() => getTelegramProfileInfo(), []);
  const displayName = useMemo(() => getTelegramUserName(), []);
  const initial = useMemo(() => getUserProfile(), []);

  const [birthDate, setBirthDate] = useState(initial.birthDate ?? "");
  const [gender, setGender] = useState<UserGender | "">(initial.gender ?? "");
  const [digits, setDigits] = useState(initial.phoneDigits ?? "");
  const [avatarId, setAvatarId] = useState<AvatarId>(
    isAvatarId(initial.avatarId) ? initial.avatarId : "circle",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const phoneDisplay = useMemo(() => formatPhoneDigits(digits), [digits]);

  const saveAndExit = () => {
    saveUserProfile({
      birthDate: birthDate || undefined,
      gender: gender || undefined,
      phoneDigits: digits || undefined,
      avatarId,
    });
    hapticNotification("success");
    setSaveFlash(true);
    window.setTimeout(() => {
      onBack();
    }, 900);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saveFlash}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900 disabled:opacity-40"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">
          Личный кабинет
        </h1>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        <GlassCard className="flex items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-black/8 bg-zinc-100 transition-transform active:scale-95"
            aria-label="Сменить иконку профиля"
          >
            <AvatarIcon id={avatarId} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold text-zinc-900">
              {displayName}
            </h2>
            {telegram.username && (
              <p className="truncate text-[14px] text-zinc-500">
                @{telegram.username}
              </p>
            )}
          </div>
        </GlassCard>

        <div>
          <h3 className="mb-2 text-[14px] font-medium text-zinc-600">
            Дополнительно
          </h3>
          <GlassCard className="space-y-4 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-zinc-500">
                Дата рождения
              </span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none focus:border-zinc-300"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-[13px] text-zinc-500">Пол</span>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGender(option.id)}
                    className={`rounded-[14px] border px-2 py-2.5 text-[13px] font-medium transition-colors ${
                      gender === option.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/8 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[13px] text-zinc-500">
                Номер телефона
              </span>
              <span className="flex h-12 items-center gap-2 rounded-[16px] border border-black/8 bg-zinc-50 px-3 focus-within:border-zinc-300">
                <Phone className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="text-[15px] font-medium text-zinc-700">+7</span>
                <input
                  inputMode="numeric"
                  value={phoneDisplay}
                  onChange={(e) => {
                    setDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  placeholder="999 000-00-00"
                  className="h-full flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
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

      <div className="mt-auto pt-2">
        <Button
          className="w-full"
          disabled={saveFlash}
          onClick={saveAndExit}
        >
          Сохранить и выйти
        </Button>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <AvatarPickerSheet
            selected={avatarId}
            onSelect={setAvatarId}
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
                <p className="mt-1 text-[13px] text-zinc-500">
                  Возвращаем на главную…
                </p>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
