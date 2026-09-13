import {
  electricalGuessForYear,
  type ElectricalOverhaulInsight,
  type HouseInsight,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { lookupHouseFromDaData } from "@/lib/dadata-house-lookup";
import { buildHouseTariffSnapshot } from "@/lib/electricity-tariffs";
import { lookupGisGkhHouse } from "@/lib/gis-gkh-lookup";
import { isMoscow } from "@/lib/lead-services";
import { lookupMoscowYearFromSeed } from "@/lib/moscow-year-seed";
import { lookupBuildingYearFromOsm } from "@/lib/osm-building-year";
import {
  electricalOverhaulMessage,
  lookupReformGkhHouse,
} from "@/lib/reform-gkh-lookup";
import { lookupUkContact } from "@/lib/uk-contacts-lookup";
import {
  buildLocalHouseInsight,
  buildPanelHouseSnapshot,
} from "@/lib/house-insight-local";

export { buildLocalHouseInsight, buildPanelHouseSnapshot };

function realFiasId(value: string | null | undefined): string | null {
  const fias = value?.trim() || null;
  if (!fias || fias.startsWith("mos:")) return null;
  return fias.toLowerCase();
}

/** Prefer house-level FIAS (GIS/Reform are house passports, not flats). */
function houseLevelFias(input: {
  houseFiasId?: string | null;
  fiasId?: string | null;
}): string | null {
  return realFiasId(input.houseFiasId) ?? realFiasId(input.fiasId);
}

function mergeOverhaul(
  reform: ReturnType<typeof lookupReformGkhHouse>,
): ElectricalOverhaulInsight | null {
  if (!reform) return null;
  const lastYear = reform.electricalLastYear;
  const nextYear = reform.electricalNextYear;
  if (lastYear == null && nextYear == null) {
    return {
      lastYear: null,
      nextYear: null,
      message:
        "Дом есть в программе капремонта, но отдельный ремонт сетей электроснабжения в открытых данных не найден.",
    };
  }
  return {
    lastYear,
    nextYear,
    message: electricalOverhaulMessage({ lastYear, nextYear }),
  };
}

function appendSource(
  current: string | null,
  next: string | null | undefined,
): string | null {
  if (!next) return current;
  if (!current) return next;
  if (current.includes(next)) return current;
  return `${current}; ${next}`;
}

function finishInsight(base: {
  address: string;
  city: string | null;
  region: string | null;
  fiasId: string | null;
  buildingYear: number | null;
  operationYear: number | null;
  dataSource: string | null;
}): HouseInsight {
  const fias = realFiasId(base.fiasId);
  const gis = lookupGisGkhHouse({ fiasId: fias });
  const reform = lookupReformGkhHouse({
    city: base.city || "",
    address: base.address,
    fiasId: fias,
  });

  let buildingYear = base.buildingYear;
  let dataSource = base.dataSource;

  if (buildingYear == null && gis?.buildingYear != null) {
    buildingYear = gis.buildingYear;
    dataSource = appendSource(dataSource, gis.sourceLabel);
  } else if (gis) {
    dataSource = appendSource(dataSource, gis.sourceLabel);
  }

  // Reform: electrical overhaul; year only as last-resort fallback.
  if (buildingYear == null && reform?.buildingYear != null) {
    buildingYear = reform.buildingYear;
    dataSource = appendSource(dataSource, reform.sourceLabel);
  } else if (
    reform?.electricalLastYear != null ||
    reform?.electricalNextYear != null
  ) {
    dataSource = appendSource(dataSource, reform.sourceLabel);
  }

  const overhaul = mergeOverhaul(reform);
  const grounding = assessGroundingForYear({
    year: buildingYear ?? base.operationYear,
    electricalLastYear: overhaul?.lastYear ?? null,
    electricalNextYear: overhaul?.nextYear ?? null,
  });

  const managementName = gis?.managementName ?? null;
  const ukContact = lookupUkContact(managementName);
  const electricityTariff = buildHouseTariffSnapshot({
    region: base.region,
    city: base.city,
  });

  return {
    address: base.address,
    city: base.city,
    region: base.region,
    fiasId: base.fiasId,
    buildingYear,
    operationYear: base.operationYear,
    electrical: electricalGuessForYear(buildingYear, overhaul),
    grounding,
    electricalOverhaul: overhaul,
    capitalRepair: null,
    management: managementName
      ? {
          name: ukContact?.name || managementName,
          phone: ukContact?.phone ?? null,
          email: ukContact?.email ?? null,
          inn: ukContact?.inn ?? null,
          ogrn: ukContact?.ogrn ?? null,
        }
      : null,
    managementType: ukContact?.func ?? null,
    walls: gis?.walls ?? null,
    dataSource,
    floors: reform?.floors ?? null,
    flats: reform?.flats ?? null,
    electricityTariff,
  };
}

/** Last-resort year when FIAS passport sources miss (keep short — no long OSM waits). */
async function resolveBuildingYearFallback(input: {
  city: string;
  address: string;
  street?: string | null;
  house?: string | null;
  block?: string | null;
  /** Skip network OSM when we already had a house FIAS (passport miss is final). */
  skipOsm?: boolean;
}): Promise<{
  address: string;
  buildingYear: number | null;
  sourceLabel: string | null;
}> {
  if (isMoscow(input.city)) {
    const seed = lookupMoscowYearFromSeed(input);
    if (seed) {
      return {
        address: seed.address,
        buildingYear: seed.buildingYear,
        sourceLabel: "Справочник домов Москвы",
      };
    }
  }

  if (input.skipOsm) {
    return { address: input.address, buildingYear: null, sourceLabel: null };
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
      sourceLabel: osm.sourceLabel,
    };
  }

  return { address: input.address, buildingYear: null, sourceLabel: null };
}

