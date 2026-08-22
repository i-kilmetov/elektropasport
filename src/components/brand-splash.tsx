"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, MessagesSquare, Zap } from "lucide-react";
import { BRAND_YELLOW } from "@/components/brand-logo";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LOGO_FONT_WEIGHT,
  LOGO_INK,
  headerWordmarkTypeStyle,
  splashWordmarkTypeStyle,
  STRIPE_ABOVE_CROSSBAR,
  STRIPE_BOTTOM_WIDTH,
  STRIPE_HEIGHT,
  STRIPE_PAD_TOP,
  STRIPE_STRIPE_GAP,
  STRIPE_TOP_WIDTH,
  T_CAP_BEARING,
  WORDMARK_REST,
} from "@/lib/brand-wordmark";

const SPLASH_MS = 4000;
const BOOT_TAGLINE = "ПРОВЕРЬ ЩИТОК";
/** lub-dub pulse: two quick beats, then rest (~52 bpm). */
const HEARTBEAT_OPACITY = [0.3, 1, 0.42, 0.9, 0.3] as const;
const HEARTBEAT_SCALE = [0.86, 1.05, 0.88, 1.02, 0.86] as const;
const HEARTBEAT_TIMES = [0, 0.09, 0.17, 0.26, 1] as const;
const HEARTBEAT_DURATION_S = 1.2;
/** Hold inverted T while boot fetch runs, then reveal OKOM. */
const REVEAL_AT_MS = 1750;
/** OKOM width (0.9s) finishes ~2650ms; show tagline after full wordmark. */
const TAGLINE_AT_MS = 2750;
const LOGIN_BUTTON_DELAY_MS = 420;
/** After tagline — shift logo up and reveal value props layout. */
const AUTH_LAYOUT_EXPAND_DELAY_MS = 520;
/** Equal step between each card and before the login button. */
const AUTH_REVEAL_STEP_MS = 480;
const AUTH_REVEAL_START_MS = 180;
/** Equal gap: logo ↔ points ↔ login button. */
const AUTH_SECTION_GAP = "gap-6";
/** T stays upside-down for ~62% of the flip timeline. */
const T_ROTATE_DURATION_S = 2;
const T_INVERTED_HOLD_FRACTION = 0.62;

