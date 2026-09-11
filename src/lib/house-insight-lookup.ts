import {
  electricalGuessForYear,
  type ElectricalOverhaulInsight,
  type HouseInsight,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { lookupHouseFromDaData } from "@/lib/dadata-house-lookup";
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

function finishInsight(base: {
  address: string;
  city: string | null;
  fiasId: string | null;
  buildingYear: number | null;
  operationYear: number | null;
  dataSource: string | null;
  reformFiasId?: string | null;
}): HouseInsight {
  const reform = lookupReformGkhHouse({
    city: base.city || "",
    address: base.address,
    fiasId: base.reformFiasId ?? base.fiasId,
  });

  let buildingYear = base.buildingYear;
  let dataSource = base.dataSource;
  if (buildingYear == null && reform?.buildingYear != null) {
    buildingYear = reform.buildingYear;
    dataSource = reform.sourceLabel;
  } else if (reform && dataSource && !dataSource.includes("ФРТ")) {
    dataSource = `${dataSource}; ${reform.sourceLabel}`;
  } else if (reform && !dataSource) {
    dataSource = reform.sourceLabel;
  }

  const overhaul = mergeOverhaul(reform);
  const grounding = assessGroundingForYear({
    year: buildingYear ?? base.operationYear,
    electricalLastYear: overhaul?.lastYear ?? null,
    electricalNextYear: overhaul?.nextYear ?? null,
  });

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
    management: null,
    managementType: null,
    dataSource,
    floors: reform?.floors ?? null,
    flats: reform?.flats ?? null,
  };
}

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
      return finishInsight({
        address,
        city: city || "Москва",
        fiasId: rawFiasId?.startsWith("mos:") ? rawFiasId : `mos:${address}`,
        buildingYear: knownYear,
        operationYear: null,
        dataSource: "подсказка адреса",
        reformFiasId: rawFiasId?.startsWith("mos:") ? null : rawFiasId,
      });
    }

    const resolved = await resolveBuildingYear({
      city,
      address,
      street: input.street,
      house: input.house,
      block: input.block,
    });

    return finishInsight({
      address: resolved.address || address,
      city: city || "Москва",
      fiasId: rawFiasId?.startsWith("mos:")
        ? rawFiasId
        : resolved.buildingYear != null
          ? `mos:${resolved.address || address}`
          : rawFiasId,
      buildingYear: resolved.buildingYear,
      operationYear: resolved.operationYear,
      dataSource: resolved.sourceLabel,
      reformFiasId: rawFiasId?.startsWith("mos:") ? null : rawFiasId,
    });
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

  return finishInsight({
    address: resolvedAddress,
    city: dadata.city || city || null,
    fiasId: dadata.fiasId,
    buildingYear,
    operationYear: null,
    dataSource,
  });
}
