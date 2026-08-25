"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { AddApplianceSheet } from "@/components/screens/add-appliance-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { InfoDialog } from "@/components/ui/info-dialog";
import {
  applianceKindIcon,
  applianceKindLabel,
  findCatalogModel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import type { HomeAppliance, PanelObject } from "@/types";

function openExternalDoc(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [missingDoc, setMissingDoc] = useState<"instruction" | "manual" | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const Icon = applianceKindIcon(appliance.kind);
  const kindLabel = applianceKindLabel(appliance.kind);
  const brand = appliance.brand?.trim() || appliance.title;
  const model = appliance.model?.trim();

  const catalog = useMemo(
    () =>
      appliance.catalogId ? findCatalogModel(appliance.catalogId) : undefined,
    [appliance.catalogId],
  );

  const specs = useMemo(() => {
    if (catalog?.specs?.length) return catalog.specs;
    if (appliance.specs?.length) return appliance.specs;
    return [
      {
        label: "Максимальная мощность",
        value: formatAppliancePower(appliance.powerW),
      },
    ];
  }, [appliance.powerW, appliance.specs, catalog?.specs]);

  const instructionUrl =
    catalog?.instructionUrl ||
    appliance.manuals?.find((item) =>
      item.title.toLowerCase().includes("инструк"),
    )?.url;
  const manualUrl =
    catalog?.manualUrl ||
    appliance.manuals?.find((item) =>
      item.title.toLowerCase().includes("руковод"),
    )?.url ||
    appliance.manuals?.[1]?.url ||
    appliance.manuals?.[0]?.url;

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
          <h1 className="truncate text-[18px] font-semibold text-zinc-900">
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
                    setConfirmDelete(true);
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
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border border-black/8 bg-zinc-100 text-zinc-600">
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[20px] font-bold tracking-tight text-zinc-900">
                <span className="font-semibold text-zinc-500">{kindLabel}</span>{" "}
                {brand}
              </h2>
              {model && (
                <p className="truncate text-[14px] text-zinc-500">{model}</p>
              )}
            </div>
          </div>

          <GlassCard className="p-4">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-zinc-400">
              Характеристики
            </h3>
            <div className="divide-y divide-black/[0.06]">
              {specs.map((spec) => (
                <div
                  key={`${spec.label}-${spec.value}`}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 text-[14px] text-zinc-600">
                    {spec.label}
                  </div>
                  <div className="max-w-[55%] shrink-0 text-right text-[14px] font-semibold text-zinc-900">
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
          <button
            type="button"
            onClick={() => {
              if (instructionUrl) openExternalDoc(instructionUrl);
              else setMissingDoc("instruction");
            }}
            className="rounded-[20px] border border-black/8 bg-white p-4 text-left transition-colors hover:bg-zinc-50"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-zinc-100 text-zinc-600">
              <FileText className="h-5 w-5" />
            </span>
            <span className="flex items-start justify-between gap-2">
              <span className="block text-[14px] font-semibold text-zinc-900">
                Инструкция
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            </span>
            <span className="mt-0.5 block text-[12px] text-zinc-500">
              Открыть PDF на сайте
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (manualUrl) openExternalDoc(manualUrl);
              else setMissingDoc("manual");
            }}
            className="rounded-[20px] border border-black/8 bg-white p-4 text-left transition-colors hover:bg-zinc-50"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-zinc-100 text-zinc-600">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="flex items-start justify-between gap-2">
              <span className="block text-[14px] font-semibold leading-snug text-zinc-900">
                Руководство по эксплуатации
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            </span>
            <span className="mt-0.5 block text-[12px] text-zinc-500">
              Открыть PDF на сайте
            </span>
          </button>
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

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            title="Удалить технику?"
            description={`${brand}${model ? ` · ${model}` : ""} будет удалена из этого щитка.`}
            confirmLabel="Удалить"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false);
              onDelete();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missingDoc && (
          <InfoDialog
            title={
              missingDoc === "instruction"
                ? "Инструкция"
                : "Руководство по эксплуатации"
            }
            description="Документ для этой модели пока не найден. Попробуйте позже или откройте сайт производителя по названию модели."
            onClose={() => setMissingDoc(null)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
