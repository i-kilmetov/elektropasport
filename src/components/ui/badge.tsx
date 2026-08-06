import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types";

const statusStyles: Record<DeviceStatus, string> = {
  verified: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  pending: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  unknown: "bg-white/10 text-white/50 border-white/10",
};

const statusLabels: Record<DeviceStatus, string> = {
  verified: "Определён",
  pending: "Требует проверки",
  unknown: "Не определён",
};

export function Badge({
  status,
  className,
  children,
}: {
  status?: DeviceStatus;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium",
        status ? statusStyles[status] : "bg-white/10 text-white/70 border-white/10",
        className,
      )}
    >
      {children ?? (status ? statusLabels[status] : null)}
    </span>
  );
}
