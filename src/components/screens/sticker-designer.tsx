"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Printer, X } from "lucide-react";
import { IosShareIcon } from "@/components/icons/ios-share-icon";
import { StickerBadgeIcon } from "@/components/icons/sticker-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import {
  getStickerIcon,
  iconsInCategory,
  stickerCaption,
  STICKER_ICON_CATEGORIES,
  suggestedStickerIcon,
  type StickerIconCategory,
  type StickerIconId,
} from "@/lib/sticker-icons";
import {
  A4_LANDSCAPE_MM,
  buildStickerStrips,
  paginateStrips,
  PRINT_MARGIN_MM,
  STICKER_HEIGHT_MM,
  STICKER_MODULE_MM,
  stickerDeviceModules,
  stripWidthMm,
  type StickerStrip,
} from "@/lib/sticker-layout";
import {
  exportStickerPdf,
  stickerPrintNeedsExport,
} from "@/lib/sticker-export";
import { cn } from "@/lib/utils";
import type { Device, PanelWire } from "@/types";

function a4OverflowsViewport(): boolean {
  const mmToPx = 96 / 25.4;
  const pageW = A4_LANDSCAPE_MM.width * mmToPx;
  return pageW > window.innerWidth - 48;
}

const STICKER_ICON_MM = 4.4;
const STICKER_CAPTION_MM = 2.2;

function cellIconId(device: Device): StickerIconId {
  return device.stickerIcon || suggestedStickerIcon(device);
}

