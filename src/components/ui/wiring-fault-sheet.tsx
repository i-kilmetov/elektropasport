"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WiringFault } from "@/lib/wiring-live-faults";
import { cn } from "@/lib/utils";

export function WiringFaultSheet({
  faults,
  onDismiss,
  onRemoveWire,
}: {
  faults: WiringFault[];
  onDismiss: () => void;
  onRemoveWire?: () => void;
}) {
  const critical = faults.some((fault) => fault.severity === "critical");

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className="fixed inset-x-0 bottom-0 z-[80] mx-auto max-w-xl rounded-t-[24px] border border-black/10 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
      role="dialog"
      aria-label="Проблемы расключения"
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-200" />
      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
          )}
        >
          {critical ? (
            <ShieldAlert className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div>
          <h2 className="ty-heading text-zinc-900">
            {critical ? "Опасное расключение" : "Проверьте расключение"}
          </h2>
          <p className="mt-1 ty-note text-zinc-600">
            По текущим проводам схема выглядит некорректно. Исправьте соединения
            до подачи напряжения.
          </p>
        </div>
      </div>

      <ul className="mb-4 max-h-[40vh] space-y-2 overflow-y-auto">
        {faults.map((fault) => (
          <li
            key={fault.id}
            className={cn(
              "rounded-[16px] border px-3.5 py-3",
              fault.severity === "critical"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50",
            )}
          >
            <p
              className={cn(
                "text-[14px] font-semibold",
                fault.severity === "critical" ? "text-red-800" : "text-amber-900",
              )}
            >
              {fault.title}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-zinc-700">
              {fault.detail}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        {onRemoveWire ? (
          <Button className="w-full" variant="secondary" onClick={onRemoveWire}>
            Удалить последнее соединение
          </Button>
        ) : null}
        <Button className="w-full" onClick={onDismiss}>
          Понятно
        </Button>
      </div>
    </motion.div>
  );
}
