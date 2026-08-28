"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BRAND_YELLOW } from "@/components/brand-logo";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { beginTelegramLogin } from "@/lib/pd-consent-client";
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
/** T stays upside-down for ~62% of the flip timeline. */
const T_ROTATE_DURATION_S = 2;
const T_INVERTED_HOLD_FRACTION = 0.62;

function AnimatedT({
  pulsing,
  wordmarkStyle,
  playOnMount = true,
  upright = false,
}: {
  pulsing: boolean;
  wordmarkStyle: typeof splashWordmarkTypeStyle;
  /** Splash/auth: flip on mount. Launch waitlist: stay inverted until `upright`. */
  playOnMount?: boolean;
  upright?: boolean;
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
    <span
      className="relative inline-block shrink-0"
      style={{ paddingTop: STRIPE_PAD_TOP }}
    >
      <motion.span
        className="relative inline-block"
        style={{
          ...wordmarkStyle,
          transformOrigin: "50% 100%",
        }}
        initial={{ rotate: 180, opacity: 1, scale: 1 }}
        animate={
          playOnMount
            ? { rotate: [180, 180, 0], opacity: 1, scale: 1 }
            : { rotate: upright ? 0 : 180, opacity: 1, scale: 1 }
        }
        transition={
          playOnMount
            ? {
                rotate: {
                  duration: T_ROTATE_DURATION_S,
                  times: [0, T_INVERTED_HOLD_FRACTION, 1],
                  ease: [0.22, 1, 0.36, 1],
                },
              }
            : {
                rotate: {
                  duration: upright ? 0.85 : 0,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
        }
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
    </span>
  );
}

function BrandMark({
  tagline,
  taglineVisible,
  stripesPulsing,
  restRevealed,
  variant = "splash",
  tPlayOnMount = true,
  tUpright = false,
  collapseRest = false,
}: {
  tagline: string;
  taglineVisible: boolean;
  stripesPulsing: boolean;
  restRevealed: boolean;
  variant?: "splash" | "header";
  tPlayOnMount?: boolean;
  tUpright?: boolean;
  /** Keep «ОКОМ» out of layout until revealed so the inverted T sits on center. */
  collapseRest?: boolean;
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

      <div className="flex items-end whitespace-nowrap" style={wordmarkStyle}>
        <AnimatedT
          pulsing={stripesPulsing}
          wordmarkStyle={wordmarkStyle}
          playOnMount={tPlayOnMount}
          upright={tUpright}
        />

        <motion.span
          className={
            collapseRest
              ? "inline-flex overflow-hidden"
              : "inline-flex overflow-visible"
          }
          initial={false}
          animate={{
            opacity: restRevealed ? 1 : 0,
            ...(collapseRest
              ? { maxWidth: restRevealed ? "12em" : 0 }
              : {}),
          }}
          transition={{
            opacity: {
              duration: 0.45,
              delay: restRevealed ? 0.1 : 0,
              ease: "easeOut",
            },
            maxWidth: {
              duration: 0.55,
              delay: restRevealed ? 0.08 : 0,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
        >
          {WORDMARK_REST.split("").map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              className="inline-block"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={
                restRevealed
                  ? { opacity: 1, filter: "blur(0px)" }
                  : { opacity: 0, filter: "blur(8px)" }
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

    const pulseStop = window.setTimeout(
      () => setStripesPulsing(false),
      REVEAL_AT_MS,
    );
    const reveal = window.setTimeout(() => setRestRevealed(true), REVEAL_AT_MS);
    const tagline = window.setTimeout(
      () => setTaglineVisible(true),
      TAGLINE_AT_MS,
    );
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
  const [starting, setStarting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState(0);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    const node = logoRef.current;
    if (!node) return;

    const measure = () => setLogoWidth(node.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [animation.restRevealed]);

  const handleLogin = () => {
    setLoginError(null);
    setStarting(true);
    onLogin();
    void beginTelegramLogin().catch((error) => {
      setStarting(false);
      setLoginError(
        error instanceof Error ? error.message : "Не удалось начать вход",
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex touch-none flex-col items-center overflow-hidden px-5"
      style={{
        backgroundColor: BRAND_YELLOW,
        height: "var(--app-height, 100dvh)",
        paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
      }}
      aria-label="Током — вход"
    >
      <div className="relative min-h-0 flex-1 w-full">
        <div ref={logoRef} className="absolute top-1/2 left-1/2 w-max -translate-x-1/2 -translate-y-1/2">
          <BrandMark
            tagline=""
            taglineVisible={false}
            stripesPulsing={animation.stripesPulsing}
            restRevealed={animation.restRevealed}
          />
        </div>
      </div>

      <motion.div
        className="mx-auto w-full shrink-0 pb-2"
        style={{
          maxWidth: logoWidth > 0 ? logoWidth : undefined,
        }}
        initial={false}
        animate={{
          opacity: animation.loginVisible && logoWidth > 0 ? 1 : 0,
          y: animation.loginVisible && logoWidth > 0 ? 0 : 12,
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <Button
          type="button"
          className="mx-auto flex h-14 min-h-14 w-full gap-2.5 rounded-full bg-[#111113] px-6 text-[16px] text-white hover:bg-zinc-800"
          disabled={!animation.loginVisible || starting || logoWidth <= 0}
          onClick={handleLogin}
        >
          <TelegramAppIcon className="h-6 w-6 shrink-0 text-current" />
          {starting ? "Открываем Telegram…" : "Войти через Telegram"}
        </Button>
        {loginError && (
          <p className="mt-3 text-center text-[13px] text-red-700">
            {loginError}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Production pre-launch screen: email waitlist instead of Telegram login. */
export function BrandLaunchWaitlist({
  bootReady: _bootReady = true,
}: {
  bootReady?: boolean;
}) {
  const [earthFlipped, setEarthFlipped] = useState(false);
  const [tUpright, setTUpright] = useState(false);
  const [restRevealed, setRestRevealed] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const flipTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of flipTimersRef.current) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyTop = body.style.top;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = "0";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.top = prevBodyTop;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      setViewportHeight(height);
      const root = rootRef.current;
      if (root) {
        root.style.height = `${Math.round(height)}px`;
        root.style.top = `${Math.round(offsetTop)}px`;
      }
      const keyboard =
        window.innerHeight - height > 80 || offsetTop > 0;
      setKeyboardOpen(keyboard);
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const measure = () => setLogoWidth(node.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const keepInPlace = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    });
  };

  const flipEarth = () => {
    if (earthFlipped) return;
    setEarthFlipped(true);
    setTUpright(true);
    const reveal = window.setTimeout(() => setRestRevealed(true), 140);
    flipTimersRef.current.push(reveal);
  };

  const submit = async () => {
    setError(null);
    const value = email.trim().toLowerCase();
    if (!isValidEmail(value)) {
      setError("Введите корректный email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: "launch", email: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить");
      }
      setDone(true);
      inputRef.current?.blur();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  };

  const columnWidth = logoWidth > 0 ? logoWidth : undefined;
  const showEmail = earthFlipped;

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-0 top-0 z-[200] flex touch-none flex-col items-center overflow-hidden px-5"
      style={{
        backgroundColor: BRAND_YELLOW,
        height: viewportHeight
          ? `${Math.round(viewportHeight)}px`
          : "var(--app-height, 100dvh)",
        paddingBottom: keyboardOpen
          ? "0.75rem"
          : "max(1.75rem, env(safe-area-inset-bottom))",
      }}
      aria-label="Током — подписка на открытие"
    >
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 -z-10 whitespace-nowrap opacity-0"
        style={splashWordmarkTypeStyle}
      >
        <span className="inline-block" style={{ paddingTop: STRIPE_PAD_TOP }}>
          Т{WORDMARK_REST}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 w-full">
        <div className="absolute top-1/2 left-1/2 w-max -translate-x-1/2 -translate-y-1/2">
          <BrandMark
            tagline=""
            taglineVisible={false}
            stripesPulsing={false}
            restRevealed={restRevealed}
            tPlayOnMount={false}
            tUpright={tUpright}
            collapseRest
          />
        </div>
      </div>

      <div
        className="mx-auto w-full shrink-0"
        style={{ maxWidth: columnWidth ?? "min(100%, 28rem)" }}
      >
        {done ? (
          <div className="mx-auto flex h-14 min-h-14 w-full items-center justify-center rounded-full bg-[#111113] px-6 text-[16px] text-white">
            Спасибо! Сообщим об открытии
          </div>
        ) : showEmail ? (
          <form
            className="launch-email-field mx-auto flex h-14 min-h-14 w-full items-center gap-2 rounded-full bg-[#111113] px-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <input
              ref={inputRef}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="done"
              placeholder="Email для новости об открытии"
              value={email}
              disabled={submitting}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={keepInPlace}
              onBlur={keepInPlace}
              className="launch-email-input h-full min-w-0 flex-1 rounded-full border-0 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-white/55 disabled:opacity-60"
              aria-label="Email для новости об открытии"
            />
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#111113] disabled:opacity-60"
            >
              {submitting ? "…" : "OK"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={flipEarth}
            className="mx-auto flex h-14 min-h-14 w-full items-center justify-center rounded-full bg-[#111113] px-6 text-[16px] font-semibold text-white hover:bg-zinc-800"
          >
            Перевернуть землю
          </button>
        )}
        {error && (
          <p className="mt-3 text-center text-[13px] text-red-700">{error}</p>
        )}
      </div>
    </div>
  );
}
