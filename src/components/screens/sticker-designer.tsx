"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Printer, Sticker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import {
  getStickerIcon,
  stickerCaption,
  STICKER_ICONS,
  suggestedStickerIcon,
  type StickerIconId,
} from "@/lib/sticker-icons";
import {
  buildStickerStrips,
  maxModulesPerStrip,
  paginateStrips,
  STICKER_HEIGHT_MM,
  STICKER_MODULE_MM,
  stickerDeviceModules,
  stripWidthMm,
  type StickerStrip,
} from "@/lib/sticker-layout";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";

function cellIconId(device: Device): StickerIconId {
  return (
    (device.stickerIcon as StickerIconId | undefined) ??
    suggestedStickerIcon(device)
  );
}

function StickerCell({
  device,
  selected,
  onSelect,
}: {
  device: Device;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const modules = stickerDeviceModules(device);
  const icon = getStickerIcon(cellIconId(device));
  const Icon = icon?.Icon;
  const caption = stickerCaption(device);

  return (
    <button
      type="button"
      disabled={!onSelect}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col items-center justify-center overflow-hidden border-r border-zinc-400/70 px-[0.6mm] text-center last:border-r-0",
        onSelect && "cursor-pointer hover:bg-zinc-50",
        selected && "bg-amber-50 ring-2 ring-inset ring-zinc-900",
        !onSelect && "cursor-default",
      )}
      style={{ width: `${modules * STICKER_MODULE_MM}mm` }}
    >
      {Icon && (
        <Icon
          className="shrink-0 text-zinc-800"
          style={{
            width: modules === 1 ? "3.6mm" : "4.4mm",
            height: modules === 1 ? "3.6mm" : "4.4mm",
          }}
          strokeWidth={2.1}
        />
      )}
      <span
        className="mt-[0.4mm] w-full truncate leading-none text-zinc-900"
        style={{
          fontSize: modules === 1 ? "2.1mm" : "2.4mm",
          fontWeight: 650,
        }}
      >
        {caption}
      </span>
    </button>
  );
}

