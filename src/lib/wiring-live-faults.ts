import type { Device, PanelWire, TerminalRef } from "@/types";
import {
  isSupplyTerminal,
  SUPPLY_DEVICE_ID,
  supplyCoresForNetwork,
} from "@/lib/supply-infeed";

export type ConductorRole = "L" | "N" | "PE" | "unknown";

export type WiringFaultSeverity = "critical" | "warning";

export type WiringFault = {
  id: string;
  severity: WiringFaultSeverity;
  title: string;
  detail: string;
  wireId?: string;
};

function normalizeHex(color: string): string {
  return color.trim().toUpperCase();
}

/** Infer conductor role from insulation color (scheme palette). */
export function conductorRoleFromColor(color: string): ConductorRole {
  const hex = normalizeHex(color);
  if (hex === "#CA8A04") return "PE";
  if (hex === "#2563EB") return "N";
  if (
    hex === "#92400E" ||
    hex === "#18181B" ||
    hex === "#71717A" ||
    hex === "#DC2626" ||
    hex === "#EA580C"
  ) {
    return "L";
  }
  return "unknown";
}

export function conductorRoleAtTerminal(
  terminal: TerminalRef,
  wireColor: string,
  devices: Device[],
  phases: "1" | "3" = "1",
  hasGround = true,
): ConductorRole {
  if (isSupplyTerminal(terminal)) {
    const core = supplyCoresForNetwork(phases, hasGround).find(
      (item) => item.index === terminal.index,
    );
    if (!core) return conductorRoleFromColor(wireColor);
    if (core.pe || core.label === "PE") return "PE";
    if (core.label === "N") return "N";
    if (core.label.startsWith("L")) return "L";
  }

  const device = devices.find((item) => item.id === terminal.deviceId);
  if (device?.type === "pe_bus") return "PE";
  if (device?.type === "n_bus") return "N";

  return conductorRoleFromColor(wireColor);
}

function endpointLabel(
  terminal: TerminalRef,
  devices: Device[],
  phases: "1" | "3",
  hasGround: boolean,
): string {
  if (isSupplyTerminal(terminal)) {
    const core = supplyCoresForNetwork(phases, hasGround).find(
      (item) => item.index === terminal.index,
    );
    return core ? `Ввод ${core.label}` : "Ввод";
  }
  const device = devices.find((item) => item.id === terminal.deviceId);
  if (!device) return `Прибор #${terminal.deviceId}`;
  if (device.type === "pe_bus") return "Шина PE";
  if (device.type === "n_bus") return "Шина N";
  return device.name || device.type;
}

/**
 * Immediate wiring sanity checks for the scheme (shorts, PE/N mixups, etc.).
 * Does not replace the offline professional score — this is live UX feedback.
 */
