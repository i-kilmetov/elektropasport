"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AboutServiceScreen } from "@/components/screens/about-service-screen";
import { AnalysisScreen } from "@/components/screens/analysis-screen";
import { BecomeMasterScreen } from "@/components/screens/become-master-screen";
import { CitySelectScreen } from "@/components/screens/city-select-screen";
import {
  ElectricalDetailsScreen,
  type ElectricalDetails,
} from "@/components/screens/electrical-details-screen";
import { ElectricalRuleDetailScreen } from "@/components/screens/electrical-rule-detail-screen";
import { ElectricalRulesScreen } from "@/components/screens/electrical-rules-screen";
import { LeadContactScreen } from "@/components/screens/lead-contact-screen";
import { NoPanelDetailScreen } from "@/components/screens/no-panel-detail-screen";
import { NoPanelOptionsScreen } from "@/components/screens/no-panel-options-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PanelAdvantagesScreen } from "@/components/screens/panel-advantages-screen";
import { PhotoScreen } from "@/components/screens/photo-screen";
import { RequestDetailsScreen } from "@/components/screens/request-details-screen";
import { SchemeScreen } from "@/components/screens/scheme-screen";
import { TelegramAuthScreen } from "@/components/screens/telegram-auth-screen";
import {
  ONBOARDING_SKIP_KEY,
  WelcomeScreen,
} from "@/components/screens/welcome-screen";
import { canUseServerAuth } from "@/lib/client-auth";
import { getNoPanelSetup, type NoPanelSetupId } from "@/lib/no-panel-setups";
import {
  fetchHomeItems,
  persistDeleteInstallRequest,
  persistDeletePanel,
  persistInstallRequest,
  persistInstallRequestPatch,
  persistMasterApplication,
  persistPanel,
  persistPanelPatch,
} from "@/lib/user-data";
import type {
  AnalyzePanelResult,
  AppScreen,
  Device,
  HomeListItem,
  InstallRequest,
  LeadFlow,
  PanelObject,
} from "@/types";
import { installStatusLabels } from "@/types";

function readSkipOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [items, setItems] = useState<HomeListItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [askNameOnBack, setAskNameOnBack] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [linesCount, setLinesCount] = useState<number | null>(null);
  const [railCount, setRailCount] = useState<number | null>(null);
  const [pendingAuthAction, setPendingAuthAction] = useState<
    "add-panel" | "no-panel" | null
  >(null);
  const [noPanelSetupId, setNoPanelSetupId] = useState<NoPanelSetupId | null>(
    null,
  );
  const [electricalDetails, setElectricalDetails] =
    useState<ElectricalDetails | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [leadFlow, setLeadFlow] = useState<LeadFlow>("install");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);

  useEffect(() => {
    if (readSkipOnboarding()) {
      setScreen("objects");
    }
    setOnboardingReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItemsLoading(true);
      setItemsError(null);
      try {
        const loaded = await fetchHomeItems();
        if (!cancelled) setItems(loaded);
      } catch (error) {
        if (!cancelled) {
          setItemsError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить данные",
          );
        }
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pending = sessionStorage.getItem("ep_pending_auth_action") as
      | "add-panel"
      | "no-panel"
      | null;
    if (!pending || !canUseServerAuth()) return;

    sessionStorage.removeItem("ep_pending_auth_action");
    if (pending === "add-panel") {
      setPhotoDataUrl(null);
      setScreen("photo");
    } else if (pending === "no-panel") {
      setScreen("no-panel-options");
    }
  }, []);

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

  const requireTelegramAuth = useCallback((action: "add-panel" | "no-panel") => {
    if (canUseServerAuth()) {
      if (action === "add-panel") {
        setPhotoDataUrl(null);
        setScreen("photo");
      } else {
        setScreen("no-panel-options");
      }
      return;
    }
    setPendingAuthAction(action);
    setScreen("telegram-auth");
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
        railCount: result.railCount ?? 1,
      };

      setItems((prev) => [panel, ...prev]);
      setItemsError(null);
      void persistPanel(panel).catch((error) => {
        console.error(error);
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить щиток",
        );
      });
      setActivePanelId(id);
      setAskNameOnBack(true);
      setDevices(result.devices);
      setSafetyScore(result.safetyScore);
      setLinesCount(result.linesCount);
      setRailCount(result.railCount ?? 1);
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
      setRailCount(panel?.railCount ?? 1);
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
      setItemsError(null);
      void persistPanelPatch(activePanelId, { title: name, named: true }).catch(
        (error) => {
          console.error(error);
          setItemsError(
            error instanceof Error
              ? error.message
              : "Не удалось переименовать щиток",
          );
        },
      );
      setAskNameOnBack(false);
    },
    [activePanelId],
  );

  const deletePanelById = useCallback((id: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.kind === "panel" && item.id === id)),
    );
    void persistDeletePanel(id).catch((error) => {
      console.error(error);
      setItemsError(
        error instanceof Error ? error.message : "Не удалось удалить щиток",
      );
    });
    setActivePanelId((current) => (current === id ? null : current));
    setPhotoDataUrl(null);
    setDevices(null);
    setSafetyScore(null);
    setLinesCount(null);
    setAskNameOnBack(false);
  }, []);

  const deletePanel = useCallback(() => {
    if (!activePanelId) {
      setScreen("objects");
      return;
    }
    deletePanelById(activePanelId);
    setScreen("objects");
  }, [activePanelId, deletePanelById]);

  const assignCircuitLabel = useCallback(
    (deviceId: number, label: string) => {
      if (!activePanelId) return;
      setDevices((prev) => {
        if (!prev) return prev;
        return prev.map((device) =>
          device.id === deviceId ? { ...device, circuitLabel: label } : device,
        );
      });
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const nextDevices = (item.devices ?? []).map((device) =>
            device.id === deviceId
              ? { ...device, circuitLabel: label }
              : device,
          );
          const next = { ...item, devices: nextDevices };
          void persistPanel(next).catch((error) => console.error(error));
          return next;
        }),
      );
    },
    [activePanelId],
  );

  const deleteRequestById = useCallback((id: string) => {
    setItems((prev) =>
      prev.filter(
        (item) => !(item.kind === "install_request" && item.id === id),
      ),
    );
    void persistDeleteInstallRequest(id).catch((error) => {
      console.error(error);
      setItemsError(
        error instanceof Error ? error.message : "Не удалось удалить заявку",
      );
    });
    setActiveRequestId((current) => (current === id ? null : current));
  }, []);

  const renameRequest = useCallback(
    (name: string) => {
      if (!activeRequestId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.kind === "install_request" && item.id === activeRequestId
            ? { ...item, title: name }
            : item,
        ),
      );
      void persistInstallRequestPatch(activeRequestId, { title: name }).catch(
        (error) => {
          console.error(error);
          setItemsError(
            error instanceof Error
              ? error.message
              : "Не удалось переименовать заявку",
          );
        },
      );
    },
    [activeRequestId],
  );

  const updateRequest = useCallback(
    (
      patch: Partial<
        Pick<InstallRequest, "status" | "statusLabel" | "exactAddress">
      >,
    ) => {
      if (!activeRequestId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.kind === "install_request" && item.id === activeRequestId
            ? { ...item, ...patch }
            : item,
        ),
      );
      void persistInstallRequestPatch(activeRequestId, patch).catch((error) => {
        console.error(error);
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось обновить заявку",
        );
      });
    },
    [activeRequestId],
  );

  const deleteRequest = useCallback(() => {
    if (!activeRequestId) {
      setScreen("objects");
      return;
    }
    deleteRequestById(activeRequestId);
    setScreen("objects");
  }, [activeRequestId, deleteRequestById]);

  const deleteHomeItem = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id);
      if (!item) return;
      if (item.kind === "panel") deletePanelById(id);
      else deleteRequestById(id);
    },
    [deletePanelById, deleteRequestById, items],
  );

  const submitLead = useCallback(
    async (payload: {
      contactMethod: "phone" | "telegram";
      phone?: string;
      name: string;
    }) => {
      if (leadFlow === "master") {
        const id = `master-${Date.now()}`;
        await persistMasterApplication({
          id,
          city: selectedCity ?? "—",
          contactMethod: payload.contactMethod,
          phone: payload.phone,
          name: payload.name,
        }).catch((error) => {
          console.error(error);
          setItemsError(
            error instanceof Error
              ? error.message
              : "Не удалось отправить заявку мастера",
          );
        });
        setLeadFlow("install");
        return;
      }

      const id = `request-${Date.now()}`;
      const createdAt = new Date().toLocaleDateString("ru-RU");
      const setupTitle = noPanelSetupId
        ? getNoPanelSetup(noPanelSetupId).title
        : undefined;

      const request: InstallRequest = {
        kind: "install_request",
        id,
        title: "Заявка",
        subtitle: "Заявка на установку щитка",
        status: "new",
        statusLabel: installStatusLabels.new,
        createdAt,
        city: "—",
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
      setItemsError(null);
      await persistInstallRequest(request).catch((error) => {
        console.error(error);
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить заявку",
        );
      });
    },
    [electricalDetails, leadFlow, noPanelSetupId, selectedCity],
  );

  if (!onboardingReady) {
    return (
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-[var(--bg)] text-white shadow-[0_0_80px_rgba(0,0,0,0.5)]" />
    );
  }

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
              loading={itemsLoading}
              error={itemsError}
              onAdd={() => requireTelegramAuth("add-panel")}
              onOpenPanel={openPanel}
              onOpenRequest={(id) => {
                setActiveRequestId(id);
                setScreen("request-details");
              }}
              onDeleteItem={deleteHomeItem}
              onNoPanel={() => requireTelegramAuth("no-panel")}
              onMenuSelect={(id) => {
                if (id === "about") setScreen("about-service");
                if (id === "electrical") setScreen("electrical-rules");
                if (id === "master") setScreen("become-master");
              }}
            />
          )}
          {screen === "telegram-auth" && (
            <TelegramAuthScreen
              key="telegram-auth"
              pendingAction={pendingAuthAction ?? undefined}
              onBack={() => {
                setPendingAuthAction(null);
                sessionStorage.removeItem("ep_pending_auth_action");
                setScreen("objects");
              }}
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
              onAssignCircuit={assignCircuitLabel}
              devices={devices ?? undefined}
              safetyScore={safetyScore ?? undefined}
              linesCount={linesCount ?? undefined}
              railCount={railCount ?? undefined}
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
              key={`advantages-${noPanelSetupId ?? "default"}`}
              setupId={noPanelSetupId}
              onBack={() => setScreen("no-panel-detail")}
              onInstall={() => {
                setLeadFlow("install");
                setElectricalDetails(null);
                setSelectedCity(null);
                setScreen("lead-contact");
              }}
            />
          )}
          {screen === "electrical-details" && (
            <ElectricalDetailsScreen
              key="electrical-details"
              onBack={() => setScreen("panel-advantages")}
              onContinue={(details) => {
                setElectricalDetails(details);
                setLeadFlow("install");
                setScreen("lead-contact");
              }}
            />
          )}
          {screen === "city-select" && (
            <CitySelectScreen
              key={`city-${leadFlow}`}
              title={
                leadFlow === "master"
                  ? "В каком городе работаете?"
                  : "В каком городе нужна консультация?"
              }
              description={
                leadFlow === "master"
                  ? "Укажите город — так мы поймём, где вы можете брать заявки."
                  : "Укажите город — мы свяжемся и подскажем, как правильно собрать щиток в вашей ситуации."
              }
              onBack={() =>
                setScreen(
                  leadFlow === "master" ? "become-master" : "panel-advantages",
                )
              }
              onConfirm={(city) => {
                setSelectedCity(city);
                setScreen("lead-contact");
              }}
            />
          )}
          {screen === "lead-contact" && (
            <LeadContactScreen
              key={`lead-${leadFlow}`}
              variant={leadFlow}
              onBack={() =>
                setScreen(
                  leadFlow === "master" ? "city-select" : "panel-advantages",
                )
              }
              onFinish={submitLead}
              onGoHome={() => setScreen("objects")}
            />
          )}
          {screen === "request-details" && activeRequest && (
            <RequestDetailsScreen
              key={`request-${activeRequest.id}`}
              request={activeRequest}
              onBack={() => setScreen("objects")}
              onRename={renameRequest}
              onDelete={deleteRequest}
              onUpdate={updateRequest}
            />
          )}
          {screen === "about-service" && (
            <AboutServiceScreen
              key="about-service"
              onBack={() => setScreen("objects")}
            />
          )}
          {screen === "electrical-rules" && (
            <ElectricalRulesScreen
              key="electrical-rules"
              onBack={() => setScreen("objects")}
              onOpenRule={(id) => {
                setActiveRuleId(id);
                setScreen("electrical-rule-detail");
              }}
            />
          )}
          {screen === "electrical-rule-detail" && activeRuleId && (
            <ElectricalRuleDetailScreen
              key={`rule-${activeRuleId}`}
              ruleId={activeRuleId}
              onBack={() => setScreen("electrical-rules")}
            />
          )}
          {screen === "become-master" && (
            <BecomeMasterScreen
              key="become-master"
              onBack={() => setScreen("objects")}
              onConfirm={() => {
                setLeadFlow("master");
                setSelectedCity(null);
                setScreen("city-select");
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
