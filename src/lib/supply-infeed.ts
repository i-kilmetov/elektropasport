import {
  WIRE_COLOR_OPTIONS,
} from "@/lib/panel-wires";
import type { PanelWire, TerminalRef } from "@/types";

/** Virtual device id for the panel infeed / supply cable on the scheme. */
export const SUPPLY_DEVICE_ID = -1;

export type SupplyCoreDef = {
  index: number;
  colorId: string;
  label: string;
  color: string;
  pe?: boolean;
};

/** Cores present in the infeed cable from network params (phases + ground). */
export function supplyCoresForNetwork(
  phases: "1" | "3",
  hasGround: boolean,
): SupplyCoreDef[] {
  const cores: SupplyCoreDef[] = [];

  if (phases === "1") {
    cores.push({
      index: 0,
      colorId: "brown",
      label: "L",
      color: "#92400E",
    });
    cores.push({
      index: 1,
      colorId: "blue",
      label: "N",
      color: "#2563EB",
    });
  } else {
    cores.push({
      index: 0,
      colorId: "brown",
      label: "L1",
      color: "#92400E",
    });
    cores.push({
      index: 1,
      colorId: "black",
      label: "L2",
      color: "#18181B",
    });
    cores.push({
      index: 2,
      colorId: "grey",
      label: "L3",
      color: "#71717A",
    });
    cores.push({
      index: 3,
      colorId: "blue",
      label: "N",
      color: "#2563EB",
    });
  }

  if (hasGround) {
    cores.push({
      index: cores.length,
      colorId: "pe",
      label: "PE",
      color: "#CA8A04",
      pe: true,
    });
  }

  return cores;
}

export function isSupplyTerminal(t: TerminalRef): boolean {
  return t.deviceId === SUPPLY_DEVICE_ID;
}

export function supplyTerminal(index: number): TerminalRef {
  return { deviceId: SUPPLY_DEVICE_ID, side: "bottom", index };
}

export function usedSupplyCoreIndexes(
  wires: PanelWire[],
  exceptWireId?: string,
): Set<number> {
  const used = new Set<number>();
  for (const wire of wires) {
    if (exceptWireId && wire.id === exceptWireId) continue;
    if (isSupplyTerminal(wire.from)) used.add(wire.from.index);
    if (isSupplyTerminal(wire.to)) used.add(wire.to.index);
  }
  return used;
}

/** Wire color options limited to unused (or currently edited) infeed cores. */
export function supplyWireColorOptions(
  phases: "1" | "3",
  hasGround: boolean,
  wires: PanelWire[],
  exceptWireId?: string,
): typeof WIRE_COLOR_OPTIONS {
  const cores = supplyCoresForNetwork(phases, hasGround);
  const used = usedSupplyCoreIndexes(wires, exceptWireId);
  const available = cores.filter((core) => !used.has(core.index));
  return available
    .map((core) => WIRE_COLOR_OPTIONS.find((opt) => opt.id === core.colorId))
    .filter((opt): opt is (typeof WIRE_COLOR_OPTIONS)[number] => Boolean(opt));
}

/** After picking a color, bind the supply end to the matching core index. */
export function bindSupplyCoreByColor(
  from: TerminalRef,
  to: TerminalRef,
  color: string,
  phases: "1" | "3",
  hasGround: boolean,
): { from: TerminalRef; to: TerminalRef } {
  const cores = supplyCoresForNetwork(phases, hasGround);
  const core = cores.find((c) => c.color === color);
  if (!core) return { from, to };
  if (isSupplyTerminal(from)) {
    return { from: supplyTerminal(core.index), to };
  }
  if (isSupplyTerminal(to)) {
    return { from, to: supplyTerminal(core.index) };
  }
  return { from, to };
}

export function wireTouchesSupply(wire: {
  from: TerminalRef;
  to: TerminalRef;
}): boolean {
  return isSupplyTerminal(wire.from) || isSupplyTerminal(wire.to);
}
