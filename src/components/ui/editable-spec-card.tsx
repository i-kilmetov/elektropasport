"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import {
  CharacteristicExplainBody,
  HintInfoButton,
  SpecCharacteristicCard,
} from "@/components/ui/spec-info-button";
import { getCharacteristicValueExplain } from "@/lib/characteristic-hints";
import { getSpecFieldOptions } from "@/lib/device-spec-guide";
import { hapticContextMenu } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/types";

export function EditableSpecCard({
  deviceType,
  label,
  value,
  editable = true,
  onChange,
}: {
  deviceType: DeviceType;
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (next: string) => void;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const explain = getCharacteristicValueExplain(label, value, deviceType);
  const options = getSpecFieldOptions(deviceType, label);
  const canEdit = editable && options.length > 0 && Boolean(onChange);

  if (!canEdit) {
    return (
      <SpecCharacteristicCard
        label={label}
        value={value}
        deviceType={deviceType}
      />
    );
  }

  return (
    <>
      <GlassCard
        className={cn(
          "cursor-pointer p-3 touch-manipulation select-none",
          pickerOpen && "ring-2 ring-zinc-900/20",
        )}
        onClick={() => {
          hapticContextMenu();
          setPickerOpen(true);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-zinc-500">{label}</div>
            <div className="mt-1 text-[15px] font-medium leading-snug text-zinc-900">
              {value}
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-400">
              Нажмите, чтобы изменить
            </p>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <HintInfoButton
              label={`Пояснение: ${label}`}
              open={hintOpen}
              onToggle={() => setHintOpen((v) => !v)}
            />
          </div>
        </div>
        {hintOpen && (
          <div onClick={(e) => e.stopPropagation()}>
            <CharacteristicExplainBody explain={explain} />
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end bg-black/40 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              exit={{ y: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[24px] border border-black/8 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
            >
              <h4 className="mb-1 text-[16px] font-semibold text-zinc-900">
                {label}
              </h4>
              <p className="mb-3 text-[12px] text-zinc-500">
                Выберите значение из списка
              </p>
              <div className="max-h-[40dvh] space-y-1.5 overflow-y-auto">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange?.(option);
                      setPickerOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[14px] border px-3 py-3 text-left text-[15px] transition-colors",
                      option === value
                        ? "border-zinc-900 bg-zinc-900/5 font-semibold text-zinc-900"
                        : "border-black/8 bg-zinc-50 text-zinc-800 hover:bg-zinc-100",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