export async function lookupHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
  houseFiasId?: string | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
  /** Year already known from suggestion extras. */
  buildingYear?: number | null;
}): Promise<HouseInsight> {
  const city = input.city.trim();
  const address = input.address.trim();
  const knownYear =
    typeof input.buildingYear === "number" &&
    Number.isFinite(input.buildingYear)
      ? input.buildingYear
      : null;

  let fiasId = houseLevelFias({
    houseFiasId: input.houseFiasId,
    fiasId: input.fiasId,
  });
  let resolvedAddress = address;
  let resolvedCity: string | null = city || null;
  let resolvedRegion: string | null = null;
  let buildingYear = knownYear;
  let dataSource: string | null =
    knownYear != null ? "подсказка адреса" : null;

  const dadata = await lookupHouseFromDaData({
    city,
    address,
    fiasId,
  });
  fiasId =
    houseLevelFias({
      houseFiasId: dadata.suggestion?.houseFiasId,
      fiasId: dadata.fiasId,
    }) ?? fiasId;
  if (dadata.address) resolvedAddress = dadata.address;
  if (dadata.city) resolvedCity = dadata.city;
  if (dadata.region) resolvedRegion = dadata.region;
  if (buildingYear == null && dadata.buildingYear != null) {
    buildingYear = dadata.buildingYear;
    dataSource = "DaData";
  }

  // Passport sources first (sync, fast): GIS + Reform.
  let insight = finishInsight({
    address: resolvedAddress,
    city: resolvedCity || city || null,
    region: resolvedRegion,
    fiasId: fiasId ?? (isMoscow(city) ? `mos:${resolvedAddress}` : fiasId),
    buildingYear,
    operationYear: null,
    dataSource,
  });

  if (insight.buildingYear == null) {
    const fallback = await resolveBuildingYearFallback({
      city: resolvedCity || city,
      address: resolvedAddress,
      street: input.street ?? dadata.suggestion?.street,
      house: input.house ?? dadata.suggestion?.house,
      block: input.block ?? dadata.suggestion?.block,
      // With a real house FIAS, GIS/Reform miss means "unknown" — don't wait on OSM.
      skipOsm: Boolean(fiasId),
    });
    if (fallback.buildingYear != null) {
      insight = finishInsight({
        address: fallback.address || resolvedAddress,
        city: resolvedCity || city || null,
        region: resolvedRegion,
        fiasId: fiasId ?? (isMoscow(city) ? `mos:${resolvedAddress}` : fiasId),
        buildingYear: fallback.buildingYear,
        operationYear: null,
        dataSource: fallback.sourceLabel,
      });
    }
  }

  return insight;
}
