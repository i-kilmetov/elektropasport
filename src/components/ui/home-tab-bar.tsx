"use client";

import { House, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type HomeTabId = "home" | "add" | "menu";

const TABS: Array<{
  id: HomeTabId;
  label: string;
  icon: typeof House;
}> = [
  { id: "home", label: "Главная", icon: House },
  { id: "add", label: "Добавить", icon: Plus },
  { id: "menu", label: "Меню", icon: Menu },
];

export function HomeTabBar({
  active,
  onChange,
}: {
  active: HomeTabId;
  onChange: (id: HomeTabId) => void;
}) {
  return (
    <nav
      className="pointer-events-none shrink-0 bg-transparent px-5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Основные разделы"
    >
      <div className="pointer-events-auto mx-auto flex max-w-[340px] rounded-full bg-white p-1 shadow-[0_8px_30px_rgba(17,17,19,0.12)]">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 transition-colors",
                selected ? "bg-zinc-100" : "bg-transparent",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  selected ? "text-zinc-900" : "text-zinc-400",
                )}
                strokeWidth={1.5}
              />
              <span
                className={cn(
                  "text-[10px] leading-none",
                  selected
                    ? "font-medium text-zinc-900"
                    : "font-medium text-zinc-400",
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
