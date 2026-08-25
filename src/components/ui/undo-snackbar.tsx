"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "@/components/ui/portal";

const DEFAULT_MS = 3000;

/**
 * Bottom snackbar with a wiping “Отменить” control.
 * Progress fills/erases the undo button over `durationMs`; then `onCommit` runs.
 */
export function UndoSnackbar({
  message,
  durationMs = DEFAULT_MS,
  undoLabel = "Отменить",
  onUndo,
  onCommit,
}: {
  message: string;
  durationMs?: number;
  undoLabel?: string;
  onUndo: () => void;
  onCommit: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const committed = useRef(false);
  const undone = useRef(false);
  const onCommitRef = useRef(onCommit);
  const onUndoRef = useRef(onUndo);
  onCommitRef.current = onCommit;
  onUndoRef.current = onUndo;

  useEffect(() => {
    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      if (undone.current || committed.current) return;
      const ratio = Math.min(1, (now - started) / durationMs);
      setProgress(ratio);
      if (ratio >= 1) {
        committed.current = true;
        onCommitRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs]);

  const undo = () => {
    if (undone.current || committed.current) return;
    undone.current = true;
    onUndoRef.current();
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[140] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[20px] border border-white/10 bg-zinc-900 px-3 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
          <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-white">
            {message}
          </p>
          <button
            type="button"
            onClick={undo}
            className="relative h-10 shrink-0 overflow-hidden rounded-full bg-white px-4 text-[13px] font-semibold text-zinc-900"
            aria-label={undoLabel}
          >
            <span className="relative z-10">{undoLabel}</span>
            <span
              aria-hidden
              className="absolute inset-0 z-20 bg-zinc-900"
              style={{
                transform: `translateX(${(progress - 1) * 100}%)`,
              }}
            />
          </button>
        </div>
      </motion.div>
    </Portal>
  );
}

/** Stable snackbar host for a single pending undoable action. */
export function UndoSnackbarHost({
  action,
}: {
  action: {
    key: string;
    message: string;
    onUndo: () => void;
    onCommit: () => void;
  } | null;
}) {
  return (
    <AnimatePresence>
      {action && (
        <UndoSnackbar
          key={action.key}
          message={action.message}
          onUndo={action.onUndo}
          onCommit={action.onCommit}
        />
      )}
    </AnimatePresence>
  );
}
