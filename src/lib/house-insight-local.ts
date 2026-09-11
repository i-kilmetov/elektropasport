import {
  electricalGuessForYear,
  houseInsightToPanelSnapshot,
  type HouseInsight,
  type PanelHouseSnapshot,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";

/** Local fallback when server lookup is unavailable. */
export function buildLocalHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): HouseInsight {
  const city = input.city.trim();
  const address = input.address.trim();
  const rawFiasId = input.fiasId?.trim() || null;
  const fiasId = rawFiasId?.startsWith("mos:") ? null : rawFiasId;
  const grounding = assessGroundingForYear(null);

  return {
    address,
    city: city || null,
    region: null,
    fiasId,
    buildingYear: null,
    operationYear: null,
    electrical: electricalGuessForYear(null),
    grounding,
    electricalOverhaul: null,
    capitalRepair: null,
    management: null,
    managementType: null,
    walls: null,
    dataSource: null,
    electricityTariff: null,
  };
}

export function buildPanelHouseSnapshot(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): PanelHouseSnapshot {
  return houseInsightToPanelSnapshot(buildLocalHouseInsight(input));
}
