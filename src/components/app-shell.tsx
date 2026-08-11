"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AnalysisScreen } from "@/components/screens/analysis-screen";
import { CitySelectScreen } from "@/components/screens/city-select-screen";
import {
  ElectricalDetailsScreen,
  type ElectricalDetails,
} from "@/components/screens/electrical-details-screen";
import { LeadContactScreen } from "@/components/screens/lead-contact-screen";
import { NoPanelDetailScreen } from "@/components/screens/no-panel-detail-screen";
import { NoPanelOptionsScreen } from "@/components/screens/no-panel-options-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PanelAdvantagesScreen } from "@/components/screens/panel-advantages-screen";
import { PhotoScreen } from "@/components/screens/photo-screen";
import { RequestDetailsScreen } from "@/components/screens/request-details-screen";
import { SchemeScreen } from "@/components/screens/scheme-screen";
import { WelcomeScreen } from "@/components/screens/welcome-screen";
import { getNoPanelSetup, type NoPanelSetupId } from "@/lib/no-panel-setups";
import type {
  AnalyzePanelResult,
  AppScreen,
  Device,
  HomeListItem,
  InstallRequest,
  PanelObject,
} from "@/types";
import { installStatusLabels } from "@/types";

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [items, setItems] = useState<HomeListItem[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [askNameOnBack, setAskNameOnBack] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [linesCount, setLinesCount] = useState<number | null>(null);
  const [noPanelSetupId, setNoPanelSetupId] = useState<NoPanelSetupId | null>(
    null,
  );
  const [electricalDetails, setElectricalDetails] =
    useState<ElectricalDetails | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const activePanel = useMemo(
    () =>
      items.find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === activePanelId,
      ) ?? null,
    [items, activePanelId],
  );

  const activeRequest = useMemo(
    () =>
      items.find(
        (item): item is InstallRequest =>
          item.kind === "install_request" && item.id === activeRequestId,
      ) ?? null,
    [items, activeRequestId],
  );

  const handlePhoto = useCallback((dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setScreen("analysis");
  }, []);

  const handleAnalysisDone = useCallback(
    (result: AnalyzePanelResult) => {
      const today = new Date();
      const lastCheck = today.toLocaleDateString("ru-RU");
      const panelCount = items.filter((i) => i.kind === "panel").length;
      const id = `panel-${Date.now()}`;
      const panel: PanelObject = {
        kind: "panel",
        id,
        type: "apartment",
        title: `Щиток ${panelCount + 1}`,
        address: "Добавлен по фото",
        lastCheck,
        breakers: result.devices.length,
        safety: result.safetyScore,
        devices: result.devices,
        linesCount: result.linesCount,
        photoDataUrl: photoDataUrl ?? undefined,
        named: false,
      };

      setItems((prev) => [panel, ...prev]);
      setActivePanelId(id);
      setAskNameOnBack(true);
      setDevices(result.devices);
      setSafetyScore(result.safetyScore);
      setLinesCount(result.linesCount);
      setScreen("scheme");
    },
    [items, photoDataUrl],
  );

  const openPanel = useCallback(
    (id: string) => {
      const panel = items.find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === id,
      );
      setActivePanelId(id);
      setAskNameOnBack(false);
      setPhotoDataUrl(panel?.photoDataUrl ?? null);
      setDevices(panel?.devices ?? null);
      setSafetyScore(panel?.safety ?? null);
      setLinesCount(panel?.linesCount ?? null);
      setScreen("scheme");
    },
    [items],
  );

  const renamePanel = useCallback(
    (name: string) => {
      if (!activePanelId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.kind === "panel" && item.id === activePanelId
            ? { ...item, title: name, named: true }
            : item,
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
    setItems((prev) =>
      prev.filter(
        (item) => !(item.kind === "panel" && item.id === activePanelId),
      ),
    );
    setActivePanelId(null);
    setPhotoDataUrl(null);
    setDevices(null);
    setSafetyScore(null);
    setLinesCount(null);
    setAskNameOnBack(false);
    setScreen("objects");
  }, [activePanelId]);

  const submitLead = useCallback(
    (payload: {
      contactMethod: "phone" | "telegram";
      phone?: string;
      name: string;
    }) => {
      const id = `request-${Date.now()}`;
      const createdAt = new Date().toLocaleDateString("ru-RU");
      const setupTitle = noPanelSetupId
        ? getNoPanelSetup(noPanelSetupId).title
        : undefined;

      const request: InstallRequest = {
        kind: "install_request",
        id,
        title: "Заявка",
        subtitle: "На установку щитка",
        status: "new",
        statusLabel: installStatusLabels.new,
        createdAt,
        city: selectedCity ?? "—",
        contactMethod: payload.contactMethod,
        phone: payload.phone,
        name: payload.name,
        dwelling: electricalDetails?.dwelling,
        phases: electricalDetails?.phases,
        powerKw: electricalDetails?.powerKw,
        setupTitle,
      };

      setItems((prev) => [request, ...prev]);
      setActiveRequestId(id);
      setScreen("objects");
    },
    [electricalDetails, noPanelSetupId, selectedCity],
  );

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
              items={items}
              onAdd={() => {
                setPhotoDataUrl(null);
                setScreen("photo");
              }}
              onOpenPanel={openPanel}
              onOpenRequest={(id) => {
                setActiveRequestId(id);
                setScreen("request-details");
              }}
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
              onContinue={() => setScreen("panel-advantages")}
            />
          )}
          {screen === "panel-advantages" && (
            <PanelAdvantagesScreen
              key="panel-advantages"
              onBack={() => setScreen("no-panel-detail")}
              onInstall={() => setScreen("electrical-details")}
            />
          )}
          {screen === "electrical-details" && (
            <ElectricalDetailsScreen
              key="electrical-details"
              onBack={() => setScreen("panel-advantages")}
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
              onConfirm={(city) => {
                setSelectedCity(city);
                setScreen("lead-contact");
              }}
            />
          )}
          {screen === "lead-contact" && selectedCity && (
            <LeadContactScreen
              key={`lead-${selectedCity}`}
              city={selectedCity}
              onBack={() => setScreen("city-select")}
              onFinish={submitLead}
            />
          )}
          {screen === "request-details" && activeRequest && (
            <RequestDetailsScreen
              key={`request-${activeRequest.id}`}
              request={activeRequest}
              onBack={() => setScreen("objects")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