function StickerCell({
  device,
  panelDevices,
  wires,
  selected,
  onSelect,
}: {
  device: Device;
  panelDevices?: Device[];
  wires?: PanelWire[] | null;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const modules = stickerDeviceModules(device);
  const icon = getStickerIcon(cellIconId(device));
  const Icon = icon?.Icon;
  const caption = stickerCaption(device, panelDevices, wires);
  const style = { width: `${modules * STICKER_MODULE_MM}mm` };
  const card = (
    <div
      className={cn(
        "flex h-full w-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-[2mm] border border-black/8 bg-zinc-50 px-[0.8mm] text-center",
        selected && "border-zinc-900 bg-amber-50 ring-1 ring-inset ring-zinc-900",
        onSelect && !selected && "hover:bg-zinc-100",
      )}
    >
      {Icon && (
        <Icon
          className="shrink-0 text-zinc-800"
          style={{
            width: `${STICKER_ICON_MM}mm`,
            height: `${STICKER_ICON_MM}mm`,
          }}
          strokeWidth={2.1}
        />
      )}
      <span
        className="mt-[0.5mm] line-clamp-2 w-full leading-tight text-zinc-900"
        style={{
          fontSize: `${STICKER_CAPTION_MM}mm`,
          fontWeight: 650,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {caption}
      </span>
    </div>
  );
  const className = cn(
    "box-border flex h-full shrink-0 p-[0.55mm]",
    onSelect ? "cursor-pointer border-0 bg-transparent" : "cursor-default",
  );

  if (!onSelect) {
    return (
      <div className={className} style={style}>
        {card}
      </div>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={className} style={style}>
      {card}
    </button>
  );
}

function StickerStripView({
  strip,
  panelDevices,
  wires,
  selectedId,
  onSelect,
}: {
  strip: StickerStrip;
  panelDevices?: Device[];
  wires?: PanelWire[] | null;
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
        className="relative flex items-stretch bg-white"
        style={{
          width: `${width}mm`,
          height: `${STICKER_HEIGHT_MM}mm`,
          border: "0.15mm dashed rgba(24, 24, 27, 0.16)",
        }}
      >
        {strip.devices.map((device) => (
          <StickerCell
            key={device.id}
            device={device}
            panelDevices={panelDevices}
            wires={wires}
            selected={selectedId === device.id}
            onSelect={onSelect ? () => onSelect(device.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function A4Page({
  strips,
  panelTitle,
  pageIndex,
  pageCount,
  panelDevices,
  wires,
  selectedId,
  onSelect,
}: {
  strips: StickerStrip[];
  panelTitle: string;
  pageIndex: number;
  pageCount: number;
  panelDevices?: Device[];
  wires?: PanelWire[] | null;
  selectedId?: number | null;
  onSelect?: (deviceId: number) => void;
}) {
  return (
    <div
      className="sticker-print-page bg-white text-zinc-900"
      style={{
        width: `${A4_LANDSCAPE_MM.width}mm`,
        height: `${A4_LANDSCAPE_MM.height}mm`,
        padding: `${PRINT_MARGIN_MM}mm`,
        boxSizing: "border-box",
      }}
    >
      <div
        className="text-zinc-500"
        style={{ fontSize: "3.2mm", marginBottom: "4mm" }}
      >
        {panelTitle} · стикеры 1:1 · A4 альбомно
        {pageCount > 1 ? ` · лист ${pageIndex + 1} из ${pageCount}` : ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8mm" }}>
        {strips.map((strip) => (
          <StickerStripView
            key={`${strip.railIndex}-${strip.partIndex}`}
            strip={strip}
            panelDevices={panelDevices}
            wires={wires}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="text-zinc-400" style={{ fontSize: "2.6mm", marginTop: "6mm" }}>
        Вырежьте полосу по тонкому контуру. Если ряд разбит на части — клеите их
        слева направо в том же порядке, что на схеме.
      </p>
    </div>
  );
}

function FittedA4({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const page = frame.querySelector(".sticker-print-page") as HTMLElement | null;
      if (!page) return;
      const next = Math.min(
        frame.clientWidth / page.offsetWidth,
        frame.clientHeight / page.offsetHeight,
      );
      setScale(Number.isFinite(next) && next > 0 ? next : 0.3);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const inner = (
    <>
      <div
        ref={frameRef}
        className="relative mx-auto w-full"
        style={{
          aspectRatio: `${A4_LANDSCAPE_MM.width} / ${A4_LANDSCAPE_MM.height}`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[2px] shadow-lg"
          style={{
            width: `${A4_LANDSCAPE_MM.width}mm`,
            height: `${A4_LANDSCAPE_MM.height}mm`,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
      {onOpen && (
        <p className="mt-3 text-center text-[13px] font-medium text-zinc-600">
          Нажмите на лист, чтобы увеличить и подобрать иконки
        </p>
      )}
    </>
  );

  if (!onOpen) {
    return (
      <div className="block w-full overflow-hidden rounded-[16px] border border-black/10 bg-zinc-200/70 p-3 shadow-inner">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full overflow-hidden rounded-[16px] border border-black/10 bg-zinc-200/70 p-3 text-left shadow-inner active:scale-[0.99]"
    >
      {inner}
    </button>
  );
}

export function StickerDesigner({
  rails,
  panelTitle,
  panelDevices,
  wires,
  editable = true,
  onClose,
  onUpdate,
}: {
  rails: Device[][];
  panelTitle: string;
  panelDevices?: Device[];
  wires?: PanelWire[] | null;
  editable?: boolean;
  onClose: () => void;
  onUpdate?: (
    deviceId: number,
    patch: { circuitLabel?: string; stickerIcon?: string },
  ) => void;
}) {
  const printRootRef = useRef<HTMLDivElement>(null);
  const [draftRails, setDraftRails] = useState(rails);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [category, setCategory] = useState<StickerIconCategory>("functions");
  const [sheetPreview, setSheetPreview] = useState(true);
  const [needsSheetPreview, setNeedsSheetPreview] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const needsExport = stickerPrintNeedsExport();
  const captionDevices = panelDevices ?? draftRails.flat();

  useEffect(() => {
    const overflows = a4OverflowsViewport();
    setNeedsSheetPreview(overflows);
    if (!overflows) setSheetPreview(false);
  }, []);

  const strips = useMemo(() => buildStickerStrips(draftRails), [draftRails]);
  const pages = useMemo(() => paginateStrips(strips), [strips]);
  const selected = draftRails.flat().find((device) => device.id === selectedId);
  const categoryIcons = iconsInCategory(category);

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

  const handlePrint = async () => {
    setExportError(null);
    if (!needsExport) {
      window.print();
      return;
    }
    const nodes = [
      ...(printRootRef.current?.querySelectorAll<HTMLElement>(
        ".sticker-print-page",
      ) ?? []),
    ];
    if (nodes.length === 0) {
      setExportError("Не удалось подготовить лист");
      return;
    }
    setExporting(true);
    try {
      await exportStickerPdf(nodes, panelTitle);
    } catch (error) {
      console.error(error);
      setExportError(
        "Не получилось сохранить файл. Разрешите доступ к файлам или откройте сайт в браузере.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleBack = () => {
    if (!sheetPreview && needsSheetPreview) {
      setSheetPreview(true);
      setSelectedId(null);
      return;
    }
    onClose();
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
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-zinc-500">
              <StickerBadgeIcon className="h-3.5 w-3.5" />
              Стикеры в щиток
            </div>
            <h2 className="truncate text-[16px] font-semibold text-zinc-900">
              {panelTitle}
            </h2>
          </div>
          <Button
            className="h-11 shrink-0 rounded-full px-4"
            disabled={exporting}
            onClick={() => void handlePrint()}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : needsExport ? (
              <IosShareIcon className="h-4 w-4" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {needsExport ? "Сохранить" : "Печать"}
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 lg:px-8">
            <GlassCard className="mb-5 p-4">
              <p className="text-[14px] leading-relaxed text-zinc-700">
                Это подготовленный макет индивидуальных стикеров для вашего
                щитка. Достаточно подобрать иконки, написать текст на ячейках и
                отправить на печать.
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
                Масштаб 1:1: модуль {STICKER_MODULE_MM} мм, высота полосы{" "}
                {STICKER_HEIGHT_MM} мм. Печать на A4 альбомно
                {needsExport ? " — сохраните PDF и распечатайте его." : "."}
              </p>
            </GlassCard>

            {exportError && (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                {exportError}
              </p>
            )}

            {sheetPreview ? (
              <div className="space-y-4">
                {pages.map((page, pageIndex) => (
                  <FittedA4
                    key={pageIndex}
                    onOpen={() => setSheetPreview(false)}
                  >
                    <A4Page
                      strips={page}
                      panelTitle={panelTitle}
                      pageIndex={pageIndex}
                      pageCount={pages.length}
                      panelDevices={captionDevices}
                      wires={wires}
                    />
                  </FittedA4>
                ))}
              </div>
            ) : (
              <>
                {strips.length === 0 ? (
                  <p className="text-[14px] text-zinc-500">
                      На схеме нет приборов для стикеров.
                  </p>
                ) : (
                  <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
                    <div className="space-y-6">
                      {pages.map((page, pageIndex) => (
                        <A4Page
                          key={pageIndex}
                          strips={page}
                          panelTitle={panelTitle}
                          pageIndex={pageIndex}
                          pageCount={pages.length}
                          panelDevices={captionDevices}
                          wires={wires}
                          selectedId={selectedId}
                          onSelect={editable ? setSelectedId : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {editable && selected && (
                  <GlassCard className="sticky bottom-3 mt-6 p-4">
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
                        patchDevice(selected.id, {
                          circuitLabel: e.target.value,
                        })
                      }
                      placeholder={
                        stickerCaption(selected, captionDevices, wires) ||
                        "Например: Кухня розетки"
                      }
                      className="mb-4 h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                    />
                    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                      {STICKER_ICON_CATEGORIES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id)}
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                            category === item.id
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                      {categoryIcons.map((item) => {
                        const active = cellIconId(selected) === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              patchDevice(selected.id, {
                                stickerIcon: item.id,
                              })
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
              </>
            )}
          </div>
        </div>
      </motion.div>

      <div ref={printRootRef} className="sticker-print-root" aria-hidden>
        {pages.map((page, pageIndex) => (
          <A4Page
            key={pageIndex}
            strips={page}
            panelTitle={panelTitle}
            pageIndex={pageIndex}
            pageCount={pages.length}
            panelDevices={captionDevices}
            wires={wires}
          />
        ))}
      </div>
    </Portal>
  );
}
