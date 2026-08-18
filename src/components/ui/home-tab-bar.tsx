"use client";

import { House, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type HomeTabId = "home" | "add" | "menu";

const TABS: Array<{
  id: HomeTabId;
  label: string;
}> = [
  { id: "home", label: "Главная" },
  { id: "add", label: "Добавить" },
  { id: "menu", label: "Меню" },
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
      className="shrink-0 border-t border-black/[0.06] bg-white px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
      aria-label="Основные разделы"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-1 py-1.5"
            >
              {tab.id === "add" ? (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </span>
              ) : tab.id === "home" ? (
                <House
                  className={cn(
                    "h-6 w-6",
                    selected ? "text-zinc-900" : "text-zinc-400",
                  )}
                  strokeWidth={selected ? 2.25 : 1.8}
                />
              ) : (
                <Menu
                  className={cn(
                    "h-6 w-6",
                    selected ? "text-zinc-900" : "text-zinc-400",
                  )}
                  strokeWidth={selected ? 2.25 : 1.8}
                />
              )}
              <span
                className={cn(
                  "text-[11px] leading-none",
                  selected
                    ? "font-semibold text-zinc-900"
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
