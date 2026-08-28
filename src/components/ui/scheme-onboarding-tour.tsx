"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  SCHEME_TOUR_STEPS,
  type SchemeTourStep,
  type SchemeTourStepId,
} from "@/lib/scheme-onboarding";
import { cn } from "@/lib/utils";

const PAD = 10;
const CARD_GAP = 12;

function findTourTarget(id: SchemeTourStepId): HTMLElement | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-scheme-tour="${id}"]`),
  );
  return (
    nodes.find((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 8 && rect.height > 8;
    }) ?? null
  );
}

function collectAvailableSteps(): SchemeTourStep[] {
  return SCHEME_TOUR_STEPS.filter((step) => Boolean(findTourTarget(step.id)));
}

type SpotRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clampTooltipTop(spot: SpotRect, tooltipH: number): {
  top: number;
  place: "above" | "below";
} {
  const below = spot.top + spot.height + CARD_GAP;
  const above = spot.top - tooltipH - CARD_GAP;
  const maxTop = window.innerHeight - tooltipH - 16;
  if (below + tooltipH <= window.innerHeight - 12) {
    return { top: Math.min(below, maxTop), place: "below" };
  }
  if (above >= 12) {
    return { top: Math.max(12, above), place: "above" };
  }
  return { top: Math.max(12, Math.min(below, maxTop)), place: "below" };
}

export function SchemeOnboardingTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [tooltipH, setTooltipH] = useState(180);
  const [steps, setSteps] = useState<SchemeTourStep[]>(SCHEME_TOUR_STEPS);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;
  const stepCount = steps.length;

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSpot(null);
      return;
    }
    // Defer so targets are laid out after scheme mount.
    const timer = window.setTimeout(() => {
      const available = collectAvailableSteps();
      setSteps(available.length > 0 ? available : SCHEME_TOUR_STEPS);
      setStepIndex(0);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const el = findTourTarget(step.id);
      if (!el) {
        setSpot(null);
        return;
      }
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
      const rect = el.getBoundingClientRect();
      setSpot({
        top: Math.max(8, rect.top - PAD),
        left: Math.max(8, rect.left - PAD),
        width: Math.min(window.innerWidth - 16, rect.width + PAD * 2),
        height: Math.min(window.innerHeight - 16, rect.height + PAD * 2),
      });
    };

    const raf = window.requestAnimationFrame(() => {
      measure();
      window.setTimeout(measure, 320);
    });

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step, stepIndex]);

  const tooltipPos = useMemo(() => {
    if (typeof window === "undefined") {
      return { top: 120, left: 16 };
    }
    if (!spot) {
      return { top: Math.round(window.innerHeight * 0.35), left: 16 };
    }
    const clamped = clampTooltipTop(spot, tooltipH);
    const left = Math.min(
      Math.max(16, spot.left),
      Math.max(16, window.innerWidth - 320 - 16),
    );
    return { top: clamped.top, left };
  }, [spot, tooltipH]);

  if (!open || !step) return null;

  const finish = () => onClose();
  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  };
  const goBack = () => {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[140]" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Пропустить подсказки"
          className="absolute inset-0 cursor-default bg-transparent"
          onClick={finish}
        />

        {spot && (
          <motion.div
            key={`spot-${step.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute rounded-[22px] ring-2 ring-white/90"
            style={{
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              boxShadow: "0 0 0 9999px rgba(17, 17, 19, 0.62)",
            }}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            ref={(node) => {
              if (node) setTooltipH(node.offsetHeight);
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "absolute z-[1] w-[min(100%-2rem,320px)] rounded-[22px] border border-black/8 bg-white p-4 shadow-2xl",
            )}
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 ty-badge text-zinc-500">
              {stepIndex + 1} из {stepCount}
            </p>
            <h3 className="ty-title">
              {step.title}
            </h3>
            <p className="mt-2 ty-body">
              {step.body}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {stepIndex > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={goBack}
                >
                  Назад
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={finish}
                >
                  Пропустить
                </Button>
              )}
              <Button type="button" size="sm" className="flex-1" onClick={goNext}>
                {isLast ? "Понятно" : "Далее"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Portal>
  );
}
