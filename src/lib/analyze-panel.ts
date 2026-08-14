import type { AnalyzePanelResult } from "@/types";

export async function analyzePanel(
  imageDataUrl: string,
): Promise<AnalyzePanelResult> {
  const res = await fetch("/api/analyze-panel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: imageDataUrl }),
  });

  const data = (await res.json()) as AnalyzePanelResult & { error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось проанализировать фото");
  }

  return {
    devices: data.devices,
    safetyScore: data.safetyScore,
    linesCount: data.linesCount,
    railCount: data.railCount,
  };
}
