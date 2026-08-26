import {
  electricalGuessForYear,
  type HouseInsight,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { lookupHouseFromDaData } from "@/lib/dadata-house-lookup";
import { isMoscow } from "@/lib/lead-services";
import {
  buildMoscowAddressKey,
  scoreMoscowAddressMatch,
} from "@/lib/moscow-address-match";
import {
  lookupMoscowHousePassportWithDebug,
  searchMoscowAddressSuggestions,
} from "@/lib/moscow-house-passport";
import { lookupMoscowYearFromSeed } from "@/lib/moscow-year-seed";
import { lookupBuildingYearFromOsm } from "@/lib/osm-building-year";
import {
  buildLocalHouseInsight,
  buildPanelHouseSnapshot,
} from "@/lib/house-insight-local";

export { buildLocalHouseInsight, buildPanelHouseSnapshot };

async function resolveMoscowYear(input: {
  address: string;
  street?: string | null;
  house?: string | null;
  block?: string | null;
}): Promise<{
  address: string;
  buildingYear: number | null;
  operationYear: number | null;
  sourceLabel: string | null;
}> {
  const seed = lookupMoscowYearFromSeed(input);
  if (seed) {
    return {
      address: seed.address,
      buildingYear: seed.buildingYear,
      operationYear: null,
      sourceLabel: "Справочник домов Москвы",
    };
  }

  try {
    const { passport } = await lookupMoscowHousePassportWithDebug(input.address, {
      street: input.street,
      house: input.house,
      block: input.block,
    });
    if (passport?.buildingYear != null || passport?.operationYear != null) {
      return {
        address: passport.address || input.address,
        buildingYear: passport.buildingYear,
        operationYear: passport.operationYear,
        sourceLabel: passport.sourceLabel,
      };
    }

    const key = buildMoscowAddressKey({
      address: input.address,
      street: input.street,
      house: input.house,
      block: input.block,
    });
    const query =
      key != null
        ? `${key.street} ${key.house}${key.building ? ` ${key.building}` : ""}`
        : input.address;
    const hits = await searchMoscowAddressSuggestions(query, 20);
    if (key && hits.length > 0) {
      let best: {
        address: string;
        buildingYear: number | null;
        score: number;
      } | null = null;
      for (const hit of hits) {
        const score = scoreMoscowAddressMatch(hit.address, key);
        if (!best || score > best.score) {
          best = {
            address: hit.address,
            buildingYear: hit.buildingYear,
            score,
          };
        }
      }
      if (best && best.score >= 100 && best.buildingYear != null) {
        return {
          address: best.address,
          buildingYear: best.buildingYear,
          operationYear: null,
          sourceLabel: "Открытые данные Москвы",
        };
      }
    }
  } catch (error) {
    console.error("Moscow open-data year resolve failed", error);
  }

  const osm = await lookupBuildingYearFromOsm(input);
  if (osm.buildingYear != null) {
    return {
      address: osm.address || input.address,
      buildingYear: osm.buildingYear,
      operationYear: null,
      sourceLabel: osm.sourceLabel,
    };
  }

  return {
    address: input.address,
    buildingYear: null,
    operationYear: null,
    sourceLabel: null,
  };
}

export async function lookupHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
  /** Year already known from Moscow open-data suggestion. */
  buildingYear?: number | null;
}): Promise<HouseInsight> {
  const city = input.city.trim();
  const address = input.address.trim();
  const rawFiasId = input.fiasId?.trim() || null;
  const knownYear =
    typeof input.buildingYear === "number" &&
    Number.isFinite(input.buildingYear)
      ? input.buildingYear
      : null;

  if (isMoscow(city)) {
    if (knownYear != null) {
      const grounding = assessGroundingForYear(knownYear);
      return {
        address,
        city: city || "Москва",
        fiasId: rawFiasId?.startsWith("mos:") ? rawFiasId : `mos:${address}`,
        buildingYear: knownYear,
        operationYear: null,
        electrical: electricalGuessForYear(knownYear),
        grounding,
        capitalRepair: null,
        management: null,
        managementType: null,
        dataSource: "Открытые данные Москвы",
      };
    }

    const resolved = await resolveMoscowYear({
      address,
      street: input.street,
      house: input.house,
      block: input.block,
    });
    const year = resolved.buildingYear ?? resolved.operationYear;
    const grounding = assessGroundingForYear(year);

    return {
      address: resolved.address || address,
      city: city || "Москва",
      fiasId: rawFiasId?.startsWith("mos:")
        ? rawFiasId
        : resolved.buildingYear != null
          ? `mos:${resolved.address || address}`
          : rawFiasId,
      buildingYear: resolved.buildingYear,
      operationYear: resolved.operationYear,
      electrical: electricalGuessForYear(year),
      grounding,
      capitalRepair: null,
      management: null,
      managementType: null,
      dataSource: resolved.sourceLabel,
    };
  }

  const fiasId = rawFiasId?.startsWith("mos:") ? null : rawFiasId;
  const dadata = await lookupHouseFromDaData({
    city,
    address,
    fiasId,
  });

  const buildingYear = knownYear ?? dadata.buildingYear;
  const grounding = assessGroundingForYear(buildingYear);

  return {
    address: dadata.address || address,
    city: dadata.city || city || null,
    fiasId: dadata.fiasId,
    buildingYear,
    operationYear: null,
    electrical: electricalGuessForYear(buildingYear),
    grounding,
    capitalRepair: null,
    management: null,
    managementType: null,
    dataSource: buildingYear != null ? "DaData" : null,
  };
}
