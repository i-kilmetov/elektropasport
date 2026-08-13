import type { RequestNeedId } from "@/components/screens/request-type-screen";
import type { NoPanelSetupId } from "@/lib/no-panel-setups";

export type RequestTypeCode =
  | "C"
  | "P"
  | "S"
  | "M"
  | "V"
  | "F"
  | "L"
  | "I"
  | "O"
  | "U";

const REQUEST_TYPE_CODES = new Set<RequestTypeCode>([
  "C",
  "P",
  "S",
  "M",
  "V",
  "F",
  "L",
  "I",
  "O",
  "U",
]);

export function isRequestTypeCode(value: string): value is RequestTypeCode {
  return REQUEST_TYPE_CODES.has(value as RequestTypeCode);
}

export function formatRequestPublicCode(
  typeCode: RequestTypeCode,
  sequence: number,
): string {
  return `${typeCode}-${String(sequence).padStart(4, "0")}`;
}

export function resolveRequestTypeCode(input: {
  requestNeedId?: RequestNeedId | null;
  noPanelSetupId?: NoPanelSetupId | null;
  callMaster?: boolean;
}): RequestTypeCode {
  if (input.requestNeedId === "consult") return "C";
  if (input.requestNeedId === "design") return "P";
  if (input.requestNeedId === "assemble") return "S";
  if (input.requestNeedId === "install") return "M";
  if (input.callMaster) return "V";
  if (input.noPanelSetupId === "plug_fuses") return "F";
  if (input.noPanelSetupId === "floor_panel_only") return "L";
  if (input.noPanelSetupId === "inlet_cable") return "I";
  if (input.noPanelSetupId === "other") return "O";
  return "U";
}
