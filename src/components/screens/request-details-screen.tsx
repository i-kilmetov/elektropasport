"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { ConsultationIcon } from "@/components/icons/consultation-icon";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
import { Button } from "@/components/ui/button";
import { MasterVisitConfirmStep } from "@/components/ui/help-electrical-wizard-sheet";
import { GlassCard } from "@/components/ui/glass-card";
import { AddressSuggestField } from "@/components/ui/address-suggest-field";
import { Progress } from "@/components/ui/progress";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
import { cn } from "@/lib/utils";
import { isMoscow } from "@/lib/lead-services";
import type { InstallRequest, InstallRequestStatus } from "@/types";
import {
  installStatusLabels,
  installStatusProgress,
  installStatusSteps,
  installStatusTone,
  isStandaloneAiConsultation,
} from "@/types";

function NameDialog({
  title,
  initialValue,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  initialValue: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
      >
        <h3 className="mb-2 ty-title">{title}</h3>
        <p className="mb-4 ty-body">
          Например: «Установка на даче», «Щиток в квартире»
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Название заявки"
          className="mb-4 h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
          }}
        />
        <div className="flex gap-3">
          <Button className="flex-1" variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatusProgress({
  status,
  dark = false,
}: {
  status: InstallRequestStatus;
  dark?: boolean;
}) {
  const closed = status === "cancelled" || status === "deleted";
  const tone = installStatusTone(status);
  const activeIndex =
    status === "new"
      ? 0
      : status === "payment"
        ? 1
        : status === "in_progress"
          ? 2
          : status === "done"
            ? 3
            : -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className={cn("ty-label", dark ? "text-white/50" : "text-zinc-500")}>
          Статус
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 ty-label",
            tone.badge,
          )}
        >
          {installStatusLabels[status]}
        </span>
      </div>

      <Progress
        value={installStatusProgress(status)}
        className={cn(closed && "opacity-40", dark && "bg-white/10")}
        indicatorClassName={tone.bar}
      />

      <div className="grid grid-cols-4 gap-1.5">
        {installStatusSteps.map((step, index) => {
          const reached = !closed && index <= activeIndex;
          const current = !closed && index === activeIndex;
          return (
            <div key={step.id} className="text-center">
              <div
                className={cn(
                  "mx-auto mb-1.5 h-2.5 w-2.5 rounded-full",
                  reached ? tone.dot : dark ? "bg-white/20" : "bg-zinc-200",
                  current &&
                    `ring-2 ${tone.ring} ring-offset-2 ${dark ? "ring-offset-[#111113]" : "ring-offset-white"}`,
                )}
              />
              <div
                className={cn(
                  "text-[10px] leading-tight",
                  current
                    ? dark
                      ? "font-medium text-white"
                      : "font-medium text-zinc-900"
                    : dark
                      ? "text-white/45"
                      : "text-zinc-500",
                )}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && "col-span-2")}>
      <div className="ty-meta">{label}</div>
      <div className="mt-0.5 ty-subtitle leading-snug text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function CollapsibleAiReply({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const previewLimit = 240;
  const trimmed = text.trim();
  const needsCollapse = trimmed.length > previewLimit;
  const preview = needsCollapse
    ? `${trimmed.slice(0, previewLimit).trimEnd()}…`
    : trimmed;

  return (
    <>
      <p className="whitespace-pre-wrap ty-body text-zinc-800">
        {expanded || !needsCollapse ? trimmed : preview}
      </p>
      {needsCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 ty-note text-zinc-600 underline underline-offset-2"
        >
          {expanded ? "Свернуть" : "Показать полностью"}
        </button>
      ) : null}
    </>
  );
}

function AiConsultationSection({
  request,
}: {
  request: InstallRequest;
}) {
  if (!request.aiConsultation) return null;
  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center gap-2 ty-label">
        <ConsultationIcon className="h-4 w-4 text-zinc-900" />
        ИИ-консультация
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailItem
          label="Тип обращения"
          value={request.aiConsultation.topicLabel}
        />
        <DetailItem
          label="Проблема"
          value={request.aiConsultation.problemLabel}
          wide
        />
      </div>
      <div className="mt-4 rounded-[16px] border border-black/8 bg-zinc-50 px-4 py-3">
        <div className="mb-2 ty-meta text-zinc-500">Ответ ИИ-консультанта</div>
        <CollapsibleAiReply text={request.aiConsultation.aiReply} />
      </div>
    </GlassCard>
  );
}

