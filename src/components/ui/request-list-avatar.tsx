"use client";

import type { InstallRequest } from "@/types";
import { resolveRequestListAvatar } from "@/lib/request-list-avatar";
import { cn } from "@/lib/utils";

export function RequestListAvatar({
  request,
  className,
}: {
  request: InstallRequest;
  className?: string;
}) {
  const { Icon, bgClass, iconClass } = resolveRequestListAvatar(request);

  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
        bgClass,
        className,
      )}
    >
      <Icon className={cn("h-5 w-5", iconClass)} />
    </div>
  );
}
