"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 76;
const OPEN_THRESHOLD = 48;

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
  const opened = offset < -OPEN_THRESHOLD / 2;
  const suppressClick = useRef(false);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const next = info.offset.x + offset;
    const shouldOpen = next < -OPEN_THRESHOLD;
    setOffset(shouldOpen ? -ACTION_WIDTH : 0);
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 80);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-[24px]", className)}>
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-rose-500 text-white"
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
