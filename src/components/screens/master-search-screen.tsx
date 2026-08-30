"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { dispatchToMasters, pollRequestStatus } from "@/lib/user-data";

const MasterSearchMap = dynamic(
  () =>
    import("@/components/screens/master-search-map").then(
      (mod) => mod.MasterSearchMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="master-search-map master-search-map--loading absolute inset-0 z-0" />
    ),
  },
);

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 60_000;

export function MasterSearchScreen({
  requestId,
  city,
  address,
  lat,
  lon,
  onMasterFound,
  onTimeout,
}: {
  requestId: string;
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  onMasterFound: (master: {
    firstName: string;
    phone: string;
    username: string;
    rating?: number;
  }) => void;
  onTimeout: () => void;
}) {
  const [dots, setDots] = useState("");
  const dispatched = useRef(false);
  const timedOut = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 600);
    return () => clearInterval(id);
  }, []);

  const startPolling = useCallback(() => {
    const startTime = Date.now();
    const poll = async () => {
      if (timedOut.current) return;
      try {
        const result = await pollRequestStatus(requestId);
        if (result.status === "accepted" && result.master) {
          onMasterFound(result.master);
          return;
        }
      } catch {
        // continue polling
      }
      if (Date.now() - startTime > TIMEOUT_MS) {
        timedOut.current = true;
        onTimeout();
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    void poll();
  }, [requestId, onMasterFound, onTimeout]);

  useEffect(() => {
    if (dispatched.current) return;
    dispatched.current = true;
    void (async () => {
      const result = await dispatchToMasters(requestId);
      if (result.mastersCount === 0) {
        onTimeout();
        return;
      }
      startPolling();
    })();
  }, [requestId, startPolling, onTimeout]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative h-full min-h-0 w-full flex-1 overflow-hidden"
    >
      <MasterSearchMap
        lat={lat}
        lon={lon}
        city={city}
        address={address}
        className="absolute inset-0 z-0"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto mx-auto w-full max-w-sm rounded-[28px] border border-black/8 bg-white/95 p-5 text-center shadow-[0_16px_40px_rgba(17,17,19,0.16)] backdrop-blur-md">
          <h2 className="mb-2 ty-title">
            Ищем мастера{dots}
          </h2>
          <p className="mb-4 ty-body">
            Отправили вашу заявку всем доступным мастерам. Обычно кто-то
            откликается за минуту.
          </p>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#A8AE00]" />
        </div>
      </div>
    </motion.section>
  );
}
