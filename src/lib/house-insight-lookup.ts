import {
  electricalGuessForYear,
  type ElectricalOverhaulInsight,
  type HouseInsight,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { lookupHouseFromDaData } from "@/lib/dadata-house-lookup";
import { lookupGisGkhHouse } from "@/lib/gis-gkh-lookup";
import { isMoscow } from "@/lib/lead-services";
import { lookupMoscowYearFromSeed } from "@/lib/moscow-year-seed";
import { lookupBuildingYearFromOsm } from "@/lib/osm-building-year";
import {
  electricalOverhaulMessage,
  lookupReformGkhHouse,
} from "@/lib/reform-gkh-lookup";
import {
  buildLocalHouseInsight,
  buildPanelHouseSnapshot,
} from "@/lib/house-insight-local";

export { buildLocalHouseInsight, buildPanelHouseSnapshot };

function realFiasId(value: string | null | undefined): string | null {
  const fias = value?.trim() || null;
  if (!fias || fias.startsWith("mos:")) return null;
  return fias;
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

async function finishInsight(base: {
  address: string;
  city: string | null;
  fiasId: string | null;
  buildingYear: number | null;
  operationYear: number | null;
  dataSource: string | null;
}): Promise<HouseInsight> {
  const fias = realFiasId(base.fiasId);
  const gis = await lookupGisGkhHouse({ fiasId: fias });
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

  // Reform is only for electrical overhaul; year is a last-resort fallback.
  if (buildingYear == null && reform?.buildingYear != null) {
    buildingYear = reform.buildingYear;
    dataSource = appendSource(dataSource, reform.sourceLabel);
  } else if (reform?.electricalLastYear != null || reform?.electricalNextYear != null) {
    dataSource = appendSource(dataSource, reform.sourceLabel);
  }

  const overhaul = mergeOverhaul(reform);
  const grounding = assessGroundingForYear({
    year: buildingYear ?? base.operationYear,
    electricalLastYear: overhaul?.lastYear ?? null,
    electricalNextYear: overhaul?.nextYear ?? null,
  });

  const managementName = gis?.managementName ?? null;

  return {
    address: base.address,
    city: base.city,
    fiasId: base.fiasId,
    buildingYear,
    operationYear: base.operationYear,
    electrical: electricalGuessForYear(buildingYear, overhaul),
    grounding,
    electricalOverhaul: overhaul,
    capitalRepair: null,
    management: managementName
      ? { name: managementName, phone: null, ogrn: null }
      : null,
    managementType: null,
    walls: gis?.walls ?? null,
    dataSource,
    floors: reform?.floors ?? null,
    flats: reform?.flats ?? null,
  };
}

/** Fallback year sources when GIS ЖКХ has no year for the FIAS id. */
async function resolveBuildingYearFallback(input: {
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

  // Prefer a real house FIAS (needed for GIS ЖКХ + Reform join).
  let fiasId = realFiasId(rawFiasId);
  let resolvedAddress = address;
  let resolvedCity: string | null = city || null;
  let buildingYear = knownYear;
  let dataSource: string | null =
    knownYear != null ? "подсказка адреса" : null;

  const dadata = await lookupHouseFromDaData({
    city,
    address,
    fiasId,
  });
  if (dadata.fiasId) fiasId = realFiasId(dadata.fiasId) ?? fiasId;
  if (dadata.address) resolvedAddress = dadata.address;
  if (dadata.city) resolvedCity = dadata.city;
  if (buildingYear == null && dadata.buildingYear != null) {
    buildingYear = dadata.buildingYear;
    dataSource = "DaData";
  }

  if (buildingYear == null) {
    const fallback = await resolveBuildingYearFallback({
      city: resolvedCity || city,
      address: resolvedAddress,
      street: input.street,
      house: input.house,
      block: input.block,
    });
    if (fallback.buildingYear != null) {
      buildingYear = fallback.buildingYear;
      dataSource = fallback.sourceLabel;
      resolvedAddress = fallback.address || resolvedAddress;
    }
  }

  return finishInsight({
    address: resolvedAddress,
    city: resolvedCity || city || null,
    fiasId: fiasId ?? (isMoscow(city) ? `mos:${resolvedAddress}` : rawFiasId),
    buildingYear,
    operationYear: null,
    dataSource,
  });
}
