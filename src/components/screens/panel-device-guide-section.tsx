"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { BrandMark, SeriesMark } from "@/components/icons/brand-mark";
import { DeviceMiniPreview } from "@/components/icons/device-face";
import { GlassCard } from "@/components/ui/glass-card";
import { DeviceSpecGuideSheet } from "@/components/screens/device-spec-guide-sheet";
import {
  panelGuideDisclaimer,
  summarizePanelDevices,
} from "@/lib/panel-device-guide";
import { resolveDeviceSeriesLabel } from "@/lib/device-catalog";
import { isDeviceDetailsConfident } from "@/lib/manufacturer-brands";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

function PreviewWithCount({
  device,
  count,
}: {
  device: Device;
  count: number;
}) {
  const confident = isDeviceDetailsConfident(device);
  return (
    <div className="flex w-14 shrink-0 flex-col items-center">
      <DeviceMiniPreview
        device={device}
        scale={0.36}
        showDetails={confident}
        brand={
          confident
            ? (() => {
                const series = resolveDeviceSeriesLabel(device);
                if (series) {
                  return (
                    <SeriesMark
                      series={series}
                      brandKey={device.brandKey}
                      brand={device.manufacturer}
                    />
                  );
                }
                return device.manufacturer ? (
                  <BrandMark
                    brandKey={device.brandKey}
                    brand={device.manufacturer}
                  />
                ) : undefined;
              })()
            : undefined
        }
      />
      {count > 1 && (
        <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-zinc-500">
          ×{count}
        </span>
      )}
    </div>
  );
}

function GuideRow({
  sample,
  count,
  title,
  body,
  badge,
  dashed = false,
}: {
  sample: Device;
  count: number;
  title: string;
  body: string;
  badge: ReactNode;
  dashed?: boolean;
}) {
  return (
    <li
      className={cn(
        "relative rounded-[16px] bg-zinc-50 px-3 py-3 pr-[4.75rem]",
        dashed
          ? "border border-dashed border-black/8"
          : "border border-black/[0.06]",
      )}
    >
      <div className="absolute right-2.5 top-2.5 z-[1]">{badge}</div>
      <div className="flex items-start gap-3">
        <PreviewWithCount device={sample} count={count} />
        <div className="min-w-0 flex-1 pt-0.5">
          <span className="block text-[15px] font-semibold text-zinc-900">
            {title}
          </span>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
            {body}
          </p>
        </div>
      </div>
    </li>
  );
}

export function PanelDeviceGuideSection({
  devices,
  onCallMaster,
}: {
  devices: Device[];
  onCallMaster?: () => void;
}) {
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
            <h3 className="text-[16px] font-semibold text-zinc-900">
              Что в этом щитке
            </h3>
            <p className="mt-1 text-[13px] text-zinc-500">
              {present.length > 0
                ? `${present.length} типов на схеме`
                : "Пока ничего не распознано"}
              {missing.length > 0 ? ` · ${missing.length} можно добавить` : ""}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-zinc-500 transition-transform",
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
              <div className="space-y-4 border-t border-black/[0.06] px-4 pb-4 pt-3">
                {present.length > 0 && (
                  <ul className="space-y-3">
                    {present.map(({ type, count, guide, sample }) => (
                      <GuideRow
                        key={type}
                        sample={sample}
                        count={count}
                        title={guide.title}
                        body={guide.role}
                        badge={
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </span>
                        }
                      />
                    ))}
                  </ul>
                )}

                {missing.length > 0 && (
                  <>
                    <div className="border-t border-black/[0.06] pt-3">
                      <h4 className="text-[15px] font-semibold text-zinc-900">
                        Что ещё бывает и чем полезно
                      </h4>
                      <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                        Этих приборов на схеме нет — узнайте, какие параметры
                        бывают и как их подобрать.
                      </p>
                    </div>
                    <ul className="space-y-3">
                      {missing.map(({ type, guide, sample }) => (
                        <GuideRow
                          key={type}
                          sample={sample}
                          count={1}
                          title={guide.title}
                          body={guide.benefit}
                          dashed
                          badge={
                            <button
                              type="button"
                              onClick={() => setPickerType(type)}
                              className="rounded-full border border-black/10 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-200"
                            >
                              Как подобрать
                            </button>
                          }
                        />
                      ))}
                    </ul>
                  </>
                )}

                <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <p className="text-[12px] leading-relaxed text-amber-900/75">
                    {panelGuideDisclaimer}
                  </p>
                  {onCallMaster && (
                    <button
                      type="button"
                      onClick={onCallMaster}
                      className="mt-2.5 block text-[13px] font-semibold text-amber-950 underline decoration-amber-800/40 underline-offset-2"
                    >
                      ⚡ Помочь с электрикой
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      <DeviceSpecGuideSheet
        type={pickerType}
        open={pickerType !== null}
        onClose={() => setPickerType(null)}
      />
    </>
  );
}