function StickerStripView({
  strip,
  selectedId,
  onSelect,
}: {
  strip: StickerStrip;
  selectedId?: number | null;
  onSelect?: (deviceId: number) => void;
}) {
  const width = stripWidthMm(strip.modules);

  return (
    <div>
      <div
        className="mb-[1.5mm] text-zinc-500"
        style={{ fontSize: "3mm", width: `${width}mm` }}
      >
        Ряд {strip.railIndex + 1}
        {strip.partCount > 1
          ? ` · часть ${strip.partIndex + 1} из ${strip.partCount}`
          : ""}
        {` · ${strip.modules}×${STICKER_MODULE_MM} мм`}
      </div>
      <div
        className="relative flex overflow-hidden border-[0.35mm] border-dashed border-zinc-800 bg-white"
        style={{ width: `${width}mm`, height: `${STICKER_HEIGHT_MM}mm` }}
      >
        {strip.devices.map((device) => (
          <StickerCell
            key={device.id}
            device={device}
            selected={selectedId === device.id}
            onSelect={onSelect ? () => onSelect(device.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function StickerDesigner({
  rails,
  panelTitle,
  editable = true,
  onClose,
  onUpdate,
}: {
  rails: Device[][];
  panelTitle: string;
  editable?: boolean;
  onClose: () => void;
  onUpdate?: (
    deviceId: number,
    patch: { circuitLabel?: string; stickerIcon?: string },
  ) => void;
}) {
  const [draftRails, setDraftRails] = useState(rails);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const strips = useMemo(() => buildStickerStrips(draftRails), [draftRails]);
  const pages = useMemo(() => paginateStrips(strips), [strips]);
  const selected = draftRails.flat().find((device) => device.id === selectedId);
  const maxModules = maxModulesPerStrip();

  const patchDevice = (
    deviceId: number,
    patch: { circuitLabel?: string; stickerIcon?: string },
  ) => {
    setDraftRails((prev) =>
      prev.map((rail) =>
        rail.map((device) =>
          device.id === deviceId ? { ...device, ...patch } : device,
        ),
      ),
    );
    onUpdate?.(deviceId, patch);
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sticker-designer-ui fixed inset-0 z-[120] flex flex-col bg-white"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 lg:px-8">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-zinc-500">
              <Sticker className="h-3.5 w-3.5" />
              Наклейка на щиток
            </div>
            <h2 className="truncate text-[16px] font-semibold text-zinc-900">
              {panelTitle}
            </h2>
          </div>
          <Button
            className="h-11 shrink-0 rounded-full px-4"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Печать
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 lg:px-8">
            <GlassCard className="mb-5 p-4">
              <p className="text-[13px] leading-relaxed text-zinc-600">
                Макет в масштабе 1:1: модуль {STICKER_MODULE_MM} мм, высота
                полосы {STICKER_HEIGHT_MM} мм — клеится в окно маркировки, не
                закрывая рычаги. Печать на A4 альбомно. Если ряд шире листа
                (больше {maxModules} модулей), полоса режется на части по
                границам приборов. Нажмите ячейку, чтобы подписать линию и
                выбрать иконку.
              </p>
            </GlassCard>

            <div className="space-y-6 overflow-x-auto pb-2">
              {strips.length === 0 ? (
                <p className="text-[14px] text-zinc-500">
                  На схеме нет приборов для наклейки.
                </p>
              ) : (
                strips.map((strip) => (
                  <StickerStripView
                    key={`${strip.railIndex}-${strip.partIndex}`}
                    strip={strip}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                  />
                ))
              )}
            </div>

            {editable && selected && (
              <GlassCard className="mt-6 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-zinc-500">Подпись</div>
                    <div className="text-[15px] font-semibold text-zinc-900">
                      {stickerDeviceModules(selected)} мод. ·{" "}
                      {stickerDeviceModules(selected) * STICKER_MODULE_MM} мм
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                    aria-label="Снять выбор"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={selected.circuitLabel ?? ""}
                  onChange={(e) =>
                    patchDevice(selected.id, { circuitLabel: e.target.value })
                  }
                  placeholder="Например: Кухня розетки"
                  className="mb-4 h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                />
                <div className="mb-2 text-[13px] font-medium text-zinc-600">
                  Иконка
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {STICKER_ICONS.map((item) => {
                    const active = cellIconId(selected) === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          patchDevice(selected.id, { stickerIcon: item.id })
                        }
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-[14px] border px-2 py-2.5 text-center transition-colors",
                          active
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-black/8 bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
                        )}
                      >
                        <item.Icon className="h-5 w-5" strokeWidth={2} />
                        <span className="text-[10px] font-medium leading-tight">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </motion.div>

      <div className="sticker-print-root hidden">
        {pages.map((page, pageIndex) => (
          <section
            key={pageIndex}
            className="sticker-print-page"
            style={{
              pageBreakAfter:
                pageIndex < pages.length - 1 ? "always" : "auto",
            }}
          >
            <div
              className="text-zinc-500"
              style={{ fontSize: "3.2mm", marginBottom: "4mm" }}
            >
              {panelTitle} · наклейка 1:1 · A4 альбомно
              {pages.length > 1
                ? ` · лист ${pageIndex + 1} из ${pages.length}`
                : ""}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8mm",
              }}
            >
              {page.map((strip) => (
                <StickerStripView
                  key={`print-${strip.railIndex}-${strip.partIndex}`}
                  strip={strip}
                />
              ))}
            </div>
            <p
              className="text-zinc-400"
              style={{ fontSize: "2.6mm", marginTop: "6mm" }}
            >
              Вырежьте по пунктиру. Если ряд разбит на части — клеите их слева
              направо в том же порядке, что на схеме.
            </p>
          </section>
        ))}
      </div>
    </Portal>
  );
}
