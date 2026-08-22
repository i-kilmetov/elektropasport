"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BRAND_YELLOW } from "@/components/brand-logo";

const SPLASH_MS = 3200;
const REST = "ОКОМ";
const LOGO_INK = "#111113";
const REVEAL_AT_MS = 900;

const logoType = {
  fontFamily: "var(--font-geologica)",
  fontWeight: 500,
  fontSize: "clamp(2.25rem, 9vw, 3.25rem)",
  color: LOGO_INK,
  lineHeight: 1,
  letterSpacing: "-0.02em",
} as const;

function TStripes({ pulsing }: { pulsing: boolean }) {
  const pulse = pulsing
    ? {
        opacity: [0.28, 1, 0.28] as number[],
        scaleX: [0.88, 1, 0.88] as number[],
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
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-full left-1/2 mb-[0.07em] flex -translate-x-1/2 flex-col items-center gap-[0.11em]"
    >
      <motion.span
        className="block h-[0.08em] min-h-[2px] w-[0.28em] max-w-[22px] rounded-full"
        style={{ backgroundColor: LOGO_INK, transformOrigin: "center" }}
        animate={pulse}
        transition={{ ...transition, delay: pulsing ? 0.08 : 0 }}
      />
      <motion.span
        className="block h-[0.08em] min-h-[2px] w-[0.38em] max-w-[30px] rounded-full"
        style={{ backgroundColor: LOGO_INK, transformOrigin: "center" }}
        animate={pulse}
        transition={transition}
      />
    </span>
  );
}

function AnimatedT({ pulsing }: { pulsing: boolean }) {
  return (
    <motion.span
      className="relative inline-block shrink-0"
      style={{ ...logoType, transformOrigin: "50% 100%" }}
      initial={{ rotate: 180, opacity: 0, scale: 0.92 }}
      animate={{
        rotate: [180, 180, 0],
        opacity: 1,
        scale: 1,
      }}
      transition={{
        rotate: {
          duration: 1.35,
          times: [0, 0.42, 1],
          ease: [0.22, 1, 0.36, 1],
        },
        opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <TStripes pulsing={pulsing} />
      Т
    </motion.span>
  );
}

export function BrandSplash({ onComplete }: { onComplete: () => void }) {
  const [stripesPulsing, setStripesPulsing] = useState(true);
  const [restRevealed, setRestRevealed] = useState(false);

  useEffect(() => {
    const pulseStop = window.setTimeout(() => setStripesPulsing(false), 1350);
    const reveal = window.setTimeout(() => setRestRevealed(true), REVEAL_AT_MS);
    const timer = window.setTimeout(onComplete, SPLASH_MS);
    return () => {
      window.clearTimeout(pulseStop);
      window.clearTimeout(reveal);
      window.clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200]"
      style={{ backgroundColor: BRAND_YELLOW }}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{
        duration: 0.45,
        delay: SPLASH_MS / 1000 - 0.45,
        ease: "easeOut",
      }}
      aria-label="Током"
    >
      {/*
        Anchor at viewport center. x: -50% keeps the current wordmark centered
        while OKOM expands — the T slides left as the block grows.
      */}
      <motion.div
        className="absolute top-1/2 left-1/2 flex items-end whitespace-nowrap"
        style={{ ...logoType, x: "-50%", y: "-50%" }}
      >
        <AnimatedT pulsing={stripesPulsing} />

        <motion.span
          className="inline-flex overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: restRevealed ? "auto" : 0,
            opacity: restRevealed ? 1 : 0,
          }}
          transition={{
            width: {
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
            },
            opacity: {
              duration: 0.45,
              delay: restRevealed ? 0.1 : 0,
              ease: "easeOut",
            },
          }}
        >
          {REST.split("").map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              className="inline-block"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={
                restRevealed
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: 8, filter: "blur(4px)" }
              }
              transition={{
                delay: restRevealed ? 0.16 + index * 0.07 : 0,
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
