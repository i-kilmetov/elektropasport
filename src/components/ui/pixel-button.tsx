"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PixelButton({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const primary =
    variant === "primary"
      ? "bg-zinc-900 text-[#D3DA00] shadow-[0_6px_0_0_#71717a,0_6px_0_4px_#000,inset_0_2px_0_0_rgba(255,255,255,0.12)] active:translate-y-1 active:shadow-[0_2px_0_0_#71717a,0_2px_0_2px_#000]"
      : "bg-transparent text-zinc-600 shadow-none active:opacity-70";

  return (
    <button
      type="button"
      className={cn(
        "relative w-full max-w-[280px] border-4 border-zinc-900 px-6 py-4",
        "font-mono text-[18px] font-bold uppercase tracking-[0.2em]",
        "transition-transform duration-75 select-none",
        primary,
        className,
      )}
      {...props}
    >
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}
