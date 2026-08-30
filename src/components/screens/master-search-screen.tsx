"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import { NearbyElectricalStoresPanel } from "@/components/screens/nearby-electrical-stores-panel";
import { dispatchToMasters, pollRequestStatus } from "@/lib/user-data";

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
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-emerald-500/50"
              animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Search className="h-7 w-7" />
            </div>
          </div>

          <div>
            <h2 className="mb-2 ty-title">
              Ищем мастера{dots}
            </h2>
            <p className="max-w-[300px] ty-body">
              Отправили вашу заявку всем доступным мастерам. Обычно кто-то
              откликается за минуту.
            </p>
          </div>

          <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
        </div>
      </div>

      <NearbyElectricalStoresPanel
        city={city}
        address={address}
        lat={lat}
        lon={lon}
      />
    </motion.section>
  );
}