export function analyzeLiveWiringFaults(input: {
  devices: Device[];
  wires: PanelWire[];
  phases?: "1" | "3" | null;
  hasGround?: boolean | null;
}): WiringFault[] {
  const devices = input.devices;
  const phases = input.phases === "3" ? "3" : "1";
  const hasGround = input.hasGround !== false;
  const faults: WiringFault[] = [];
  const seen = new Set<string>();

  const push = (fault: WiringFault) => {
    if (seen.has(fault.id)) return;
    seen.add(fault.id);
    faults.push(fault);
  };

  for (const wire of input.wires) {
    const fromRole = conductorRoleAtTerminal(
      wire.from,
      wire.color,
      devices,
      phases,
      hasGround,
    );
    const toRole = conductorRoleAtTerminal(
      wire.to,
      wire.color,
      devices,
      phases,
      hasGround,
    );
    const colorRole = conductorRoleFromColor(wire.color);
    const fromLabel = endpointLabel(wire.from, devices, phases, hasGround);
    const toLabel = endpointLabel(wire.to, devices, phases, hasGround);

    const fromSupply = isSupplyTerminal(wire.from);
    const toSupply = isSupplyTerminal(wire.to);

    // Direct short between different supply cores.
    if (fromSupply && toSupply && wire.from.index !== wire.to.index) {
      push({
        id: `supply-short-${wire.id}`,
        severity: "critical",
        title: "Короткое замыкание на вводе",
        detail: `Жилы вводного кабеля ${fromLabel} и ${toLabel} соединены напрямую — это КЗ.`,
        wireId: wire.id,
      });
      continue;
    }

    // L ↔ N or L ↔ PE through a plain jumper (both ends are "pure" roles).
    const roles = new Set([fromRole, toRole]);
    if (roles.has("L") && roles.has("N")) {
      push({
        id: `ln-short-${wire.id}`,
        severity: "critical",
        title: "Фаза соединена с нулём",
        detail: `${fromLabel} ↔ ${toLabel}: фаза и рабочий ноль замкнуты проводом — короткое замыкание.`,
        wireId: wire.id,
      });
    }
    if (roles.has("L") && roles.has("PE")) {
      push({
        id: `lpe-short-${wire.id}`,
        severity: "critical",
        title: "Фаза на заземление",
        detail: `${fromLabel} ↔ ${toLabel}: фаза пришла на PE — КЗ на землю и опасность.`,
        wireId: wire.id,
      });
    }
    if (roles.has("N") && roles.has("PE") && (fromSupply || toSupply)) {
      // N–PE bond is only for TN-C-S at the incomer bonding point; treat supply N to PE bus as warning unless both are buses after main.
      const other = fromSupply ? wire.to : wire.from;
      const otherDevice = devices.find((d) => d.id === other.deviceId);
      if (otherDevice?.type === "pe_bus") {
        push({
          id: `npe-bond-${wire.id}`,
          severity: "warning",
          title: "N и PE связаны",
          detail:
            "Рабочий ноль соединён с шиной PE. Это допустимо только в точке разделения TN-C-S у ввода — проверьте, что так задумано проектом.",
          wireId: wire.id,
        });
      }
    }

    const fromDevice = devices.find((d) => d.id === wire.from.deviceId);
    const toDevice = devices.find((d) => d.id === wire.to.deviceId);
    if (
      (fromDevice?.type === "n_bus" && toDevice?.type === "pe_bus") ||
      (fromDevice?.type === "pe_bus" && toDevice?.type === "n_bus")
    ) {
      push({
        id: `bus-npe-${wire.id}`,
        severity: "warning",
        title: "Шины N и PE соединены",
        detail:
          "Прямая перемычка между нулевой и заземляющей шиной допустима только в точке разделения PEN. В распределительном щите после разделения N и PE обычно не связывают.",
        wireId: wire.id,
      });
    }

    // Supply PE onto N bus (or supply N onto PE with PE color) — wrong bonding.
    if (fromSupply || toSupply) {
      const supplyEnd = fromSupply ? wire.from : wire.to;
      const otherEnd = fromSupply ? wire.to : wire.from;
      const supplyRole = conductorRoleAtTerminal(
        supplyEnd,
        wire.color,
        devices,
        phases,
        hasGround,
      );
      const otherDevice = devices.find((d) => d.id === otherEnd.deviceId);
      if (supplyRole === "PE" && otherDevice?.type === "n_bus") {
        push({
          id: `pe-to-nbus-${wire.id}`,
          severity: "critical",
          title: "PE на нулевую шину",
          detail: `${fromLabel} ↔ ${toLabel}: защитный проводник пришёл на шину N — так делать нельзя.`,
          wireId: wire.id,
        });
      }
      if (supplyRole === "L" && otherDevice?.type === "n_bus") {
        push({
          id: `l-to-nbus-${wire.id}`,
          severity: "critical",
          title: "Фаза на нулевую шину",
          detail: `${fromLabel} ↔ ${toLabel}: фаза подключена напрямую к шине N — короткое замыкание.`,
          wireId: wire.id,
        });
      }
      if (supplyRole === "L" && otherDevice?.type === "pe_bus") {
        push({
          id: `l-to-pebus-${wire.id}`,
          severity: "critical",
          title: "Фаза на шину PE",
          detail: `${fromLabel} ↔ ${toLabel}: фаза на заземляющую шину — КЗ на землю.`,
          wireId: wire.id,
        });
      }
      if (supplyRole === "N" && otherDevice?.type === "pe_bus") {
        // already covered as npe-bond warning above
      }
    }

    // Color contradicts endpoint role.
    if (colorRole !== "unknown") {
      if (
        (fromRole === "PE" || toRole === "PE") &&
        colorRole !== "PE"
      ) {
        push({
          id: `pe-color-${wire.id}`,
          severity: "warning",
          title: "Неверный цвет на PE",
          detail: `К ${fromRole === "PE" ? fromLabel : toLabel} идёт провод не жёлто-зелёного цвета.`,
          wireId: wire.id,
        });
      }
      if (
        (fromRole === "N" || toRole === "N") &&
        colorRole === "PE"
      ) {
        push({
          id: `n-pe-color-${wire.id}`,
          severity: "warning",
          title: "PE-цвет на нуле",
          detail: `К нулевой клемме (${fromRole === "N" ? fromLabel : toLabel}) подведён жёлто-зелёный провод.`,
          wireId: wire.id,
        });
      }
      if (
        (fromRole === "L" || toRole === "L") &&
        colorRole === "N"
      ) {
        push({
          id: `l-n-color-${wire.id}`,
          severity: "warning",
          title: "Синий провод на фазе",
          detail: `К фазной клемме (${fromRole === "L" ? fromLabel : toLabel}) подведён синий (N) провод.`,
          wireId: wire.id,
        });
      }
    }

    // Socket without PE when ground exists and only one phase wire.
    for (const end of [wire.from, wire.to]) {
      if (end.deviceId === SUPPLY_DEVICE_ID) continue;
      const device = devices.find((d) => d.id === end.deviceId);
      if (device?.type !== "socket") continue;
      if (hasGround && colorRole === "L") {
        const socketWires = input.wires.filter(
          (w) =>
            w.from.deviceId === device.id || w.to.deviceId === device.id,
        );
        const rolesOnSocket = new Set(
          socketWires.flatMap((w) => [
            conductorRoleAtTerminal(w.from, w.color, devices, phases, hasGround),
            conductorRoleAtTerminal(w.to, w.color, devices, phases, hasGround),
          ]),
        );
        if (rolesOnSocket.has("L") && !rolesOnSocket.has("N")) {
          push({
            id: `socket-no-n-${device.id}`,
            severity: "warning",
            title: "Розетка без нуля",
            detail: `У «${device.name}» есть фаза, но нет рабочего нуля — розетка не заработает корректно.`,
            wireId: wire.id,
          });
        }
        if (
          rolesOnSocket.has("L") &&
          hasGround &&
          !rolesOnSocket.has("PE")
        ) {
          push({
            id: `socket-no-pe-${device.id}`,
            severity: "warning",
            title: "Розетка без PE",
            detail: `У «${device.name}» нет защитного проводника при наличии заземления на вводе.`,
            wireId: wire.id,
          });
        }
      }
    }
  }

  // Contactor: if only one power wire present, warn incomplete power path.
  for (const device of devices) {
    if (device.type !== "contactor") continue;
    const related = input.wires.filter(
      (w) => w.from.deviceId === device.id || w.to.deviceId === device.id,
    );
    if (related.length === 0) continue;
    const roles = new Set(
      related.flatMap((w) => [
        conductorRoleAtTerminal(w.from, w.color, devices, phases, hasGround),
        conductorRoleAtTerminal(w.to, w.color, devices, phases, hasGround),
      ]),
    );
    if (roles.has("L") && !roles.has("N") && related.length < 2) {
      push({
        id: `contactor-incomplete-${device.id}`,
        severity: "warning",
        title: "Контактор расключён частично",
        detail: `У «${device.name}» пока мало соединений — обычно нужны силовые цепи и цепь катушки (A1/A2).`,
      });
    }
  }

  return faults.sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === "critical" ? -1 : 1;
  });
}

export function criticalWiringFaults(faults: WiringFault[]): WiringFault[] {
  return faults.filter((fault) => fault.severity === "critical");
}
