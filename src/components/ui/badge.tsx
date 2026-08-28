import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types";

const statusStyles: Record<DeviceStatus, string> = {
  verified: "bg-emerald-500/12 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/12 text-amber-700 border-amber-500/20",
  unknown: "bg-zinc-100 text-zinc-500 border-zinc-200",
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
        "inline-flex items-center rounded-full border px-2.5 py-1 ty-badge",
        status ? statusStyles[status] : "bg-zinc-100 text-zinc-600 border-zinc-200",
        className,
      )}
    >
      {children ?? (status ? statusLabels[status] : null)}
    </span>
  );
}
