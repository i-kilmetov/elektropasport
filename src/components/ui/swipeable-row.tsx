"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 76;
const OPEN_THRESHOLD = 48;
const REVEAL_THRESHOLD = 8;

export function SwipeableRow({
  children,
  onDelete,
  className,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}) {
  const [offset, setOffset] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const suppressClick = useRef(false);

  const visualX = dragging ? offset + dragX : offset;
  const opened = offset < -OPEN_THRESHOLD / 2;
  const showAction = visualX < -REVEAL_THRESHOLD;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const next = info.offset.x + offset;
    const shouldOpen = next < -OPEN_THRESHOLD;
    setOffset(shouldOpen ? -ACTION_WIDTH : 0);
    setDragX(0);
    setDragging(false);
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 80);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-[24px]", className)}>
      <button
        type="button"
        tabIndex={showAction ? 0 : -1}
        aria-hidden={!showAction}
        className={cn(
          "absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-rose-500 text-white transition-opacity duration-150",
          showAction
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-label="Удалить"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-6 w-6" />
      </button>

      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0.06}
        animate={{ x: offset }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        onDragStart={() => {
          setDragging(true);
          setDragX(0);
        }}
        onDrag={(_, info) => {
          setDragX(info.offset.x);
        }}
        onDragEnd={onDragEnd}
        className="relative z-10 touch-pan-y"
      >
        <div
          onClickCapture={(e) => {
            if (suppressClick.current || opened) {
              e.preventDefault();
              e.stopPropagation();
              if (opened) setOffset(0);
            }
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
