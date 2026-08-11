"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AnalysisScreen } from "@/components/screens/analysis-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PhotoScreen } from "@/components/screens/photo-screen";
import { SchemeScreen } from "@/components/screens/scheme-screen";
import { WelcomeScreen } from "@/components/screens/welcome-screen";
import type { AnalyzePanelResult, AppScreen, Device } from "@/types";

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [linesCount, setLinesCount] = useState<number | null>(null);

  const handlePhoto = useCallback((dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setScreen("analysis");
  }, []);

  const handleAnalysisDone = useCallback((result: AnalyzePanelResult) => {
    setDevices(result.devices);
    setSafetyScore(result.safetyScore);
    setLinesCount(result.linesCount);
    setScreen("scheme");
  }, []);

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
              onAdd={() => {
                setPhotoDataUrl(null);
                setScreen("photo");
              }}
              onOpen={() => setScreen("scheme")}
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
              key={photoDataUrl ? `analysis-${photoDataUrl.slice(0, 24)}` : "analysis"}
              photoDataUrl={photoDataUrl}
              onDone={handleAnalysisDone}
            />
          )}
          {screen === "scheme" && (
            <SchemeScreen
              key="scheme"
              onBack={() => setScreen("objects")}
              devices={devices ?? undefined}
              safetyScore={safetyScore ?? undefined}
              linesCount={linesCount ?? undefined}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
