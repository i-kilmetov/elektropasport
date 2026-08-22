"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BRAND_YELLOW } from "@/components/brand-logo";

const SPLASH_MS = 3200;
const REST = "ОКОМ";

/** Decorative stripes above the T crossbar (local coords, upright). */
function TStripes({ pulsing }: { pulsing: boolean }) {
  const pulse = pulsing
    ? {
        opacity: [0.28, 1, 0.28] as number[],
        scaleX: [0.9, 1, 0.9] as number[],
      }
    : { opacity: 1, scaleX: 1 };

  const transition = pulsing
    ? {
        duration: 0.65,
        repeat: Infinity,
        ease: "easeInOut" as const,
      }
    : { duration: 0.2 };

  return (
    <>
      <motion.rect
        x="5"
        y="10"
        width="22"
        height="5"
        rx="0.6"
        fill={BRAND_YELLOW}
        animate={pulse}
        transition={{ ...transition, delay: pulsing ? 0.08 : 0 }}
        style={{ transformOrigin: "16px 12.5px" }}
      />
      <motion.rect
        x="8"
        y="3"
        width="16"
        height="4"
        rx="0.6"
        fill={BRAND_YELLOW}
        animate={pulse}
        transition={transition}
        style={{ transformOrigin: "16px 5px" }}
      />
    </>
  );
}

function LetterT({ pulsing }: { pulsing: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 32 34"
      aria-hidden
      className="h-[clamp(2.25rem,9vw,3.25rem)] w-auto shrink-0 overflow-visible"
    >
      <motion.g
        initial={{ rotate: 180 }}
        animate={{ rotate: [180, 180, 0] }}
        transition={{
          duration: 1.35,
          times: [0, 0.42, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <rect x="12" y="19" width="8" height="15" rx="0.6" fill={BRAND_YELLOW} />
        <rect x="1" y="19" width="30" height="7" rx="0.6" fill={BRAND_YELLOW} />
        <TStripes pulsing={pulsing} />
      </motion.g>
    </motion.svg>
  );
}

export function BrandSplash({ onComplete }: { onComplete: () => void }) {
  const [stripesPulsing, setStripesPulsing] = useState(true);

  useEffect(() => {
    const pulseStop = window.setTimeout(() => setStripesPulsing(false), 1350);
    const timer = window.setTimeout(onComplete, SPLASH_MS);
    return () => {
      window.clearTimeout(pulseStop);
      window.clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{
        duration: 0.45,
        delay: SPLASH_MS / 1000 - 0.45,
        ease: "easeOut",
      }}
      aria-hidden
    >
      <div className="flex items-end gap-[0.06em] px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <LetterT pulsing={stripesPulsing} />
        </motion.div>

        <div
          className="flex items-end font-sans font-extrabold leading-none tracking-[-0.04em]"
          style={{
            color: BRAND_YELLOW,
            fontSize: "clamp(2.25rem, 9vw, 3.25rem)",
          }}
        >
          {REST.split("").map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              className="inline-block"
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: 1.28 + index * 0.11,
                duration: 0.38,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
