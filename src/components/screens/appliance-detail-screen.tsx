"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { AddApplianceSheet } from "@/components/screens/add-appliance-sheet";
import { AppliancePassportCard } from "@/components/screens/appliance-passport-card";
import { ApplianceBrandModelPicker } from "@/components/ui/appliance-brand-model-picker";
import { ApplianceBrandAvatar } from "@/components/ui/appliance-brand-avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { InfoDialog } from "@/components/ui/info-dialog";
import { Portal } from "@/components/ui/portal";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
import { displayApplianceManuals } from "@/lib/appliance-manuals";
import { applianceNeedsDetails } from "@/lib/appliance-line-sync";
import {
  buildApplianceSpecsSnapshot,
  isDerivedPowerSpecLabel,
} from "@/lib/appliance-specs";
import {
  applianceDisplayKindLabel,
  findCatalogModel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import type { ApplianceSpec, HomeAppliance, PanelObject } from "@/types";

function openExternalDoc(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

type SpecRow =
  | { kind: "spec"; label: string; value: string }
  | { kind: "power-missing" }
  | { kind: "power-known"; value: string };

export function ApplianceDetailScreen({
  appliance,
  panel,
  homeTitle,
  onBack,
  onReplace,
  onDelete,
}: {
  appliance: HomeAppliance;
  panel: PanelObject;
  homeTitle?: string;
  onBack: () => void;
  onReplace: (next: HomeAppliance) => void;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsHintOpen, setDetailsHintOpen] = useState(false);
  const [powerEditOpen, setPowerEditOpen] = useState(false);
  const [powerDraft, setPowerDraft] = useState("");
  const [powerError, setPowerError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const kindLabel = applianceDisplayKindLabel(appliance);
  const needsDetails = applianceNeedsDetails(appliance);
  const brand = appliance.brand?.trim();
  const model = appliance.model?.trim();

  const catalog = useMemo(
    () =>
      appliance.catalogId ? findCatalogModel(appliance.catalogId) : undefined,
    [appliance.catalogId],
  );

  const hasPower =
    appliance.powerW != null &&
    Number.isFinite(appliance.powerW) &&
    appliance.powerW > 0;

  const specRows = useMemo((): SpecRow[] => {
    const baseSpecs: ApplianceSpec[] = appliance.specs?.length
      ? appliance.specs
      : (catalog?.specs ?? []);
    const withoutPower = baseSpecs.filter(
      (spec) => !isDerivedPowerSpecLabel(spec.label),
    );
    const rows: SpecRow[] = [];
    if (hasPower) {
      rows.push({
        kind: "power-known",
        value: formatAppliancePower(appliance.powerW),
      });
    } else {
      rows.push({ kind: "power-missing" });
    }
    for (const spec of withoutPower) {
      rows.push({ kind: "spec", label: spec.label, value: spec.value });
    }
    return rows;
  }, [appliance.powerW, appliance.specs, catalog?.specs, hasPower]);

  const documents = useMemo(
    () => displayApplianceManuals(appliance.manuals),
    [appliance.manuals],
  );

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const savePower = () => {
    const n = Number(powerDraft.replace(",", ".").trim());
    if (!Number.isFinite(n) || n <= 0 || n > 50000) {
      setPowerError("Укажите мощность в ваттах, например 2000");
      return;
    }
    const watts = Math.round(n);
    const withoutPower = (appliance.specs ?? []).filter(
      (spec) => !isDerivedPowerSpecLabel(spec.label),
    );
    onReplace({
      ...appliance,
      powerW: watts,
      specs: buildApplianceSpecsSnapshot({
        powerW: watts,
        specs: withoutPower,
      }),
    });
    setPowerEditOpen(false);
    setPowerError(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative flex min-h-dvh min-w-0 flex-col overflow-x-hidden px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate ty-title">
            {homeTitle || panel.title}
          </h1>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
            aria-label="Ещё"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                className="absolute right-0 top-12 z-30 min-w-[168px] overflow-hidden rounded-[18px] border border-black/8 bg-white shadow-2xl"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-zinc-900 hover:bg-zinc-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 text-zinc-600" />
                  Изменить
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
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            <ApplianceBrandAvatar
              kind={appliance.kind}
              brandLogoUrl={appliance.brandLogoUrl}
              brand={brand}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate ty-title text-zinc-900">
                <span className="font-semibold text-zinc-500">{kindLabel}</span>
                {brand ? <> {brand}</> : null}
                {needsDetails && (
                  <button
                    type="button"
                    onClick={() => setDetailsHintOpen(true)}
                    className="ml-1.5 inline-flex h-6 w-6 translate-y-0.5 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600"
                    aria-label="Зачем указывать производителя и модель"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                )}
              </h2>
              {model && <p className="truncate ty-body">{model}</p>}
            </div>
          </div>

          {appliance.productImageUrl?.trim() ? (
            <GlassCard className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appliance.productImageUrl.trim()}
                alt={
                  brand && model
                    ? `${brand} ${model}`
                    : brand || model || kindLabel
                }
                className="mx-auto block max-h-56 w-full object-contain bg-white p-4"
                loading="lazy"
                decoding="async"
              />
            </GlassCard>
          ) : null}

          {needsDetails ? (
            <GlassCard className="p-4">
              <ApplianceBrandModelPicker
                appliance={appliance}
                onSave={onReplace}
              />
            </GlassCard>
          ) : null}

          <GlassCard className="p-4">
            <h3 className="mb-3 ty-label uppercase tracking-wide text-zinc-400">
              Характеристики
            </h3>
            <div className="divide-y divide-black/[0.06]">
              {specRows.map((row, index) => {
                if (row.kind === "power-known") {
                  return (
                    <div
                      key="power-known"
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 ty-body">Максимальная мощность</div>
                      <div className="max-w-[55%] shrink-0 text-right ty-heading">
                        {row.value}
                      </div>
                    </div>
                  );
                }
                if (row.kind === "power-missing") {
                  return (
                    <div
                      key="power-missing"
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 ty-body">Максимальная мощность</div>
                      <button
                        type="button"
                        onClick={() => {
                          setPowerDraft("");
                          setPowerError(null);
                          setPowerEditOpen(true);
                        }}
                        className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-zinc-100 px-2.5 text-[15px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800"
                        aria-label="Указать мощность"
                      >
                        ?
                      </button>
                    </div>
                  );
                }
                return (
                  <div
                    key={`${row.label}-${row.value}-${index}`}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 ty-body">{row.label}</div>
                    <div className="max-w-[55%] shrink-0 text-right ty-heading">
                      {row.value}
                    </div>
                  </div>
                );
              })}
            </div>
            {specRows.length === 1 && specRows[0]?.kind === "power-missing" ? (
              <p className="mt-3 ty-note text-zinc-500">
                Остальные характеристики не найдены. Укажите мощность, если
                знаете её — это поможет при расчёте нагрузки.
              </p>
            ) : null}
          </GlassCard>

          {documents.length > 0 ? (
            <div className="space-y-2">
              <h3 className="ty-label uppercase tracking-wide text-zinc-400">
                Документы
              </h3>
              {documents.map((doc) => (
                <button
                  key={`${doc.title}-${doc.url}`}
                  type="button"
                  onClick={() => openExternalDoc(doc.url)}
                  className="flex w-full items-center gap-3 rounded-[16px] border border-black/8 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-zinc-100 text-zinc-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block ty-heading">{doc.title}</span>
                    <span className="block ty-note">Открыть PDF</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
              ))}
            </div>
          ) : null}

          <AppliancePassportCard
            panel={panel}
            appliance={appliance}
            onReplace={onReplace}
          />
        </div>
      </div>

      <AnimatePresence>
        {editOpen && (
          <AddApplianceSheet
            panels={[panel]}
            preferredPanelId={panel.id}
            initialAppliance={appliance}
            onClose={() => setEditOpen(false)}
            onSave={(_panelId, next) => {
              onReplace({ ...next, id: appliance.id });
              setEditOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <UndoSnackbarHost
        action={
          pendingDelete
            ? {
                key: `delete-appliance-${appliance.id}`,
                message: "Техника будет удалена",
                onUndo: () => setPendingDelete(false),
                onCommit: () => {
                  setPendingDelete(false);
                  onDelete();
                },
              }
            : null
        }
      />

      <AnimatePresence>
        {detailsHintOpen && (
          <InfoDialog
            title="Производитель и модель"
            description="Укажите производителя и модель — так мы сможем показать мощность, характеристики и документы для этой техники."
            onClose={() => setDetailsHintOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {powerEditOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
              onClick={() => setPowerEditOpen(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
              >
                <h3 className="mb-2 ty-title">Максимальная мощность</h3>
                <p className="mb-4 ty-body text-zinc-600">
                  Укажите номинальную мощность в ваттах — её можно найти на
                  шильдике или в документации.
                </p>
                <label className="mb-2 block">
                  <span className="mb-1.5 block ty-label text-zinc-500">
                    Мощность, Вт
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50000}
                    value={powerDraft}
                    onChange={(e) => {
                      setPowerDraft(e.target.value);
                      setPowerError(null);
                    }}
                    placeholder="Например, 2000"
                    className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none"
                    autoFocus
                  />
                </label>
                {powerError ? (
                  <p className="mb-3 ty-note text-rose-600">{powerError}</p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPowerEditOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button className="flex-1" onClick={savePower}>
                    Сохранить
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
