"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/icons/brand-mark";
import { DeviceMiniPreview } from "@/components/icons/device-face";
import { GlassCard } from "@/components/ui/glass-card";
import { CatalogPickerSheet } from "@/components/screens/catalog-picker-sheet";
import {
  panelGuideDisclaimer,
  summarizePanelDevices,
} from "@/lib/panel-device-guide";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

function PreviewWithCount({
  device,
  count,
}: {
  device: Device;
  count: number;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <DeviceMiniPreview
        device={device}
        scale={0.36}
        brand={
          device.manufacturer ? (
            <BrandMark
              brandKey={device.brandKey}
              brand={device.manufacturer}
            />
          ) : undefined
        }
      />
      {count > 1 && (
        <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-white/45">
          ×{count}
        </span>
      )}
    </div>
  );
}

export function PanelDeviceGuideSection({ devices }: { devices: Device[] }) {
  const [open, setOpen] = useState(false);
  const [pickerType, setPickerType] = useState<DeviceType | null>(null);

  const { present, missing } = useMemo(
    () => summarizePanelDevices(devices),
    [devices],
  );

  if (present.length === 0 && missing.length === 0) return null;

  return (
    <>
      <GlassCard className="mt-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          aria-expanded={open}
        >
          <div>
            <h3 className="text-[16px] font-semibold text-white">
              Что у вас в щитке
            </h3>
            <p className="mt-1 text-[13px] text-white/45">
              {present.length > 0
                ? `${present.length} типов на схеме`
                : "Пока ничего не распознано"}
              {missing.length > 0 ? ` · ${missing.length} можно добавить` : ""}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-white/40 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-white/8 px-4 pb-4 pt-3">
                {present.length > 0 && (
                  <ul className="space-y-3">
                    {present.map(({ type, count, guide, sample }) => (
                      <li
                        key={type}
                        className="rounded-[16px] border border-white/8 bg-black/15 px-3 py-3"
                      >
                        <div className="flex gap-2.5">
                          <span className="mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </span>
                          <PreviewWithCount device={sample} count={count} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[15px] font-semibold text-white">
                              {guide.title}
                            </span>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                              {guide.role}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {missing.length > 0 && (
                  <>
                    <div className="border-t border-white/8 pt-3">
                      <h4 className="text-[15px] font-semibold text-white">
                        Что ещё бывает и чем полезно
                      </h4>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/45">
                        Этих приборов на схеме нет — посмотрите варианты в
                        каталоге.
                      </p>
                    </div>
                    <ul className="space-y-3">
                      {missing.map(({ type, guide, sample }) => (
                        <li
                          key={type}
                          className="relative rounded-[16px] border border-dashed border-white/10 bg-white/[0.03] px-3 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => setPickerType(type)}
                            className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/12"
                          >
                            Выбрать
                          </button>
                          <div className="flex gap-3 pr-16">
                            <PreviewWithCount device={sample} count={1} />
                            <div className="min-w-0 flex-1">
                              <span className="text-[15px] font-semibold text-white/90">
                                {guide.title}
                              </span>
                              <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                                {guide.benefit}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <p className="rounded-[14px] border border-amber-400/15 bg-amber-500/8 px-3.5 py-3 text-[12px] leading-relaxed text-amber-100/75">
                  {panelGuideDisclaimer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      <CatalogPickerSheet
        type={pickerType}
        open={pickerType !== null}
        onClose={() => setPickerType(null)}
      />
    </>
  );
}
