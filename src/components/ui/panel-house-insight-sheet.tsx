"use client";

import { motion } from "framer-motion";
import { Building2, Cable, Shield, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  formatBuildingYear,
  type PanelHouseSnapshot,
} from "@/lib/house-insight";
import { cn } from "@/lib/utils";

export function PanelHouseInsightSheet({
  open,
  snapshot,
  onClose,
  onChangeAddress,
}: {
  open: boolean;
  snapshot: PanelHouseSnapshot;
  onClose: () => void;
  onChangeAddress: () => void;
}) {
  if (!open) return null;

  const groundingTone =
    snapshot.groundingExpectation === "expected"
      ? "bg-emerald-50 text-emerald-950"
      : snapshot.groundingExpectation === "uncertain"
        ? "bg-amber-50 text-amber-950"
        : snapshot.groundingExpectation === "none"
          ? "bg-rose-50 text-rose-950"
          : "bg-zinc-100 text-zinc-900";

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="ty-title">Дом и сети</h3>
              <p className="mt-1 ty-body">{snapshot.address}</p>
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

          <div className="flex flex-col gap-3">
            <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Building2 className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Год постройки
                </span>
              </div>
              <p className="ty-heading text-zinc-900">
                {formatBuildingYear(snapshot.buildingYear)}
              </p>
              {(snapshot.floors != null || snapshot.flats != null) && (
                <p className="mt-1 ty-note">
                  {[
                    snapshot.floors != null ? `${snapshot.floors} эт.` : null,
                    snapshot.flats != null ? `${snapshot.flats} кв.` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {snapshot.dataSource ? (
                <p className="mt-1 ty-meta">Источник: {snapshot.dataSource}</p>
              ) : null}
            </div>

            <div className={cn("rounded-[20px] p-4", groundingTone)}>
              <div className="mb-2 flex items-center gap-2 opacity-70">
                <Shield className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Заземление
                </span>
              </div>
              <p className="ty-title leading-snug">{snapshot.groundingTitle}</p>
              <p className="mt-2 ty-body opacity-90">
                {snapshot.groundingSummary}
              </p>
            </div>

            {(snapshot.capitalRepairMessage ||
              snapshot.electricalOverhaulLastYear != null ||
              snapshot.electricalOverhaulNextYear != null) && (
              <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  <Zap className="h-4 w-4" />
                  <span className="ty-label uppercase tracking-wide">
                    Сети электроснабжения
                  </span>
                </div>
                {snapshot.capitalRepairMessage ? (
                  <p className="ty-body text-zinc-800">
                    {snapshot.capitalRepairMessage}
                  </p>
                ) : (
                  <p className="ty-body text-zinc-800">
                    {[
                      snapshot.electricalOverhaulLastYear != null
                        ? `Ремонт был в ${snapshot.electricalOverhaulLastYear} г.`
                        : null,
                      snapshot.electricalOverhaulNextYear != null
                        ? `В программе на ${snapshot.electricalOverhaulNextYear} г.`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Cable className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Важно
                </span>
              </div>
              <p className="ty-note text-zinc-700">
                Оценка по открытым данным программы капремонта и году постройки.
                Точное состояние вводного кабеля и щитка видно только на месте.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button type="button" className="w-full" onClick={onClose}>
              Понятно
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onChangeAddress}
            >
              Изменить адрес
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
