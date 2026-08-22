"use client";

import { useEffect, useState } from "react";
import { homeAppliancesEnabledForHost } from "@/lib/app-env";

export function useHomeAppliancesEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(homeAppliancesEnabledForHost(window.location.hostname));
  }, []);

  return enabled;
}
