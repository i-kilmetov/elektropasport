"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AnalysisScreen } from "@/components/screens/analysis-screen";
import { CitySelectScreen } from "@/components/screens/city-select-screen";
import { ElectricalDetailsScreen } from "@/components/screens/electrical-details-screen";
import { NoPanelDetailScreen } from "@/components/screens/no-panel-detail-screen";
import { NoPanelOptionsScreen } from "@/components/screens/no-panel-options-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PhotoScreen } from "@/components/screens/photo-screen";
import { SchemeScreen } from "@/components/screens/scheme-screen";
import { WelcomeScreen } from "@/components/screens/welcome-screen";
import type { NoPanelSetupId } from "@/lib/no-panel-setups";
import type { AnalyzePanelResult, AppScreen, Device, PanelObject } from "@/types";
import type { ElectricalDetails } from "@/components/screens/electrical-details-screen";

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [panels, setPanels] = useState<PanelObject[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [askNameOnBack, setAskNameOnBack] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [linesCount, setLinesCount] = useState<number | null>(null);
  const [noPanelSetupId, setNoPanelSetupId] = useState<NoPanelSetupId | null>(
    null,
  );
  const [electricalDetails, setElectricalDetails] =
    useState<ElectricalDetails | null>(null);

  const activePanel = useMemo(
    () => panels.find((p) => p.id === activePanelId) ?? null,
    [panels, activePanelId],
  );

  const handlePhoto = useCallback((dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setScreen("analysis");
  }, []);

  const handleAnalysisDone = useCallback(
    (result: AnalyzePanelResult) => {
      const today = new Date();
      const lastCheck = today.toLocaleDateString("ru-RU");
      const id = `panel-${Date.now()}`;
      const panel: PanelObject = {
        id,
        type: "apartment",
        title: `Щиток ${panels.length + 1}`,
        address: "Добавлен по фото",
        lastCheck,
        breakers: result.devices.length,
        safety: result.safetyScore,
        devices: result.devices,
        linesCount: result.linesCount,
        photoDataUrl: photoDataUrl ?? undefined,
        named: false,
      };

      setPanels((prev) => [panel, ...prev]);
      setActivePanelId(id);
      setAskNameOnBack(true);
      setDevices(result.devices);
      setSafetyScore(result.safetyScore);
      setLinesCount(result.linesCount);
      setScreen("scheme");
    },
    [panels.length, photoDataUrl],
  );

  const openPanel = useCallback(
    (id: string) => {
      const panel = panels.find((p) => p.id === id);
      setActivePanelId(id);
      setAskNameOnBack(false);
      setPhotoDataUrl(panel?.photoDataUrl ?? null);
      setDevices(panel?.devices ?? null);
      setSafetyScore(panel?.safety ?? null);
      setLinesCount(panel?.linesCount ?? null);
      setScreen("scheme");
    },
    [panels],
  );

  const renamePanel = useCallback(
    (name: string) => {
      if (!activePanelId) return;
      setPanels((prev) =>
        prev.map((p) =>
          p.id === activePanelId ? { ...p, title: name, named: true } : p,
        ),
      );
      setAskNameOnBack(false);
    },
    [activePanelId],
  );

  const deletePanel = useCallback(() => {
    if (!activePanelId) {
      setScreen("objects");
      return;
    }
    setPanels((prev) => prev.filter((p) => p.id !== activePanelId));
    setActivePanelId(null);
    setPhotoDataUrl(null);
    setDevices(null);
    setSafetyScore(null);
    setLinesCount(null);
    setAskNameOnBack(false);
    setScreen("objects");
  }, [activePanelId]);

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-[var(--bg)] text-white shadow-[0_0_80px_rgba(0,0,0,0.5)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.12),transparent_55%)]" />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {screen === "welcome" && (
            <WelcomeScreen key="welcome" onStart={() => setScreen("objects")} />
          )}
          {screen === "objects" && (
            <ObjectsScreen
              key="objects"
              panels={panels}
              onAdd={() => {
                setPhotoDataUrl(null);
                setScreen("photo");
              }}
              onOpen={openPanel}
              onNoPanel={() => setScreen("no-panel-options")}
            />
          )}
          {screen === "photo" && (
            <PhotoScreen
              key="photo"
              onBack={() => setScreen("objects")}
              onCapture={handlePhoto}
            />
          )}
          {screen === "analysis" && (
            <AnalysisScreen
              key={
                photoDataUrl
                  ? `analysis-${photoDataUrl.slice(0, 24)}`
                  : "analysis"
              }
              photoDataUrl={photoDataUrl}
              onDone={handleAnalysisDone}
            />
          )}
          {screen === "scheme" && (
            <SchemeScreen
              key={activePanelId ?? "scheme"}
              title={activePanel?.title ?? "Щиток"}
              photoDataUrl={activePanel?.photoDataUrl ?? photoDataUrl}
              askNameOnBack={askNameOnBack}
              onBack={() => setScreen("objects")}
              onRename={renamePanel}
              onDelete={deletePanel}
              devices={devices ?? undefined}
              safetyScore={safetyScore ?? undefined}
              linesCount={linesCount ?? undefined}
            />
          )}
          {screen === "no-panel-options" && (
            <NoPanelOptionsScreen
              key="no-panel-options"
              onBack={() => setScreen("objects")}
              onSelect={(id) => {
                setNoPanelSetupId(id);
                setScreen("no-panel-detail");
              }}
            />
          )}
          {screen === "no-panel-detail" && noPanelSetupId && (
            <NoPanelDetailScreen
              key={`detail-${noPanelSetupId}`}
              setupId={noPanelSetupId}
              onBack={() => setScreen("no-panel-options")}
              onInstall={() => setScreen("electrical-details")}
            />
          )}
          {screen === "electrical-details" && (
            <ElectricalDetailsScreen
              key="electrical-details"
              onBack={() => setScreen("no-panel-detail")}
              onContinue={(details) => {
                setElectricalDetails(details);
                setScreen("city-select");
              }}
            />
          )}
          {screen === "city-select" && (
            <CitySelectScreen
              key="city-select"
              onBack={() => setScreen("electrical-details")}
              onConfirm={() => setScreen("objects")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
