"use client";

import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenNearbyElectricalStoresButton } from "@/components/screens/open-nearby-electrical-stores-button";

export function MasterNotFoundScreen({
  city,
  address,
  lat,
  lon,
  onClose,
}: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  onClose: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Phone className="h-8 w-8" />
        </div>
        <div>
          <h2 className="mb-2 ty-title">
            Не нашли свободных мастеров
          </h2>
          <p className="max-w-[300px] ty-body">
            Все мастера сейчас заняты, но мы обязательно свяжемся с вами в течение дня.
          </p>
        </div>
        <OpenNearbyElectricalStoresButton
          city={city}
          address={address}
          lat={lat}
          lon={lon}
          className="w-full max-w-xs"
        />
        <Button onClick={onClose}>Понятно</Button>
      </div>
    </motion.section>
  );
}
