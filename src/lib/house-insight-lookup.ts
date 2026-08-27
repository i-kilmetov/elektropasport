import {
  electricalGuessForYear,
  type HouseInsight,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { lookupHouseFromDaData } from "@/lib/dadata-house-lookup";
import { isMoscow } from "@/lib/lead-services";
import { lookupMoscowYearFromSeed } from "@/lib/moscow-year-seed";
import { lookupBuildingYearFromOsm } from "@/lib/osm-building-year";
import {
  buildLocalHouseInsight,
  buildPanelHouseSnapshot,
} from "@/lib/house-insight-local";

export { buildLocalHouseInsight, buildPanelHouseSnapshot };

/** Year sources: tiny seed → OSM. Mos.ru open catalog has no reliable year dataset. */
async function resolveBuildingYear(input: {
  city: string;
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
  if (isMoscow(input.city)) {
    const seed = lookupMoscowYearFromSeed(input);
    if (seed) {
      return {
        address: seed.address,
        buildingYear: seed.buildingYear,
        operationYear: null,
        sourceLabel: "Справочник домов Москвы",
      };
    }
  }

  const osm = await lookupBuildingYearFromOsm({
    address: input.address,
    city: input.city,
    street: input.street,
    house: input.house,
    block: input.block,
  });
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
  /** Year already known from suggestion extras. */
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
        dataSource: "подсказка адреса",
      };
    }

    const resolved = await resolveBuildingYear({
      city,
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

  let buildingYear = knownYear ?? dadata.buildingYear;
  let dataSource: string | null =
    knownYear != null
      ? "подсказка адреса"
      : buildingYear != null
        ? "DaData"
        : null;
  let resolvedAddress = dadata.address || address;

  if (buildingYear == null) {
    const osm = await resolveBuildingYear({
      city: dadata.city || city,
      address: resolvedAddress,
      street: input.street,
      house: input.house,
      block: input.block,
    });
    if (osm.buildingYear != null) {
      buildingYear = osm.buildingYear;
      dataSource = osm.sourceLabel;
      resolvedAddress = osm.address || resolvedAddress;
    }
  }

  const grounding = assessGroundingForYear(buildingYear);

  return {
    address: resolvedAddress,
    city: dadata.city || city || null,
    fiasId: dadata.fiasId,
    buildingYear,
    operationYear: null,
    electrical: electricalGuessForYear(buildingYear),
    grounding,
    capitalRepair: null,
    management: null,
    managementType: null,
    dataSource,
  };
}
