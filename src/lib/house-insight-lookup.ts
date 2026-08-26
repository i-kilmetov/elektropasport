import {
  electricalGuessForYear,
  type HouseInsight,
} from "@/lib/house-insight";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { lookupHouseFromDaData } from "@/lib/dadata-house-lookup";
import { buildLocalHouseInsight, buildPanelHouseSnapshot } from "@/lib/house-insight-local";

export { buildLocalHouseInsight, buildPanelHouseSnapshot };

export async function lookupHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
}): Promise<HouseInsight> {
  const city = input.city.trim();
  const address = input.address.trim();
  const rawFiasId = input.fiasId?.trim() || null;
  const fiasId = rawFiasId?.startsWith("mos:") ? null : rawFiasId;

  const dadata = await lookupHouseFromDaData({
    city,
    address,
    fiasId,
  });

  const buildingYear = dadata.buildingYear;
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
