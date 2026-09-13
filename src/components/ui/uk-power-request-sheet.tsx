"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import type { PanelHouseSnapshot } from "@/lib/house-insight";
import {
  buildUkPowerRequestDraft,
  isValidEmail,
  openMailtoDraft,
  type UkPowerRequestFields,
} from "@/lib/uk-power-request";
import { cn } from "@/lib/utils";

export type UkPowerRequestContext = {
  managementName?: string | null;
  managementEmail?: string | null;
  address?: string | null;
  panelId?: string | null;
  /** Optional prefill from user profile */
  phone?: string | null;
  replyEmail?: string | null;
  fullName?: string | null;
};

function fromSnapshot(
  snapshot?: PanelHouseSnapshot | null,
): Pick<UkPowerRequestContext, "managementName" | "managementEmail" | "address"> {
  if (!snapshot) return {};
  return {
    managementName: snapshot.managementName ?? null,
    managementEmail: snapshot.managementEmail ?? null,
    address: snapshot.address ?? null,
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const className = cn(
    "w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3.5 py-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300",
    readOnly && "bg-zinc-100 text-zinc-700",
  );
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ty-label text-zinc-600">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={10}
          className={cn(className, "resize-y min-h-[180px] leading-relaxed")}
        />
      ) : (
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

export function UkPowerRequestSheet({
  open,
  onClose,
  snapshot,
  context,
}: {
  open: boolean;
  onClose: () => void;
  snapshot?: PanelHouseSnapshot | null;
  context?: UkPowerRequestContext | null;
}) {
  const base = useMemo(() => {
    const fromSnap = fromSnapshot(snapshot);
    return {
      managementName:
        context?.managementName?.trim() ||
        fromSnap.managementName?.trim() ||
        "",
      managementEmail:
        context?.managementEmail?.trim() ||
        fromSnap.managementEmail?.trim() ||
        "",
      address: context?.address?.trim() || fromSnap.address?.trim() || "",
      panelId: context?.panelId?.trim() || null,
      phone: context?.phone?.trim() || "",
      replyEmail: context?.replyEmail?.trim() || "",
      fullName: context?.fullName?.trim() || "",
    };
  }, [snapshot, context]);

  const [to, setTo] = useState(base.managementEmail);
  const [fullName, setFullName] = useState(base.fullName);
  const [address, setAddress] = useState(base.address);
  const [phone, setPhone] = useState(base.phone);
  const [replyEmail, setReplyEmail] = useState(base.replyEmail);
  const [accountNumber, setAccountNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dirtyBody, setDirtyBody] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(base.managementEmail);
    setFullName(base.fullName);
    setAddress(base.address);
    setPhone(base.phone);
    setReplyEmail(base.replyEmail);
    setAccountNumber("");
    setDirtyBody(false);
    setError(null);
    setSent(false);
    setSending(false);
  }, [open, base]);

  const fields: UkPowerRequestFields = useMemo(
    () => ({
      managementName: base.managementName,
      managementEmail: to,
      fullName,
      address,
      phone,
      replyEmail,
      accountNumber,
    }),
    [
      base.managementName,
      to,
      fullName,
      address,
      phone,
      replyEmail,
      accountNumber,
    ],
  );

  const draft = useMemo(() => buildUkPowerRequestDraft(fields), [fields]);

  useEffect(() => {
    if (!open) return;
    setSubject(draft.subject);
    if (!dirtyBody) setBody(draft.body);
  }, [open, draft.subject, draft.body, dirtyBody]);

  if (!open) return null;

  const canSubmit =
    isValidEmail(to) &&
    isValidEmail(replyEmail) &&
    fullName.trim().length > 1 &&
    address.trim().length > 3 &&
    phone.trim().length >= 5 &&
    subject.trim().length > 3 &&
    body.trim().length > 20 &&
    !sending;

  const submit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("Заполните обязательные поля и проверьте email");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/uk-power-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          replyTo: replyEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          fullName: fullName.trim(),
          address: address.trim(),
          phone: phone.trim(),
          panelId: base.panelId,
        }),
      });
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        code?: string;
        ok?: boolean;
      } | null;

      if (res.status === 503 && payload?.code === "email_not_configured") {
        openMailtoDraft({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
        });
        setSent(true);
        return;
      }

      if (!res.ok) {
        setError(payload?.error || "Не удалось отправить письмо");
        return;
      }

      setSent(true);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[94dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-zinc-500">
                <Mail className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Запрос в УК
                </span>
              </div>
              <h3 className="ty-title">Выделенная мощность</h3>
              <p className="mt-1 ty-note text-zinc-600">
                Письмо уйдёт в управляющую компанию. Ответ придёт на ваш email.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {sent ? (
            <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-50 p-4">
              <p className="ty-body text-emerald-950">
                Запрос отправлен. Ответ УК придёт на {replyEmail.trim()}.
              </p>
              <Button type="button" className="mt-4 w-full" onClick={onClose}>
                Готово
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {base.managementName ? (
                <Field
                  label="Управляющая компания"
                  value={base.managementName}
                  readOnly
                />
              ) : null}

              <Field
                label="Кому (email УК)"
                value={to}
                onChange={setTo}
                type="email"
                placeholder="uk@example.ru"
              />
              <Field
                label="Ваше ФИО"
                value={fullName}
                onChange={setFullName}
                placeholder="Иванов Иван Иванович"
              />
              <Field
                label="Адрес квартиры / дома"
                value={address}
                onChange={setAddress}
                placeholder="г. …, ул. …, д. …, кв. …"
              />
              <Field
                label="Телефон"
                value={phone}
                onChange={setPhone}
                type="tel"
                placeholder="+7 …"
              />
              <Field
                label="Email для ответа"
                value={replyEmail}
                onChange={setReplyEmail}
                type="email"
                placeholder="you@mail.ru"
              />
              <Field
                label="Лицевой счёт / договор (необязательно)"
                value={accountNumber}
                onChange={setAccountNumber}
                placeholder="Если знаете"
              />
              <Field
                label="Тема"
                value={subject}
                onChange={setSubject}
              />
              <Field
                label="Текст письма"
                value={body}
                onChange={(v) => {
                  setDirtyBody(true);
                  setBody(v);
                }}
                multiline
              />

              {error ? (
                <p className="ty-meta text-rose-600">{error}</p>
              ) : (
                <p className="ty-meta text-zinc-500">
                  Можно поправить текст перед отправкой. Если серверная почта не
                  настроена, откроется ваше почтовое приложение.
                </p>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                >
                  {sending ? "Отправляем…" : "Отправить запрос"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onClose}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