export function RequestDetailsScreen({
  request,
  onBack,
  onRename,
  onDelete,
  onUpdate,
  onOpenPanel,
  onCallMaster,
  onConfirmPayment,
  readOnly = false,
  dark = false,
}: {
  request: InstallRequest;
  onBack: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUpdate: (
    patch: Partial<
      Pick<InstallRequest, "status" | "statusLabel" | "exactAddress">
    >,
  ) => void;
  onOpenPanel?: (panelId: string) => void;
  onCallMaster?: (payload: {
    phone: string;
    name: string;
  }) => void | Promise<void>;
  onConfirmPayment?: () => void | Promise<void>;
  readOnly?: boolean;
  dark?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [masterConfirmOpen, setMasterConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [address, setAddress] = useState(request.exactAddress ?? "");
  const [addressSaved, setAddressSaved] = useState(false);
  const standaloneConsultation =
    !readOnly && isStandaloneAiConsultation(request) && Boolean(onCallMaster);
  const showStatusBlock = !isStandaloneAiConsultation(request);
  const showContactBlock = !isStandaloneAiConsultation(request);
  const needsPayment =
    !readOnly && request.status === "payment" && Boolean(onConfirmPayment);

  useEffect(() => {
    setAddress(request.exactAddress ?? "");
    setMasterConfirmOpen(false);
  }, [request.exactAddress, request.id]);

  const dwellingLabel =
    request.dwelling === "house"
      ? "Дом"
      : request.dwelling === "apartment"
        ? "Квартира"
        : null;

  const objectFields = [
    request.city && request.city !== "—"
      ? { label: "Город", value: request.city }
      : null,
    request.exactAddress
      ? { label: "Адрес", value: request.exactAddress, wide: true }
      : null,
    dwellingLabel ? { label: "Объект", value: dwellingLabel } : null,
    request.phases ? { label: "Фазы", value: request.phases } : null,
    request.powerKw
      ? { label: "Мощность", value: `${request.powerKw} кВт` }
      : null,
    request.setupTitle
      ? { label: "Задача", value: request.setupTitle, wide: true }
      : null,
    request.paymentStatus === "confirmed"
      ? {
          label: "Оплата",
          value: request.paidAmountRub
            ? `СБП · ${request.paidAmountRub.toLocaleString("ru-RU")} ₽`
            : "СБП · оплачено",
          wide: true,
        }
      : null,
  ].filter((field): field is { label: string; value: string; wide?: boolean } =>
    Boolean(field),
  );

  const saveAddress = () => {
    const next = address.trim();
    onUpdate({ exactAddress: next });
    setAddressSaved(true);
    window.setTimeout(() => setAddressSaved(false), 1600);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className={cn(
        "relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]",
        dark && "bg-[#111113] text-white",
      )}
    >
      <header className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border",
            dark
              ? "border-white/12 bg-white/8 text-white"
              : "border-black/8 bg-zinc-100 text-zinc-900",
          )}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1
          className={cn(
            "flex-1 truncate text-center ty-title",
            dark && "text-white",
          )}
        >
          {request.publicCode ?? "Детали заявки"}
        </h1>
        {readOnly ? (
          <div className="h-11 w-11" />
        ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
            aria-label="Ещё"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                className="absolute right-0 top-12 z-30 min-w-[180px] overflow-hidden rounded-[18px] border border-black/8 bg-white shadow-2xl backdrop-blur-xl"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-zinc-900 hover:bg-zinc-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 text-zinc-600" />
                  Переименовать
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-rose-600 hover:bg-zinc-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setPendingDelete(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
      </header>

      <p className="mb-4 text-center ty-note">
        {request.subtitle}
        {request.createdAt ? ` · ${request.createdAt}` : ""}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {showStatusBlock ? (
          <GlassCard
            className={cn("p-4", dark && "border-white/10 bg-white/[0.06] shadow-none")}
          >
            <StatusProgress status={request.status} dark={dark} />
            {request.status === "cancelled" && !readOnly && (
              <Button
                className="mt-4 w-full"
                variant="secondary"
                onClick={() =>
                  onUpdate({
                    status: "in_progress",
                    statusLabel: installStatusLabels.in_progress,
                  })
                }
              >
                Вернуть в работу
              </Button>
            )}
          </GlassCard>
        ) : null}

        {needsPayment ? (
          <GlassCard className="space-y-3 p-4">
            <div>
              <div className="ty-heading">Оплата выезда мастера</div>
              <p className="mt-1 ty-note">
                Мастер принял вашу заявку. Оплатите выезд, чтобы он приступил к
                работе.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={paying}
              onClick={() => {
                if (!onConfirmPayment) return;
                setPaying(true);
                void Promise.resolve(onConfirmPayment()).finally(() =>
                  setPaying(false),
                );
              }}
            >
              {paying ? "Оплата…" : "Оплатить"}
            </Button>
          </GlassCard>
        ) : null}

        {readOnly && request.status === "payment" ? (
          <GlassCard
            className={cn(
              "p-4",
              dark && "border-white/10 bg-white/[0.06] shadow-none",
            )}
          >
            <p className={cn("ty-body", dark ? "text-white/70" : "text-zinc-600")}>
              Заявка принята. Ожидаем оплату от заказчика.
            </p>
          </GlassCard>
        ) : null}

        {request.status === "new" && !readOnly && showStatusBlock ? (
          <GlassCard className="space-y-3 p-4">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <div>
                <div className="ty-heading">
                  Точный адрес
                </div>
                <p className="mt-0.5 ty-note">
                  Поможет быстрее подобрать мастера.
                </p>
              </div>
            </div>
            {isMoscow(request.city) ? (
              <AddressSuggestField
                city={request.city}
                value={address}
                onChange={setAddress}
                onSelect={(suggestion) => {
                  setAddress(suggestion.value);
                  onUpdate({ exactAddress: suggestion.value });
                  setAddressSaved(true);
                  window.setTimeout(() => setAddressSaved(false), 1600);
                }}
                placeholder="Улица, дом"
              />
            ) : (
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Улица, дом, квартира / участок"
                className="w-full resize-none rounded-[16px] border border-black/8 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
              />
            )}
            <Button
              className="w-full"
              variant="secondary"
              disabled={address.trim() === (request.exactAddress ?? "").trim()}
              onClick={saveAddress}
            >
              {addressSaved ? "Сохранено" : "Сохранить адрес"}
            </Button>
          </GlassCard>
        ) : null}

        {objectFields.length > 0 && (
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2 ty-label">
              <Building2 className="h-4 w-4 text-zinc-400" />
              Объект
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {objectFields.map((field) => (
                <DetailItem
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  wide={field.wide}
                />
              ))}
            </div>
          </GlassCard>
        )}

        {request.panelId && onOpenPanel && (
          <button
            type="button"
            onClick={() => onOpenPanel(request.panelId!)}
            className="w-full text-left"
          >
            <GlassCard className="flex items-center gap-3 p-4 transition-transform active:scale-[0.99]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
                <BreakerIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="ty-heading">
                  {request.aiConsultation?.panelTitle ?? "Щиток"}
                </div>
                <p className="ty-note">Открыть схему щитка</p>
              </div>
            </GlassCard>
          </button>
        )}

        {showContactBlock ? (
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2 ty-label">
              {request.contactMethod === "telegram" ? (
                <MessageCircle className="h-4 w-4 text-zinc-400" />
              ) : (
                <Phone className="h-4 w-4 text-zinc-400" />
              )}
              Контакт
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <DetailItem label="Имя" value={request.name} />
              <DetailItem label="Телефон" value={request.phone ?? "—"} />
              <DetailItem
                label="Как связаться"
                value={
                  request.contactMethod === "telegram"
                    ? "Telegram, иначе звонок"
                    : "Звонок"
                }
                wide
              />
            </div>
          </GlassCard>
        ) : null}

        <AiConsultationSection request={request} />
      </div>

      <div className="mt-auto space-y-2 pt-2">
        {standaloneConsultation && masterConfirmOpen && onCallMaster ? (
          <MasterVisitConfirmStep
            onBack={() => setMasterConfirmOpen(false)}
            onConfirm={onCallMaster}
          />
        ) : null}
        {standaloneConsultation && !masterConfirmOpen ? (
          <Button className="w-full" onClick={() => setMasterConfirmOpen(true)}>
            <GeminiSparkle className="h-5 w-5" />
            Вызвать мастера
          </Button>
        ) : null}
        {!masterConfirmOpen ? (
          <Button className="w-full" variant="secondary" onClick={onBack}>
            Назад к списку
          </Button>
        ) : null}
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            aria-label="Закрыть меню"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameOpen && (
          <NameDialog
            title="Переименовать заявку"
            initialValue={request.title}
            confirmLabel="Сохранить"
            onCancel={() => setRenameOpen(false)}
            onConfirm={(name) => {
              onRename(name);
              setRenameOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <UndoSnackbarHost
        action={
          pendingDelete
            ? {
                key: `delete-request-${request.id}`,
                message: "Заявка будет удалена",
                onUndo: () => setPendingDelete(false),
                onCommit: () => {
                  setPendingDelete(false);
                  onDelete();
                },
              }
            : null
        }
      />
    </motion.section>
  );
}
