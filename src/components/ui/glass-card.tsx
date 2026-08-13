import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.04),0_8px_24px_rgba(17,17,19,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
