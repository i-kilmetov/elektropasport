/** Recommended copper (Cu) conductor cross-section for supply cable by allocated power. */
export function recommendCopperCrossSectionMm2(
  powerKw: number,
  phases: "1" | "3",
): { mm2: number; ampsApprox: number; note: string } | null {
  if (!Number.isFinite(powerKw) || powerKw <= 0) return null;

  // Rough continuous current: 1φ ≈ P/0.23, 3φ ≈ P/(√3·0.4·0.95)
  const ampsApprox =
    phases === "3"
      ? Math.ceil((powerKw * 1000) / (Math.sqrt(3) * 400 * 0.95))
      : Math.ceil((powerKw * 1000) / 230);

  // Typical residential Cu PVC cable ampacity (simplified steps).
  const steps =
    phases === "3"
      ? [
          { mm2: 1.5, maxA: 18, maxKw: 10 },
          { mm2: 2.5, maxA: 25, maxKw: 14 },
          { mm2: 4, maxA: 32, maxKw: 18 },
          { mm2: 6, maxA: 40, maxKw: 23 },
          { mm2: 10, maxA: 50, maxKw: 30 },
          { mm2: 16, maxA: 63, maxKw: 38 },
          { mm2: 25, maxA: 80, maxKw: 50 },
        ]
      : [
          { mm2: 1.5, maxA: 16, maxKw: 3.5 },
          { mm2: 2.5, maxA: 25, maxKw: 5.5 },
          { mm2: 4, maxA: 32, maxKw: 7 },
          { mm2: 6, maxA: 40, maxKw: 9 },
          { mm2: 10, maxA: 50, maxKw: 11 },
          { mm2: 16, maxA: 63, maxKw: 15 },
          { mm2: 25, maxA: 80, maxKw: 18 },
        ];

  const pick =
    steps.find((step) => powerKw <= step.maxKw && ampsApprox <= step.maxA) ??
    steps[steps.length - 1];

  return {
    mm2: pick.mm2,
    ampsApprox,
    note:
      phases === "3"
        ? `Для ~${String(powerKw).replace(".", ",")} кВт (3 фазы) ориентир по току ≈ ${ampsApprox} А — медный кабель от ${pick.mm2} мм².`
        : `Для ~${String(powerKw).replace(".", ",")} кВт (1 фаза) ориентир по току ≈ ${ampsApprox} А — медный кабель от ${pick.mm2} мм².`,
  };
}
