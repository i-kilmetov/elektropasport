"use client";

import { useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  panelGuideDisclaimer,
  summarizePanelDevices,
} from "@/lib/panel-device-guide";
import type { Device } from "@/types";

function countLabel(count: number): string {
  if (count === 1) return "1 шт.";
  return `${count} шт.`;
}

export function PanelDeviceGuideSection({ devices }: { devices: Device[] }) {
  const { present, missing } = useMemo(
    () => summarizePanelDevices(devices),
    [devices],
  );

  if (present.length === 0) return null;

  return (
    <GlassCard className="mt-4 space-y-4 p-4">
      <div>
        <h3 className="text-[16px] font-semibold text-white">
          Что у вас в щитке
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
          Простыми словами — зачем нужен каждый тип прибора, который мы
          распознали на схеме.
        </p>
      </div>

      <ul className="space-y-3">
        {present.map(({ type, count, guide }) => (
          <li
            key={type}
            className="rounded-[16px] border border-white/8 bg-black/15 px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[15px] font-semibold text-white">
                {guide.title}
              </span>
              <span className="shrink-0 text-[12px] font-medium tabular-nums text-white/40">
                {countLabel(count)}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
              {guide.role}
            </p>
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <>
          <div className="border-t border-white/8 pt-4">
            <h3 className="text-[16px] font-semibold text-white">
              Что ещё бывает и чем полезно
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
              Этих приборов на вашей схеме нет — но в других щитках они часто
              ставятся для дополнительной защиты.
            </p>
          </div>
          <ul className="space-y-3">
            {missing.map(({ type, guide }) => (
              <li
                key={type}
                className="rounded-[16px] border border-dashed border-white/10 bg-white/[0.03] px-3.5 py-3"
              >
                <span className="text-[15px] font-semibold text-white/90">
                  {guide.title}
                </span>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                  {guide.benefit}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="rounded-[14px] border border-amber-400/15 bg-amber-500/8 px-3.5 py-3 text-[12px] leading-relaxed text-amber-100/75">
        {panelGuideDisclaimer}
      </p>
    </GlassCard>
  );
}
