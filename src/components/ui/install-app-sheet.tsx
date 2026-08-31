"use client";

import { motion } from "framer-motion";
import { Bell, Share, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { AndroidIcon, AppleIcon } from "@/components/icons/platform-icons";

export type InstallAppPlatform = "ios" | "android";

const COPY: Record<
  InstallAppPlatform,
  {
    title: string;
    unavailable: string;
    installTitle: string;
    installSteps: string[];
    pushTitle: string;
    pushSteps: string[];
  }
> = {
  ios: {
    title: "Приложение для iPhone",
    unavailable:
      "Нативное приложение для iPhone временно недоступно в App Store.",
    installTitle: "Как добавить веб-приложение на экран «Домой»",
    installSteps: [
      "Откройте tokom.ru в Safari (не в Chrome или Telegram).",
      "Нажмите «Поделиться» — квадрат со стрелкой вверх внизу экрана.",
      "Выберите «На экран „Домой“».",
      "Нажмите «Добавить».",
    ],
    pushTitle: "Как включить push-уведомления",
    pushSteps: [
      "Откройте Током иконкой с экрана «Домой» (не через вкладку Safari).",
      "Войдите через Telegram в личном кабинете.",
      "Личный кабинет → «Уведомления» → включите переключатель.",
      "Разрешите уведомления в системном окне iOS.",
    ],
  },
  android: {
    title: "Приложение для Android",
    unavailable:
      "Нативное приложение для Android временно недоступно в Google Play.",
    installTitle: "Как установить веб-приложение",
    installSteps: [
      "Откройте tokom.ru в Chrome.",
      "Меню ⋮ → «Установить приложение» или «Добавить на главный экран».",
      "Подтвердите установку.",
    ],
    pushTitle: "Как включить push-уведомления",
    pushSteps: [
      "Откройте Током в Chrome или с иконки на главном экране.",
      "Войдите через Telegram в личном кабинете.",
      "Личный кабинет → «Уведомления» → включите переключатель.",
      "Разрешите уведомления в системном окне Android.",
    ],
  },
};

export function InstallAppSheet({
  platform,
  onClose,
}: {
  platform: InstallAppPlatform;
  onClose: () => void;
}) {
  const copy = COPY[platform];
  const PlatformIcon = platform === "ios" ? AppleIcon : AndroidIcon;

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto max-h-[min(88vh,720px)] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <PlatformIcon className="text-zinc-300" />
              <h2 className="ty-heading">{copy.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="rounded-[16px] border border-zinc-200 bg-zinc-50 px-4 py-3 ty-note text-zinc-700">
            {copy.unavailable}
          </p>

          <section className="mt-5">
            <div className="flex items-center gap-2 ty-subtitle text-zinc-800">
              <Share className="h-4 w-4 text-zinc-500" />
              {copy.installTitle}
            </div>
            <ol className="mt-2 list-decimal space-y-2 pl-5 ty-note text-zinc-600">
              {copy.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="mt-5">
            <div className="flex items-center gap-2 ty-subtitle text-zinc-800">
              <Bell className="h-4 w-4 text-zinc-500" />
              {copy.pushTitle}
            </div>
            <ol className="mt-2 list-decimal space-y-2 pl-5 ty-note text-zinc-600">
              {copy.pushSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
