"use client";

import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { SchoolDiagram } from "@/components/school/diagrams";
import { GlassCard } from "@/components/ui/glass-card";
import type { LessonBlock } from "@/lib/school/types";
import { cn } from "@/lib/utils";

const CALLOUT = {
  tip: {
    icon: Lightbulb,
    wrap: "border-[#D3DA00]/50 bg-[#D3DA00]/15",
    iconWrap: "bg-[#D3DA00] text-[#111113]",
  },
  warn: {
    icon: AlertTriangle,
    wrap: "border-amber-200 bg-amber-50",
    iconWrap: "bg-amber-100 text-amber-800",
  },
  story: {
    icon: Sparkles,
    wrap: "border-violet-200 bg-violet-50",
    iconWrap: "bg-violet-100 text-violet-800",
  },
} as const;

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <LessonBlockView key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

function LessonBlockView({ block }: { block: LessonBlock }) {
  if (block.type === "text") {
    return (
      <p className="text-[15px] leading-relaxed text-zinc-700">{block.text}</p>
    );
  }

  if (block.type === "callout") {
    const tone = CALLOUT[block.tone];
    const Icon = tone.icon;
    return (
      <GlassCard className={cn("flex gap-3 p-4", tone.wrap)}>
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
            tone.iconWrap,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[14px] font-semibold text-zinc-900">
            {block.title}
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-zinc-600">
            {block.text}
          </p>
        </div>
      </GlassCard>
    );
  }

  if (block.type === "diagram") {
    return (
      <figure>
        <SchoolDiagram id={block.id} />
        <figcaption className="mt-2 text-center text-[13px] leading-snug text-zinc-500">
          {block.caption}
        </figcaption>
      </figure>
    );
  }

  if (block.type === "example") {
    return (
      <GlassCard className="p-4">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-zinc-400">
          Пример из жизни
        </div>
        <div className="mt-1 text-[15px] font-semibold text-zinc-900">
          {block.title}
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">
          {block.text}
        </p>
      </GlassCard>
    );
  }

  if (block.type === "steps") {
    return (
      <GlassCard className="p-4">
        {block.title ? (
          <div className="mb-3 text-[15px] font-semibold text-zinc-900">
            {block.title}
          </div>
        ) : null}
        <ol className="space-y-2.5">
          {block.items.map((item, index) => (
            <li key={item} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-[14px] leading-relaxed text-zinc-700">
                {item}
              </span>
            </li>
          ))}
        </ol>
      </GlassCard>
    );
  }

  if (block.type === "formula") {
    return (
      <GlassCard className="p-4 text-center">
        <div className="font-mono text-[22px] font-semibold tracking-tight text-zinc-900">
          {block.formula}
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
          {block.explain}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="divide-y divide-black/[0.06]">
      {block.title ? (
        <div className="px-4 py-3 text-[15px] font-semibold text-zinc-900">
          {block.title}
        </div>
      ) : null}
      {block.items.map((item) => (
        <div key={item.label} className="flex gap-3 px-4 py-3">
          <div className="w-[40%] shrink-0 text-[13px] font-semibold text-zinc-900">
            {item.label}
          </div>
          <div className="text-[13px] leading-snug text-zinc-600">
            {item.value}
          </div>
        </div>
      ))}
    </GlassCard>
  );
}
