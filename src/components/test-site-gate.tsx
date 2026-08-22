"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TestLoginForm } from "@/components/screens/test-login-form";
import { TEST_SITE_INACTIVITY_MS } from "@/lib/test-site-auth";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

const IDLE_CHECK_MS = 30_000;

export function TestSiteGate() {
  const [authed, setAuthed] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const handleAuthed = useCallback(() => {
    lastActivityRef.current = Date.now();
    setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touchActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= TEST_SITE_INACTIVITY_MS) {
        setAuthed(false);
      }
    }, IDLE_CHECK_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touchActivity);
      }
      window.clearInterval(interval);
    };
  }, [authed, touchActivity]);

  if (!authed) {
    return <TestLoginForm onSuccess={handleAuthed} />;
  }

  return (
    <main className="min-h-[var(--app-height,100dvh)] w-full">
      <AppShell />
    </main>
  );
}
