"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  LeadContactScreen,
  type LeadFinishPayload,
} from "@/components/screens/lead-contact-screen";
import { NoPanelDetailScreen } from "@/components/screens/no-panel-detail-screen";
import { NoPanelOptionsScreen } from "@/components/screens/no-panel-options-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PanelAdvantagesScreen } from "@/components/screens/panel-advantages-screen";
import { PhotoScreen } from "@/components/screens/photo-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { RequestDetailsScreen } from "@/components/screens/request-details-screen";
import {
  getRequestNeedTitle,
  RequestTypeScreen,
  type RequestNeedId,
} from "@/components/screens/request-type-screen";
import { SchemeScreen } from "@/components/screens/scheme-screen";
import { TelegramAuthScreen } from "@/components/screens/telegram-auth-screen";
import {
  ONBOARDING_SKIP_KEY,
  WelcomeScreen,
} from "@/components/screens/welcome-screen";
import { canUseServerAuth } from "@/lib/client-auth";
import {
  clearPendingInstallLead,
  readPendingInstallLead,
} from "@/lib/pending-lead";
import {
  hapticDelete,
  hapticImpact,
  hapticNav,
  hapticNotification,
} from "@/lib/haptics";
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
    "add-panel" | "no-panel" | "call-master" | "send-request" | null
  >(null);
  const [leadBackScreen, setLeadBackScreen] = useState<AppScreen>(
    "panel-advantages",
  );
  const [noPanelSetupId, setNoPanelSetupId] = useState<NoPanelSetupId | null>(
    null,
  );
  const [requestNeedId, setRequestNeedId] = useState<RequestNeedId | null>(
    null,
  );
  const [electricalDetails, setElectricalDetails] =
    useState<ElectricalDetails | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [leadFlow, setLeadFlow] = useState<LeadFlow>("install");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const submittedLeadIds = useRef(new Set<string>());

  const go = useCallback((next: AppScreen) => {
    hapticNav();
    setScreen(next);
  }, []);

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
      | "call-master"
      | "send-request"
      | null;
    if (!pending || !canUseServerAuth()) return;

    sessionStorage.removeItem("ep_pending_auth_action");
    if (pending === "add-panel") {
      setPhotoDataUrl(null);
      setScreen("photo");
    } else if (pending === "no-panel") {
      setScreen("no-panel-options");
    } else if (pending === "call-master") {
      setLeadFlow("install");
      setLeadBackScreen("scheme");
      setScreen("lead-contact");
    } else if (pending === "send-request") {
      setLeadFlow("install");
      setLeadBackScreen("objects");
      setScreen("request-type");
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
    go("analysis");
  }, [go]);

  const requireTelegramAuth = useCallback((action: "add-panel" | "no-panel") => {
    if (canUseServerAuth()) {
      if (action === "add-panel") {
        setPhotoDataUrl(null);
        go("photo");
      } else {
        go("no-panel-options");
      }
      return;
    }
    setPendingAuthAction(action);
    go("telegram-auth");
  }, [go]);

  const startCallMaster = useCallback(() => {
    setLeadFlow("install");
    setElectricalDetails(null);
    setSelectedCity(null);
    setRequestNeedId(null);
    setLeadBackScreen("scheme");
    if (canUseServerAuth()) {
      go("lead-contact");
      return;
    }
    setPendingAuthAction("call-master");
    go("telegram-auth");
  }, [go]);

  const startSubmitRequest = useCallback(() => {
    setLeadFlow("install");
    setElectricalDetails(null);
    setSelectedCity(null);
    setNoPanelSetupId(null);
    setRequestNeedId(null);
    setLeadBackScreen("objects");
    if (canUseServerAuth()) {
      go("request-type");
      return;
    }
    setPendingAuthAction("send-request");
    go("telegram-auth");
  }, [go]);

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
        safety: null,
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
      setSafetyScore(null);
      setLinesCount(result.linesCount);
      setRailCount(result.railCount ?? 1);
      hapticNotification("success");
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
      setSafetyScore(
        panel?.phases && panel.powerKw?.trim() && typeof panel.safety === "number"
          ? panel.safety
          : null,
      );
      setLinesCount(panel?.linesCount ?? null);
      setRailCount(panel?.railCount ?? 1);
      go("scheme");
    },
    [go, items],
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

  const renameHomeItem = useCallback((id: string, name: string) => {
    setItems((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item?.kind === "panel") {
        void persistPanelPatch(id, { title: name, named: true }).catch(
          (error) => {
            console.error(error);
            setItemsError(
              error instanceof Error
                ? error.message
                : "Не удалось переименовать щиток",
            );
          },
        );
      } else if (item?.kind === "install_request") {
        void persistInstallRequestPatch(id, { title: name }).catch((error) => {
          console.error(error);
          setItemsError(
            error instanceof Error
              ? error.message
              : "Не удалось переименовать заявку",
          );
        });
      }
      return prev.map((entry) => {
        if (entry.id !== id) return entry;
        if (entry.kind === "panel") {
          return { ...entry, title: name, named: true };
        }
        return { ...entry, title: name };
      });
    });
  }, []);

  const deletePanelById = useCallback((id: string) => {
    hapticDelete();
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

  const toggleDevicePower = useCallback(
    (deviceId: number) => {
      if (!activePanelId) return;
      hapticImpact("heavy");
      setDevices((prev) => {
        if (!prev) return prev;
        return prev.map((device) =>
          device.id === deviceId
            ? { ...device, powered: device.powered === false }
            : device,
        );
      });
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const nextDevices = (item.devices ?? []).map((device) =>
            device.id === deviceId
              ? { ...device, powered: device.powered === false }
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

  const assessPanelSafety = useCallback(
    (payload: { phases: "1" | "3"; powerKw: string; safety: number }) => {
      if (!activePanelId) return;
      setSafetyScore(payload.safety);
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const next = {
            ...item,
            phases: payload.phases,
            powerKw: payload.powerKw,
            safety: payload.safety,
          };
          void persistPanelPatch(activePanelId, {
            phases: payload.phases,
            powerKw: payload.powerKw,
            safety: payload.safety,
          }).catch((error) => {
            console.error(error);
            setItemsError(
              error instanceof Error
                ? error.message
                : "Не удалось сохранить оценку безопасности",
            );
          });
          return next;
        }),
      );
    },
    [activePanelId],
  );

  const deleteRequestById = useCallback((id: string) => {
    hapticDelete();
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
    async (payload: LeadFinishPayload) => {
      if (leadFlow === "master") {
        const id = payload.id ?? `master-${Date.now()}`;
        if (submittedLeadIds.current.has(id)) return;
        submittedLeadIds.current.add(id);
        await persistMasterApplication({
          id,
          city: payload.city?.trim() || selectedCity || "—",
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
        return;
      }

      const id = payload.id ?? `request-${Date.now()}`;
      if (submittedLeadIds.current.has(id)) return;
      submittedLeadIds.current.add(id);

      const createdAt = new Date().toLocaleDateString("ru-RU");
      const setupTitle =
        payload.setupTitle ??
        (requestNeedId
          ? getRequestNeedTitle(requestNeedId)
          : noPanelSetupId
            ? getNoPanelSetup(noPanelSetupId).title
            : undefined);

      const request: InstallRequest = {
        kind: "install_request",
        id,
        title: "Заявка",
        subtitle: setupTitle
          ? `Заявка: ${setupTitle}`
          : "Заявка на установку щитка",
        status: "new",
        statusLabel: installStatusLabels.new,
        createdAt,
        city: payload.city?.trim() || selectedCity || "—",
        contactMethod: payload.contactMethod,
        phone: payload.phone,
        name: payload.name,
        dwelling: payload.dwelling ?? electricalDetails?.dwelling,
        phases: payload.phases ?? electricalDetails?.phases,
        powerKw: payload.powerKw ?? electricalDetails?.powerKw,
        setupTitle,
      };

      setItems((prev) => {
        if (prev.some((item) => item.id === id)) return prev;
        return [request, ...prev];
      });
      setActiveRequestId(id);
      setItemsError(null);
      clearPendingInstallLead();
      await persistInstallRequest(request).catch((error) => {
        console.error(error);
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить заявку",
        );
      });
    },
    [electricalDetails, leadFlow, noPanelSetupId, requestNeedId, selectedCity],
  );

  const submitLeadRef = useRef(submitLead);
  submitLeadRef.current = submitLead;

  useEffect(() => {
    const pending = readPendingInstallLead();
    if (!pending) return;
    void submitLeadRef.current(pending);
  }, []);

  if (!onboardingReady) {
    return (
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-[var(--bg)] text-zinc-900 shadow-[0_0_40px_rgba(17,17,19,0.06)]" />
    );
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-[var(--bg)] text-zinc-900 shadow-[0_0_40px_rgba(17,17,19,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.035),transparent_55%)]" />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {screen === "welcome" && (
            <WelcomeScreen key="welcome" onStart={() => go("objects")} />
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
                go("request-details");
              }}
              onDeleteItem={deleteHomeItem}
              onRenameItem={renameHomeItem}
              onNoPanel={() => requireTelegramAuth("no-panel")}
              onSubmitRequest={startSubmitRequest}
              onMenuSelect={(id) => {
                if (id === "profile") go("profile");
                if (id === "about") go("about-service");
                if (id === "master") go("become-master");
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
                go("objects");
              }}
            />
          )}
          {screen === "photo" && (
            <PhotoScreen
              key="photo"
              onBack={() => go("objects")}
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
              onBack={() => go("objects")}
              onRename={renamePanel}
              onDelete={deletePanel}
              onAssignCircuit={assignCircuitLabel}
              onToggleDevicePower={toggleDevicePower}
              onAssessSafety={assessPanelSafety}
              onCallMaster={startCallMaster}
              devices={devices ?? undefined}
              safetyScore={safetyScore}
              phases={activePanel?.phases}
              powerKw={activePanel?.powerKw}
              linesCount={linesCount ?? undefined}
              railCount={railCount ?? undefined}
            />
          )}
          {screen === "no-panel-options" && (
            <NoPanelOptionsScreen
              key="no-panel-options"
              onBack={() => go("objects")}
              onSelect={(id) => {
                setNoPanelSetupId(id);
                go("no-panel-detail");
              }}
            />
          )}
          {screen === "no-panel-detail" && noPanelSetupId && (
            <NoPanelDetailScreen
              key={`detail-${noPanelSetupId}`}
              setupId={noPanelSetupId}
              onBack={() => go("no-panel-options")}
              onContinue={() => go("panel-advantages")}
            />
          )}
          {screen === "panel-advantages" && (
            <PanelAdvantagesScreen
              key={`advantages-${noPanelSetupId ?? "default"}`}
              setupId={noPanelSetupId}
              onBack={() => go("no-panel-detail")}
              onInstall={() => {
                setLeadFlow("install");
                setElectricalDetails(null);
                setSelectedCity(null);
                setLeadBackScreen("panel-advantages");
                go("lead-contact");
              }}
            />
          )}
          {screen === "electrical-details" && (
            <ElectricalDetailsScreen
              key="electrical-details"
              onBack={() => go("panel-advantages")}
              onContinue={(details) => {
                setElectricalDetails(details);
                setLeadFlow("install");
                setLeadBackScreen("electrical-details");
                go("lead-contact");
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
                go(
                  leadFlow === "master" ? "become-master" : "panel-advantages",
                )
              }
              onConfirm={(city) => {
                setSelectedCity(city);
                setLeadBackScreen("city-select");
                go("lead-contact");
              }}
            />
          )}
          {screen === "request-type" && (
            <RequestTypeScreen
              key="request-type"
              onBack={() => go("objects")}
              onSelect={(id) => {
                setRequestNeedId(id);
                setLeadFlow("install");
                setLeadBackScreen("request-type");
                go("lead-contact");
              }}
            />
          )}
          {screen === "lead-contact" && (
            <LeadContactScreen
              key={`lead-${leadFlow}-${requestNeedId ?? "default"}`}
              variant={leadFlow}
              setupTitle={
                requestNeedId
                  ? getRequestNeedTitle(requestNeedId)
                  : noPanelSetupId
                    ? getNoPanelSetup(noPanelSetupId).title
                    : undefined
              }
              onBack={() =>
                go(leadFlow === "master" ? "city-select" : leadBackScreen)
              }
              onFinish={submitLead}
              onGoHome={() => {
                setLeadFlow("install");
                setRequestNeedId(null);
                go("objects");
              }}
            />
          )}
          {screen === "request-details" && activeRequest && (
            <RequestDetailsScreen
              key={`request-${activeRequest.id}`}
              request={activeRequest}
              onBack={() => go("objects")}
              onRename={renameRequest}
              onDelete={deleteRequest}
              onUpdate={updateRequest}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen key="profile" onBack={() => go("objects")} />
          )}
          {screen === "about-service" && (
            <AboutServiceScreen
              key="about-service"
              onBack={() => go("objects")}
            />
          )}
          {screen === "electrical-rules" && (
            <ElectricalRulesScreen
              key="electrical-rules"
              onBack={() => go("objects")}
              onOpenRule={(id) => {
                setActiveRuleId(id);
                go("electrical-rule-detail");
              }}
            />
          )}
          {screen === "electrical-rule-detail" && activeRuleId && (
            <ElectricalRuleDetailScreen
              key={`rule-${activeRuleId}`}
              ruleId={activeRuleId}
              onBack={() => go("electrical-rules")}
            />
          )}
          {screen === "become-master" && (
            <BecomeMasterScreen
              key="become-master"
              onBack={() => go("objects")}
              onConfirm={() => {
                setLeadFlow("master");
                setSelectedCity(null);
                go("city-select");
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
