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
  fontSize: "clamp(4.5rem, 18vw, 6.5rem)",
  color: LOGO_INK,
  lineHeight: 1,
  letterSpacing: "-0.02em",
} as const;

/** Gap between the two stripes */
const STRIPE_STRIPE_GAP = "0.024em";
/** Tight gap from lower stripe to the T crossbar */
const STRIPE_T_GAP = "0.004em";

function AnimatedT({ pulsing }: { pulsing: boolean }) {
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
    <motion.span
      className="inline-flex shrink-0 flex-col items-center"
      style={{
        ...logoType,
        transformOrigin: "center center",
      }}
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
      <span
        className="flex flex-col items-center"
        style={{ gap: STRIPE_STRIPE_GAP }}
      >
        <motion.span
          aria-hidden
          className="block h-[0.08em] min-h-[3px] w-[0.28em] max-w-[44px]"
          style={{ backgroundColor: LOGO_INK, transformOrigin: "center" }}
          animate={pulse}
          transition={transition}
        />
        <motion.span
          aria-hidden
          className="block h-[0.08em] min-h-[3px] w-[0.38em] max-w-[60px]"
          style={{ backgroundColor: LOGO_INK, transformOrigin: "center" }}
          animate={pulse}
          transition={{ ...transition, delay: pulsing ? 0.08 : 0 }}
        />
      </span>
      <span className="leading-none" style={{ marginTop: STRIPE_T_GAP }}>
        Т
      </span>
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
        Stripes sit in layout flow so the block height includes them.
        x: -50% keeps the wordmark centered while OKOM expands.
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
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={
                restRevealed
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: 16, filter: "blur(8px)" }
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
