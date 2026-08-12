"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getTelegramProfileInfo, getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  saveUserProfile,
  type UserGender,
} from "@/lib/user-profile";

const genderOptions: Array<{ id: UserGender; label: string }> = [
  { id: "male", label: "Мужской" },
  { id: "female", label: "Женский" },
  { id: "unspecified", label: "Не указывать" },
];

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const telegram = useMemo(() => getTelegramProfileInfo(), []);
  const displayName = useMemo(() => getTelegramUserName(), []);
  const initial = useMemo(() => getUserProfile(), []);

  const [birthDate, setBirthDate] = useState(initial.birthDate ?? "");
  const [gender, setGender] = useState<UserGender | "">(initial.gender ?? "");
  const [digits, setDigits] = useState(initial.phoneDigits ?? "");
  const [saved, setSaved] = useState(false);

  const phoneDisplay = useMemo(() => formatPhoneDigits(digits), [digits]);

  const save = () => {
    saveUserProfile({
      birthDate: birthDate || undefined,
      gender: gender || undefined,
      phoneDigits: digits || undefined,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[var(--accent)]">
            {telegram.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={telegram.photoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : initials ? (
              <span className="text-[20px] font-bold text-zinc-700">
                {initials}
              </span>
            ) : (
              <UserRound className="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold text-zinc-900">
              {displayName}
            </h2>
            {telegram.username && (
              <p className="truncate text-[14px] text-zinc-500">
                @{telegram.username}
              </p>
            )}
            {typeof telegram.id === "number" && (
              <p className="mt-0.5 text-[12px] text-zinc-400">
                ID {telegram.id}
              </p>
            )}
          </div>
        </GlassCard>

        <div>
          <h3 className="mb-2 text-[14px] font-medium text-zinc-600">
            Данные из Telegram
          </h3>
          <GlassCard className="space-y-3 p-4">
            <InfoRow label="Имя" value={telegram.firstName || "—"} />
            <InfoRow label="Фамилия" value={telegram.lastName || "—"} />
            <InfoRow
              label="Username"
              value={telegram.username ? `@${telegram.username}` : "—"}
            />
            <InfoRow
              label="Язык"
              value={telegram.languageCode?.toUpperCase() || "—"}
            />
          </GlassCard>
        </div>

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
                className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none focus:border-[var(--accent)]/50"
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
              <span className="flex h-12 items-center gap-2 rounded-[16px] border border-black/8 bg-zinc-50 px-3 focus-within:border-[var(--accent)]/50">
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
                Если указать телефон здесь, он подставится при оформлении заявки.
              </span>
            </label>
          </GlassCard>
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-2">
        {saved && (
          <p className="text-center text-[13px] font-medium text-emerald-600">
            Сохранено
          </p>
        )}
        <Button className="w-full" onClick={save}>
          Сохранить
        </Button>
      </div>
    </motion.section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[13px] text-zinc-500">{label}</span>
      <span className="text-right text-[14px] font-medium text-zinc-900">
        {value}
      </span>
    </div>
  );
}
