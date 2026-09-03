"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Device } from "@/types";

export type XrayHighlight = {
  id: number | string;
  name?: string;
  bbox: { x: number; y: number; w: number; h: number };
};

function deviceHighlights(devices: Device[]): XrayHighlight[] {
  return devices
    .filter((d) => d.bbox && d.bbox.w > 0.01 && d.bbox.h > 0.01)
    .map((d) => ({
      id: d.id,
      name: d.name,
      bbox: d.bbox!,
    }));
}

/**
 * Panel photo with cyan X-ray scan sweep and device glow boxes.
 * While `scanning`, a beam travels top→bottom; when `highlights` arrive they light up.
 */
export function PanelXrayScan({
  photoDataUrl,
  progress,
  devices,
  scanning,
  revealCount,
}: {
  photoDataUrl: string;
  progress: number;
  devices?: Device[] | null;
  scanning: boolean;
  /** How many highlight boxes to show (staggered reveal). */
  revealCount?: number;
}) {
  const highlights = useMemo(
    () => deviceHighlights(devices ?? []),
    [devices],
  );
  const visible = highlights.slice(
    0,
    revealCount == null ? highlights.length : Math.max(0, revealCount),
  );

  // Soft “detected” glow under the scan line even before AI returns —
  // synthetic faint strips that pulse with progress.
  const ghostRails = useMemo(() => {
    if (!scanning || highlights.length > 0) return [];
    const rows = 3;
    return Array.from({ length: rows }, (_, i) => ({
      id: `ghost-${i}`,
      y: 0.18 + i * 0.22,
      h: 0.14,
    }));
  }, [highlights.length, scanning]);

  const scanY = Math.min(1, Math.max(0, progress / 100));

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-cyan-500/25 bg-zinc-950 shadow-[0_20px_50px_-24px_rgba(8,145,178,0.55)]">
      <div className="relative aspect-[4/3] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoDataUrl}
          alt="Фото щитка"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Base photo → X-ray tint */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,24,38,0.35), rgba(8,47,73,0.55))",
            mixBlendMode: "multiply",
          }}
        />
        {/* Cyan X-ray layer */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoDataUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            style={{
              filter:
                "grayscale(1) contrast(1.35) brightness(1.15) invert(0.08)",
              mixBlendMode: "screen",
              opacity: 0.55 + scanY * 0.2,
            }}
          />
        </div>

        {/* Cyan phosphor wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(34,211,238,0.22), transparent 62%), linear-gradient(180deg, rgba(8,145,178,0.12), rgba(6,182,212,0.05))",
            mixBlendMode: "color",
          }}
        />

        {/* Ghost rail strips while waiting */}
        {ghostRails.map((rail) => (
          <motion.div
            key={rail.id}
            className="pointer-events-none absolute left-[8%] right-[8%] rounded-md border border-cyan-300/20 bg-cyan-300/5"
            style={{ top: `${rail.y * 100}%`, height: `${rail.h * 100}%` }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Device boxes from AI */}
        {visible.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: Math.min(0.4, index * 0.04) }}
            className="pointer-events-none absolute"
            style={{
              left: `${item.bbox.x * 100}%`,
              top: `${item.bbox.y * 100}%`,
              width: `${item.bbox.w * 100}%`,
              height: `${item.bbox.h * 100}%`,
            }}
          >
            <div className="absolute inset-0 rounded-[6px] border border-cyan-200/90 bg-cyan-300/15 shadow-[0_0_18px_rgba(34,211,238,0.55),inset_0_0_12px_rgba(165,243,252,0.35)]" />
            <div className="absolute inset-x-0 top-0 h-[35%] rounded-t-[6px] bg-gradient-to-b from-cyan-200/35 to-transparent" />
            {item.name ? (
              <span className="absolute -top-5 left-0 max-w-[140%] truncate rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-cyan-100">
                {item.name}
              </span>
            ) : null}
          </motion.div>
        ))}

        {/* Scan beam */}
        {scanning ? (
          <>
            <motion.div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: `${scanY * 100}%` }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <div className="relative -mt-[28px] h-[56px]">
                <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-cyan-200 shadow-[0_0_16px_4px_rgba(34,211,238,0.85)]" />
                <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent" />
              </div>
            </motion.div>
            {/* Trail above the beam (already “scanned”) */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-cyan-400/10 to-transparent"
              style={{ height: `${scanY * 100}%` }}
            />
          </>
        ) : null}

        {/* Vignette + scanlines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.08) 2px, rgba(6,182,212,0.08) 3px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55))]" />
      </div>
    </div>
  );
}

/** Stagger reveal of boxes after AI returns; calls onComplete when done. */
export function useXrayReveal(
  deviceCount: number,
  active: boolean,
  onComplete?: () => void,
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    if (deviceCount <= 0) {
      const t = window.setTimeout(() => onComplete?.(), 400);
      return () => window.clearTimeout(t);
    }

    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= deviceCount) {
        window.clearInterval(timer);
        window.setTimeout(() => onComplete?.(), 550);
      }
    }, Math.min(180, Math.max(70, 1400 / deviceCount)));

    return () => window.clearInterval(timer);
  }, [active, deviceCount, onComplete]);

  return count;
}
