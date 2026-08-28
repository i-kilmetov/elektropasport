"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  WIRE_COLOR_OPTIONS,
  WIRE_THICKNESS_OPTIONS,
  wireStrokeWidth,
} from "@/lib/panel-wires";
import { cn } from "@/lib/utils";

export function WireSpecSheet({
  initialColor = WIRE_COLOR_OPTIONS[0].color,
  initialThicknessMm = 2.5,
  allowDelete = false,
  onConfirm,
  onDelete,
  onCancel,
}: {
  initialColor?: string;
  initialThicknessMm?: number;
  allowDelete?: boolean;
  onConfirm: (spec: { color: string; thicknessMm: number }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [color, setColor] = useState(initialColor);
  const [thicknessMm, setThicknessMm] = useState(initialThicknessMm);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-end bg-black/45 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 28, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[24px] border border-black/8 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[24px]"
      >
        <h3 className="ty-title">Кабель</h3>
        <p className="mt-1 ty-note">
          Укажите цвет изоляции и сечение — так кабель отобразится на схеме.
        </p>

        <div className="mt-4">
          <div className="mb-2 ty-badge text-zinc-500">Цвет</div>
          <div className="grid grid-cols-4 gap-2">
            {WIRE_COLOR_OPTIONS.map((option) => {
              const active = option.color === color;
              const isPe = option.id === "pe";
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColor(option.color)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-[14px] border px-1.5 py-2 transition-colors",
                    active
                      ? "border-zinc-900 bg-zinc-900/5"
                      : "border-black/8 bg-zinc-50",
                  )}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{
                      background: isPe
                        ? "repeating-linear-gradient(-45deg,#CA8A04 0 3px,#166534 3px 6px)"
                        : option.color,
                    }}
                  />
                  <span className="line-clamp-2 text-center text-[9px] leading-tight text-zinc-600">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 ty-badge text-zinc-500">
            Сечение, мм²
          </div>
          <div className="flex flex-wrap gap-2">
            {WIRE_THICKNESS_OPTIONS.map((mm) => {
              const active = mm === thicknessMm;
              return (
                <button
                  key={mm}
                  type="button"
                  onClick={() => setThicknessMm(mm)}
                  className={cn(
                    "rounded-full px-3 py-1.5 ty-label transition-colors",
                    active
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                  )}
                >
                  {mm}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-black/8 bg-zinc-50 px-3 py-3">
          <svg width="72" height="16" viewBox="0 0 72 16" aria-hidden>
            <line
              x1="4"
              y1="8"
              x2="68"
              y2="8"
              stroke={color}
              strokeWidth={wireStrokeWidth(thicknessMm)}
              strokeLinecap="round"
              style={
                color === "#CA8A04"
                  ? {
                      strokeDasharray: "4 3",
                    }
                  : undefined
              }
            />
          </svg>
          <span className="text-[13px] text-zinc-600">
            {thicknessMm} мм² на схеме
          </span>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => onConfirm({ color, thicknessMm })}
          >
            Сохранить
          </Button>
        </div>
        {allowDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-3 w-full py-2 text-center ty-subtitle text-rose-600"
          >
            Удалить кабель
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
