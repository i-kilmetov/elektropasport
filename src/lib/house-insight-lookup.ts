import {
  electricalGuessForYear,
  houseInsightToPanelSnapshot,
  type HouseInsight,
  type PanelHouseSnapshot,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { isMoscow } from "@/lib/lead-services";
import { lookupMoscowCapitalRepair } from "@/lib/moscow-capital-repair";
import { lookupMoscowHousePassport } from "@/lib/moscow-house-passport";

/** Building year and kapremont from Moscow open data; address only elsewhere. */
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
    fiasId,
    buildingYear: null,
    operationYear: null,
    electrical: electricalGuessForYear(null),
    grounding,
    capitalRepair: null,
    management: null,
    managementType: null,
    moscowOpenDataUsed: false,
  };
}

export function buildPanelHouseSnapshot(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): PanelHouseSnapshot {
  return houseInsightToPanelSnapshot(buildLocalHouseInsight(input));
}

export async function lookupHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
}): Promise<HouseInsight> {
  const city = input.city.trim();
  let address = input.address.trim();
  const rawFiasId = input.fiasId?.trim() || null;
  const fiasId = rawFiasId?.startsWith("mos:") ? null : rawFiasId;

  let buildingYear: number | null = null;
  let operationYear: number | null = null;
  let moscowOpenDataUsed = false;

  if (isMoscow(city)) {
    const passport = await lookupMoscowHousePassport(address, {
      street: input.street,
      house: input.house,
      block: input.block,
    });
    if (passport) {
      address = passport.address || address;
      buildingYear = passport.buildingYear;
      operationYear = passport.operationYear;
      moscowOpenDataUsed = Boolean(
        passport.buildingYear ?? passport.operationYear ?? passport.address,
      );
    }
  }

  const effectiveYear = buildingYear ?? operationYear;
  const grounding = assessGroundingForYear(effectiveYear);

  let capitalRepair: HouseInsight["capitalRepair"] = null;
  if (isMoscow(city) && grounding.suggestCapitalRepair) {
    capitalRepair = await lookupMoscowCapitalRepair(city, address);
  }

  return {
    address,
    city: city || null,
    fiasId,
    buildingYear,
    operationYear,
    electrical: electricalGuessForYear(effectiveYear),
    grounding,
    capitalRepair,
    management: null,
    managementType: null,
    moscowOpenDataUsed,
  };
}