function AnimatedT({
  pulsing,
  wordmarkStyle,
}: {
  pulsing: boolean;
  wordmarkStyle: typeof splashWordmarkTypeStyle;
}) {
  const pulse = pulsing
    ? {
        opacity: [...HEARTBEAT_OPACITY],
        scaleX: [...HEARTBEAT_SCALE],
      }
    : { opacity: 1, scaleX: 1 };

  const transition = pulsing
    ? {
        duration: HEARTBEAT_DURATION_S,
        times: [...HEARTBEAT_TIMES],
        repeat: Infinity,
        ease: "easeInOut" as const,
      }
    : { duration: 0.2 };

  return (
    <motion.span
      className="relative inline-block shrink-0"
      style={{
        ...wordmarkStyle,
        paddingTop: STRIPE_PAD_TOP,
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
          duration: T_ROTATE_DURATION_S,
          times: [0, T_INVERTED_HOLD_FRACTION, 1],
          ease: [0.22, 1, 0.36, 1],
        },
        opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <span className="relative inline-block leading-none">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
          style={{
            gap: STRIPE_STRIPE_GAP,
            bottom: `calc(100% - ${T_CAP_BEARING})`,
            paddingBottom: STRIPE_ABOVE_CROSSBAR,
          }}
        >
          <motion.span
            className="block min-h-[3px] max-w-[14px]"
            style={{
              width: STRIPE_TOP_WIDTH,
              height: STRIPE_HEIGHT,
              backgroundColor: LOGO_INK,
              transformOrigin: "center",
            }}
            animate={pulse}
            transition={transition}
          />
          <motion.span
            className="block h-[0.08em] min-h-[3px] max-w-[46px]"
            style={{
              width: STRIPE_BOTTOM_WIDTH,
              backgroundColor: LOGO_INK,
              transformOrigin: "center",
            }}
            animate={pulse}
            transition={transition}
          />
        </span>
        Т
      </span>
    </motion.span>
  );
}

function BrandMark({
  tagline,
  taglineVisible,
  stripesPulsing,
  restRevealed,
  variant = "splash",
}: {
  tagline: string;
  taglineVisible: boolean;
  stripesPulsing: boolean;
  restRevealed: boolean;
  variant?: "splash" | "header";
}) {
  const wordmarkStyle =
    variant === "header" ? headerWordmarkTypeStyle : splashWordmarkTypeStyle;
  const taglineFontSize =
    variant === "header"
      ? "clamp(0.65rem, min(2.8vw, 4vh), 0.85rem)"
      : "clamp(0.93rem, min(3.68vw, 5vh), 1.32rem)";

  return (
    <div className="relative inline-block">
      <motion.p
        aria-hidden={!taglineVisible}
        className="pointer-events-none absolute right-0 text-right leading-none whitespace-nowrap"
        style={{
          bottom: "calc(100% + 0.62em)",
          width: "66.67%",
          fontFamily: "var(--font-geologica)",
          fontWeight: LOGO_FONT_WEIGHT,
          fontSize: taglineFontSize,
          letterSpacing: "0.14em",
          color: LOGO_INK,
        }}
        initial={{ opacity: 0, y: 6 }}
        animate={taglineVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{
          duration: 0.38,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {tagline}
      </motion.p>

      <div
        className="flex items-end whitespace-nowrap"
        style={wordmarkStyle}
      >
        <AnimatedT pulsing={stripesPulsing} wordmarkStyle={wordmarkStyle} />

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
          {WORDMARK_REST.split("").map((letter, index) => (
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
      </div>
    </div>
  );
}

function useLogoAnimation(bootReady = true) {
  const [stripesPulsing, setStripesPulsing] = useState(true);
  const [restRevealed, setRestRevealed] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);

  useEffect(() => {
    if (!bootReady) return;

    const pulseStop = window.setTimeout(() => setStripesPulsing(false), REVEAL_AT_MS);
    const reveal = window.setTimeout(() => setRestRevealed(true), REVEAL_AT_MS);
    const tagline = window.setTimeout(() => setTaglineVisible(true), TAGLINE_AT_MS);
    const login = window.setTimeout(
      () => setLoginVisible(true),
      TAGLINE_AT_MS + LOGIN_BUTTON_DELAY_MS,
    );
    return () => {
      window.clearTimeout(pulseStop);
      window.clearTimeout(reveal);
      window.clearTimeout(tagline);
      window.clearTimeout(login);
    };
  }, [bootReady]);

  return {
    stripesPulsing,
    restRevealed,
    taglineVisible,
    loginVisible,
  };
}

const AUTH_VALUE_POINTS = [
  {
    id: "photo",
    icon: Camera,
    title: "Диагностика по фото",
    text: "Сфотографируйте щиток — покажем риски и подскажем, что делать дальше",
  },
  {
    id: "plain",
    icon: MessagesSquare,
    title: "Простым языком",
    text: "Объясняем спокойно и по делу — разберётся каждый, даже без опыта",
  },
  {
    id: "help",
    icon: Zap,
    title: "Помощь с электрикой",
    text: "Онлайн-консультация или вызов проверенного мастера — в один клик",
  },
] as const;

function AuthValuePoints({ revealedCount }: { revealedCount: number }) {
  return (
    <ul className="w-full max-w-md space-y-2.5">
      {AUTH_VALUE_POINTS.map((point, index) => {
        const Icon = point.icon;
        const visible = index < revealedCount;

        return (
          <motion.li
            key={point.id}
            className="flex min-h-[4.75rem] items-start gap-3 rounded-[18px] border border-[#111113]/10 bg-[#111113]/[0.05] px-3.5 py-3 text-left shadow-[0_10px_30px_rgba(17,17,19,0.06)]"
            initial={false}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{
              duration: 0.42,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-hidden={!visible}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111113] text-[#D3DA00]">
              <Icon className="h-5 w-5" strokeWidth={2.1} />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[16px] leading-snug font-semibold text-[#111113]">
                {point.title}
              </span>
              <span className="mt-1 block text-[14px] leading-relaxed text-[#111113]/72">
                {point.text}
              </span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

export function BrandSplash({
  onComplete,
  bootReady = true,
}: {
  onComplete: () => void;
  bootReady?: boolean;
}) {
  const animation = useLogoAnimation(bootReady);
  const [fadeOut, setFadeOut] = useState(false);
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    if (!bootReady || fadeOut || completedRef.current) return;

    const tryDismiss = () => {
      if (!bootReady || completedRef.current) return;
      if (Date.now() - startedAtRef.current < SPLASH_MS) return;

      completedRef.current = true;
      setFadeOut(true);
      window.setTimeout(onComplete, 450);
    };

    tryDismiss();
    const interval = window.setInterval(tryDismiss, 80);
    return () => window.clearInterval(interval);
  }, [bootReady, fadeOut, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200]"
      style={{ backgroundColor: BRAND_YELLOW }}
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{
        duration: 0.45,
        ease: "easeOut",
      }}
      aria-label="Током"
    >
      <motion.div
        className="absolute top-1/2 left-1/2"
        style={{ x: "-50%", y: "-50%" }}
      >
        <BrandMark
          tagline={BOOT_TAGLINE}
          taglineVisible={animation.taglineVisible}
          stripesPulsing={animation.stripesPulsing}
          restRevealed={animation.restRevealed}
        />
      </motion.div>
    </motion.div>
  );
}

export function BrandAuthIntro({
  onLogin,
  bootReady = true,
}: {
  onLogin: () => void;
  bootReady?: boolean;
}) {
  const animation = useLogoAnimation(bootReady);
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!animation.taglineVisible) {
      setLayoutExpanded(false);
      return;
    }

    const expand = window.setTimeout(
      () => setLayoutExpanded(true),
      AUTH_LAYOUT_EXPAND_DELAY_MS,
    );
    return () => window.clearTimeout(expand);
  }, [animation.taglineVisible]);

  useEffect(() => {
    if (!layoutExpanded) {
      setRevealStep(0);
      return;
    }

    const totalSteps = AUTH_VALUE_POINTS.length + 1;
    const timers = Array.from({ length: totalSteps }, (_, index) =>
      window.setTimeout(
        () => setRevealStep(index + 1),
        AUTH_REVEAL_START_MS + index * AUTH_REVEAL_STEP_MS,
      ),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [layoutExpanded]);

  const handleLogin = () => {
    setStarting(true);
    onLogin();
  };

  const revealedPoints = Math.min(revealStep, AUTH_VALUE_POINTS.length);
  const showFooter = revealStep >= AUTH_VALUE_POINTS.length + 1;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col overflow-hidden px-5",
        layoutExpanded && AUTH_SECTION_GAP,
      )}
      style={{
        backgroundColor: BRAND_YELLOW,
        height: "var(--app-height, 100dvh)",
      }}
      aria-label="Током — вход"
    >
      <div
        className={cn(
          "flex w-full justify-center",
          layoutExpanded
            ? "shrink-0 pt-[max(2.25rem,calc(env(safe-area-inset-top)+1.25rem))]"
            : "min-h-0 flex-1 items-center",
        )}
      >
        <div className={layoutExpanded ? "pt-6" : undefined}>
          <BrandMark
            tagline={BOOT_TAGLINE}
            taglineVisible={animation.taglineVisible}
            stripesPulsing={animation.stripesPulsing}
            restRevealed={animation.restRevealed}
          />
        </div>
      </div>

      {layoutExpanded && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <AuthValuePoints revealedCount={revealedPoints} />
          </div>

          <div className="w-full shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <motion.div
              initial={false}
              animate={{ opacity: showFooter ? 1 : 0 }}
              transition={{
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
            <Button
              asChild
              className="mx-auto h-14 min-h-[3.5rem] w-full max-w-sm gap-2.5 rounded-full bg-[#111113] px-6 text-[16px] text-white hover:bg-zinc-800"
              disabled={!showFooter || starting}
            >
              <a
                href="/api/auth/telegram/start"
                onClick={(event) => {
                  if (!showFooter || starting) {
                    event.preventDefault();
                    return;
                  }
                  handleLogin();
                }}
              >
                <TelegramAppIcon className="h-6 w-6 shrink-0 text-current" />
                {starting ? "Открываем Telegram…" : "Войти через Telegram"}
              </a>
            </Button>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
