"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AboutServiceScreen } from "@/components/screens/about-service-screen";
import { AnalysisScreen } from "@/components/screens/analysis-screen";
import { BecomeMasterScreen } from "@/components/screens/become-master-screen";
import { CitySelectScreen } from "@/components/screens/city-select-screen";
import { FeedbackScreen } from "@/components/screens/feedback-screen";
import { MasterAboutScreen } from "@/components/screens/master-about-screen";
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
import { LeadServiceScreen } from "@/components/screens/lead-service-screen";
import { NoPanelDetailScreen } from "@/components/screens/no-panel-detail-screen";
import { NoPanelOptionsScreen } from "@/components/screens/no-panel-options-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PanelLimitSheet } from "@/components/screens/panel-limit-sheet";
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
import { syncUserProfileFromServer } from "@/lib/user-profile";
import {
  hapticDelete,
  hapticNav,
  hapticNotification,
} from "@/lib/haptics";
import { getNoPanelSetup, type NoPanelSetupId } from "@/lib/no-panel-setups";
import { resolveRequestTypeCode } from "@/lib/request-codes";
import {
  buildLeadServiceSetupTitle,
  countPanelModules,
  masterLabelingPriceRub,
  ONLINE_CONSULTATION_PRICE_RUB,
  resolveRequestTypeCodeForService,
  type LeadServiceType,
} from "@/lib/lead-services";
import {
  claimInviteToken,
  fetchHomeItems,
  fetchPanelQuota,
  persistDeleteInstallRequest,
  persistDeletePanel,
  persistInstallRequest,
  persistInstallRequestPatch,
  persistMasterApplication,
  persistPanel,
  persistPanelPatch,
  createPanelShare,
  fetchSharedPanel,
} from "@/lib/user-data";
import { syncRatingFromCharacteristics } from "@/lib/device-spec-guide";
import { deriveRailCount } from "@/lib/panel-rails";
import { isInviteToken, type PanelQuota } from "@/lib/invites";
import {
  DEVICE_TYPE_OPTIONS,
} from "@/lib/manufacturer-brands";
import {
  getTelegramStartParam,
  isPanelShareToken,
} from "@/lib/panel-share";
import type {
  AnalyzePanelResult,
  AppScreen,
  Device,
  HomeListItem,
  InstallRequest,
  LeadFlow,
  PanelObject,
  PanelWire,
} from "@/types";
import { installStatusLabels } from "@/types";
import { cn } from "@/lib/utils";

function panelRailCount(
  panel: Pick<PanelObject, "railCount" | "devices"> | null | undefined,
  fallbackDevices?: Device[] | null,
): number {
  if (panel?.railCount && panel.railCount > 0) return panel.railCount;
  return deriveRailCount(panel?.devices ?? fallbackDevices);
}

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
  const [quota, setQuota] = useState<PanelQuota | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [askNameOnBack, setAskNameOnBack] = useState(false);
  const [sharedPreview, setSharedPreview] = useState<{
    panel: PanelObject;
    token: string;
  } | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [linesCount, setLinesCount] = useState<number | null>(null);
  const [railCount, setRailCount] = useState<number | null>(null);
  const [retakePanelId, setRetakePanelId] = useState<string | null>(null);
  const [pendingAuthAction, setPendingAuthAction] = useState<
    "add-panel" | "no-panel" | "call-master" | null
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
  const [selectedLeadService, setSelectedLeadService] =
    useState<LeadServiceType | null>(null);
  const [leadPanelModules, setLeadPanelModules] = useState<number | null>(null);
  const [masterAbout, setMasterAbout] = useState("");
  const [leadFlow, setLeadFlow] = useState<LeadFlow>("install");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const submittedLeadIds = useRef(new Set<string>());
  const consumedShareRef = useRef(false);

  const go = useCallback((next: AppScreen) => {
    hapticNav();
    setScreen(next);
  }, []);

  const refreshQuota = useCallback(async () => {
    try {
      const next = await fetchPanelQuota();
      setQuota(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  const openPanelLimit = useCallback(() => {
    setLimitOpen(true);
    void refreshQuota();
  }, [refreshQuota]);

  useEffect(() => {
    const startParam = getTelegramStartParam();
    if (readSkipOnboarding() || (startParam && isPanelShareToken(startParam))) {
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
        if (canUseServerAuth()) {
          const invite = getTelegramStartParam();
          if (isInviteToken(invite)) {
            try {
              const claimed = await claimInviteToken(invite);
              if (!cancelled && claimed) setQuota(claimed);
            } catch (error) {
              console.error(error);
            }
          }
          await syncUserProfileFromServer();
        }
        const loaded = await fetchHomeItems();
        if (!cancelled) setItems(loaded);
        const nextQuota = await fetchPanelQuota();
        if (!cancelled) setQuota(nextQuota);
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
      setElectricalDetails(null);
      setRequestNeedId(null);
      setNoPanelSetupId(null);
      setSelectedCity(null);
      setSelectedLeadService(null);
      setLeadBackScreen("scheme");
      setScreen("city-select");
    }
  }, []);

  const activePanel = useMemo(
    () =>
      sharedPreview?.panel ??
      items.find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === activePanelId,
      ) ??
      null,
    [items, activePanelId, sharedPreview],
  );

  const activeRequest = useMemo(
    () =>
      items.find(
        (item): item is InstallRequest =>
          item.kind === "install_request" && item.id === activeRequestId,
      ) ?? null,
    [items, activeRequestId],
  );

  const installSetupTitle = useMemo(() => {
    if (selectedLeadService) {
      const estimatedPriceRub =
        selectedLeadService === "online_consultation"
          ? ONLINE_CONSULTATION_PRICE_RUB
          : selectedLeadService === "master_labeling" && leadPanelModules
            ? masterLabelingPriceRub(leadPanelModules)
            : null;
      return buildLeadServiceSetupTitle({
        serviceType: selectedLeadService,
        panelModules: leadPanelModules ?? undefined,
        estimatedPriceRub,
      });
    }
    if (requestNeedId) return getRequestNeedTitle(requestNeedId);
    if (noPanelSetupId) return getNoPanelSetup(noPanelSetupId).title;
    return undefined;
  }, [
    selectedLeadService,
    leadPanelModules,
    requestNeedId,
    noPanelSetupId,
  ]);

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
    setSelectedLeadService(null);
    setRequestNeedId(null);
    setNoPanelSetupId(null);
    setLeadBackScreen("scheme");
    const panelDevices = activePanel?.devices ?? devices;
    const modules = countPanelModules(panelDevices);
    setLeadPanelModules(modules > 0 ? modules : null);
    if (canUseServerAuth()) {
      go("city-select");
      return;
    }
    setPendingAuthAction("call-master");
    go("telegram-auth");
  }, [go, activePanel?.devices, devices]);

  const handleAnalysisDone = useCallback(
    (result: AnalyzePanelResult) => {
      if (retakePanelId) {
        const panelId = retakePanelId;
        setRetakePanelId(null);
        setItems((prev) =>
          prev.map((item) => {
            if (item.kind !== "panel" || item.id !== panelId) return item;
            const next: PanelObject = {
              ...item,
              breakers: result.devices.length,
              devices: result.devices,
              linesCount: result.linesCount,
              photoDataUrl: photoDataUrl ?? item.photoDataUrl,
              railCount:
                result.railCount ??
                item.railCount ??
                deriveRailCount(result.devices),
              safety: null,
            };
            void persistPanel(next).catch((error) => console.error(error));
            return next;
          }),
        );
        setActivePanelId(panelId);
        setAskNameOnBack(false);
        setDevices(result.devices);
        setSafetyScore(null);
        setLinesCount(result.linesCount);
        setRailCount(
          result.railCount ?? deriveRailCount(result.devices),
        );
        hapticNotification("success");
        setScreen("scheme");
        return;
      }

      if (quota && quota.remaining <= 0) {
        setScreen("objects");
        openPanelLimit();
        return;
      }
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
        railCount: result.railCount ?? deriveRailCount(result.devices),
      };

      setItems((prev) => [panel, ...prev]);
      setItemsError(null);
      void persistPanel(panel).catch((error) => {
        console.error(error);
        setItems((prev) => prev.filter((item) => item.id !== id));
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить щиток",
        );
        if (error instanceof Error && error.name === "PanelLimitError") {
          setScreen("objects");
          openPanelLimit();
        }
      });
      setActivePanelId(id);
      setAskNameOnBack(true);
      setDevices(result.devices);
      setSafetyScore(null);
      setLinesCount(result.linesCount);
      setRailCount(result.railCount ?? deriveRailCount(result.devices));
      hapticNotification("success");
      setScreen("scheme");
      void refreshQuota();
    },
    [items, openPanelLimit, photoDataUrl, quota, refreshQuota, retakePanelId],
  );

  const openPanel = useCallback(
    (id: string) => {
      const panel = items.find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === id,
      );
      setSharedPreview(null);
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
      setRailCount(panelRailCount(panel));
      go("scheme");
    },
    [go, items],
  );

  const showPanel = useCallback(
    (panel: PanelObject, options?: { askName?: boolean }) => {
      setSharedPreview(null);
      setActivePanelId(panel.id);
      setAskNameOnBack(options?.askName ?? false);
      setPhotoDataUrl(panel.photoDataUrl ?? null);
      setDevices(panel.devices ?? null);
      setSafetyScore(
        panel.phases && panel.powerKw?.trim() && typeof panel.safety === "number"
          ? panel.safety
          : null,
      );
      setLinesCount(panel.linesCount ?? null);
      setRailCount(panelRailCount(panel));
      setScreen("scheme");
    },
    [],
  );

  const openSharedPanel = useCallback(
    async (token: string) => {
      if (!isPanelShareToken(token) || !canUseServerAuth()) return;
      try {
        const { panel, isOwner } = await fetchSharedPanel(token);
        if (isOwner) {
          const owned =
            items.find(
              (item): item is PanelObject =>
                item.kind === "panel" && item.id === panel.id,
            ) ?? panel;
          if (!items.some((item) => item.id === owned.id)) {
            setItems((prev) => [owned, ...prev]);
          }
          showPanel(owned);
          return;
        }

        const alreadySaved = items.find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.sourceShareToken === token,
        );
        if (alreadySaved) {
          showPanel(alreadySaved);
          return;
        }

        setSharedPreview({ panel, token });
        setActivePanelId(null);
        setAskNameOnBack(false);
        setPhotoDataUrl(null);
        setDevices(panel.devices ?? null);
        setSafetyScore(
          panel.phases &&
            panel.powerKw?.trim() &&
            typeof panel.safety === "number"
            ? panel.safety
            : null,
        );
        setLinesCount(panel.linesCount ?? null);
        setRailCount(panelRailCount(panel));
        setScreen("scheme");
      } catch (error) {
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось открыть щиток по ссылке",
        );
        setScreen("objects");
      }
    },
    [items, showPanel],
  );

  const saveSharedPanel = useCallback(() => {
    if (!sharedPreview) {
      go("objects");
      return;
    }
    if (quota && quota.remaining <= 0) {
      go("objects");
      openPanelLimit();
      return;
    }
    const source = sharedPreview.panel;
    const id = `panel-${Date.now()}`;
    const copy: PanelObject = {
      ...source,
      id,
      address: "Прислано другим пользователем",
      lastCheck: new Date().toLocaleDateString("ru-RU"),
      named: true,
      sourceShareToken: sharedPreview.token,
      photoDataUrl: undefined,
    };
    setItems((prev) => [copy, ...prev]);
    setItemsError(null);
    void persistPanel(copy).catch((error) => {
      console.error(error);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setItemsError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить щиток",
      );
      if (error instanceof Error && error.name === "PanelLimitError") {
        openPanelLimit();
      }
    });
    setSharedPreview(null);
    hapticNotification("success");
    go("objects");
    void refreshQuota();
  }, [go, openPanelLimit, quota, refreshQuota, sharedPreview]);

  const shareActivePanel = useCallback(async () => {
    const panelId = activePanelId ?? sharedPreview?.panel.id;
    if (!panelId) return "";
    try {
      const { url } = await createPanelShare(panelId);
      setItemsError(null);
      return url;
    } catch (error) {
      setItemsError(
        error instanceof Error
          ? error.message
          : "Не удалось создать ссылку на щиток",
      );
      return "";
    }
  }, [activePanelId, sharedPreview]);

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
    void refreshQuota();
    setActivePanelId((current) => (current === id ? null : current));
    setPhotoDataUrl(null);
    setDevices(null);
    setSafetyScore(null);
    setLinesCount(null);
    setAskNameOnBack(false);
  }, [refreshQuota]);

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

  const updateDeviceSticker = useCallback(
    (
      deviceId: number,
      patch: { circuitLabel?: string; stickerIcon?: string },
    ) => {
      if (!activePanelId) return;
      const patchDevice = (device: Device): Device =>
        device.id === deviceId ? { ...device, ...patch } : device;
      setDevices((prev) => (prev ? prev.map(patchDevice) : prev));
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const nextDevices = (item.devices ?? []).map(patchDevice);
          const next = { ...item, devices: nextDevices };
          void persistPanel(next).catch((error) => console.error(error));
          return next;
        }),
      );
    },
    [activePanelId],
  );

  const updatePanelWires = useCallback(
    (nextWires: PanelWire[]) => {
      if (!activePanelId) return;
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const next = { ...item, wires: nextWires };
          void persistPanel(next).catch((error) => console.error(error));
          return next;
        }),
      );
    },
    [activePanelId],
  );

  const updateDeviceCharacteristic = useCallback(
    (deviceId: number, key: string, value: string) => {
      if (!activePanelId) return;

      const patchDevice = (device: Device): Device => {
        if (device.id !== deviceId) return device;

        if (key === "Модули") {
          const modules = Number.parseInt(value, 10);
          if (!Number.isFinite(modules)) return device;
          return { ...device, modules };
        }

        const nextCharacteristics = {
          ...(device.characteristics ?? {}),
          [key]: value,
        };
        if (key === "Номинал" && !nextCharacteristics["Номинальный ток"]) {
          nextCharacteristics["Номинальный ток"] = value;
        }

        return {
          ...device,
          characteristics: nextCharacteristics,
          rating: syncRatingFromCharacteristics(device, nextCharacteristics),
        };
      };

      setDevices((prev) => {
        if (!prev) return prev;
        return prev.map(patchDevice);
      });
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const nextDevices = (item.devices ?? []).map(patchDevice);
          const next = { ...item, devices: nextDevices };
          void persistPanel(next).catch((error) => console.error(error));
          return next;
        }),
      );
    },
    [activePanelId],
  );

  const updateDeviceIdentity = useCallback(
    (
      deviceId: number,
      patch: {
        type?: Device["type"];
        manufacturer?: string;
        brandKey?: string;
      },
    ) => {
      if (!activePanelId) return;

      const patchDevice = (device: Device): Device => {
        if (device.id !== deviceId) return device;
        const typeLabel = patch.type
          ? (DEVICE_TYPE_OPTIONS.find((item) => item.type === patch.type)
              ?.label ?? device.name)
          : undefined;
        const characteristics = {
          ...(device.characteristics ?? {}),
          ...(patch.manufacturer
            ? { Производитель: patch.manufacturer }
            : {}),
          ...(typeLabel ? { Тип: typeLabel } : {}),
        };
        return {
          ...device,
          ...patch,
          name: typeLabel ?? device.name,
          characteristics,
          // User confirmed identity — show logo/type/specs on the scheme.
          status: "verified",
          confidence: 100,
        };
      };

      setDevices((prev) => {
        if (!prev) return prev;
        return prev.map(patchDevice);
      });
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const nextDevices = (item.devices ?? []).map(patchDevice);
          const next = { ...item, devices: nextDevices };
          void persistPanel(next).catch((error) => console.error(error));
          return next;
        }),
      );
    },
    [activePanelId],
  );

  const assessPanelSafety = useCallback(
    (payload: {
      phases: "1" | "3";
      powerKw: string;
      hasGround: boolean;
      safety: number;
    }) => {
      if (!activePanelId) return;
      setSafetyScore(payload.safety);
      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "panel" || item.id !== activePanelId) return item;
          const next = {
            ...item,
            phases: payload.phases,
            powerKw: payload.powerKw,
            hasGround: payload.hasGround,
            safety: payload.safety,
          };
          void persistPanelPatch(activePanelId, {
            phases: payload.phases,
            powerKw: payload.powerKw,
            hasGround: payload.hasGround,
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
          about: masterAbout,
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
        title: payload.publicCode ?? "Заявка",
        subtitle: setupTitle
          ? `Заявка: ${setupTitle}`
          : "Заявка на установку щитка",
        publicCode: payload.publicCode,
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
    [
      electricalDetails,
      leadFlow,
      masterAbout,
      noPanelSetupId,
      requestNeedId,
      selectedCity,
    ],
  );

  const submitLeadRef = useRef(submitLead);
  submitLeadRef.current = submitLead;

  useEffect(() => {
    const pending = readPendingInstallLead();
    if (!pending) return;
    void submitLeadRef.current(pending);
  }, []);

  useEffect(() => {
    if (!onboardingReady || itemsLoading || consumedShareRef.current) return;
    const token = getTelegramStartParam();
    if (!token || !isPanelShareToken(token)) return;
    consumedShareRef.current = true;
    void openSharedPanel(token);
  }, [itemsLoading, onboardingReady, openSharedPanel]);

  if (!onboardingReady) {
    return (
      <div className="relative h-[var(--app-height,100dvh)] w-full overflow-hidden bg-[var(--bg)] text-zinc-900" />
    );
  }

  const fillViewport =
    screen === "objects" ||
    screen === "scheme" ||
    screen === "welcome" ||
    screen === "photo" ||
    screen === "analysis";
  const wideLayout =
    screen === "objects" ||
    screen === "scheme" ||
    screen === "welcome" ||
    screen === "photo";

  return (
    <div
      className={cn(
        "relative w-full",
        screen === "welcome"
          ? "bg-black text-white"
          : "bg-[var(--bg)] text-zinc-900",
        fillViewport
          ? "flex h-[var(--app-height,100dvh)] flex-col overflow-hidden"
          : "min-h-[var(--app-height,100dvh)]",
      )}
    >
      {screen !== "welcome" && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(17,17,19,0.035),transparent_55%)]" />
      )}
      <div
        className={cn(
          "relative z-10",
          fillViewport && "flex min-h-0 flex-1 flex-col",
          !wideLayout &&
            "mx-auto w-full max-w-xl lg:max-w-3xl lg:px-8 lg:py-8",
        )}
      >
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
              quota={quota}
              onAdd={() => requireTelegramAuth("add-panel")}
              onOpenPanel={openPanel}
              onOpenRequest={(id) => {
                setActiveRequestId(id);
                go("request-details");
              }}
              onDeleteItem={deleteHomeItem}
              onRenameItem={renameHomeItem}
              onNoPanel={() => requireTelegramAuth("no-panel")}
              onPanelLimit={openPanelLimit}
              onMenuSelect={(id) => {
                if (id === "profile") go("profile");
                if (id === "about") go("about-service");
                if (id === "feedback") go("feedback");
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
              onBack={() => {
                if (retakePanelId) {
                  setRetakePanelId(null);
                  go("scheme");
                  return;
                }
                go("objects");
              }}
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
              onRetryPhoto={() => {
                go("photo");
              }}
            />
          )}
          {screen === "scheme" && (
            <SchemeScreen
              key={
                sharedPreview
                  ? `share-${sharedPreview.token}`
                  : (activePanelId ?? "scheme")
              }
              title={activePanel?.title ?? "Щиток"}
              photoDataUrl={activePanel?.photoDataUrl ?? photoDataUrl}
              askNameOnBack={askNameOnBack}
              sharedPreview={Boolean(sharedPreview)}
              onBack={() => {
                setSharedPreview(null);
                go("objects");
              }}
              onSaveShared={saveSharedPanel}
              onShare={shareActivePanel}
              onRename={renamePanel}
              onDelete={deletePanel}
              onAssignCircuit={assignCircuitLabel}
              onUpdateDeviceSticker={updateDeviceSticker}
              onUpdateDeviceCharacteristic={updateDeviceCharacteristic}
              onUpdateDeviceIdentity={updateDeviceIdentity}
              onUpdateWires={sharedPreview ? undefined : updatePanelWires}
              onAssessSafety={assessPanelSafety}
              onCallMaster={startCallMaster}
              devices={devices ?? undefined}
              wires={activePanel?.wires}
              safetyScore={safetyScore}
              phases={activePanel?.phases}
              powerKw={activePanel?.powerKw}
              hasGround={activePanel?.hasGround}
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
                setSelectedLeadService(null);
                setLeadPanelModules(null);
                setLeadBackScreen("panel-advantages");
                go("city-select");
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
                setSelectedCity(null);
                setSelectedLeadService(null);
                setLeadPanelModules(null);
                setLeadBackScreen("electrical-details");
                go("city-select");
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
                go(leadFlow === "master" ? "become-master" : leadBackScreen)
              }
              onConfirm={(city) => {
                setSelectedCity(city);
                if (leadFlow === "master") {
                  go("master-about");
                  return;
                }
                go("lead-service");
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
                setSelectedCity(null);
                setSelectedLeadService(null);
                setLeadPanelModules(null);
                setLeadBackScreen("request-type");
                go("city-select");
              }}
            />
          )}
          {screen === "lead-service" && selectedCity && (
            <LeadServiceScreen
              key={`lead-service-${selectedCity}-${leadPanelModules ?? 0}`}
              city={selectedCity}
              panelModules={leadPanelModules}
              onBack={() => go("city-select")}
              onSelect={(serviceType) => {
                setSelectedLeadService(serviceType);
                go("lead-contact");
              }}
            />
          )}
          {screen === "lead-contact" && (
            <LeadContactScreen
              key={`lead-${leadFlow}-${requestNeedId ?? "default"}-${selectedLeadService ?? "none"}`}
              variant={leadFlow}
              city={selectedCity ?? undefined}
              serviceType={selectedLeadService ?? undefined}
              panelModules={leadPanelModules ?? undefined}
              setupTitle={installSetupTitle}
              typeCode={
                selectedLeadService
                  ? resolveRequestTypeCodeForService(selectedLeadService)
                  : resolveRequestTypeCode({
                      requestNeedId,
                      noPanelSetupId,
                      callMaster: leadBackScreen === "scheme",
                    })
              }
              onBack={() =>
                go(leadFlow === "master" ? "master-about" : "lead-service")
              }
              onFinish={submitLead}
              onGoHome={() => {
                setLeadFlow("install");
                setRequestNeedId(null);
                setSelectedLeadService(null);
                setSelectedCity(null);
                setLeadPanelModules(null);
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
            <ProfileScreen
              key="profile"
              onBack={() => go("objects")}
              onLoggedOut={() => {
                setItems([]);
                setActivePanelId(null);
                setActiveRequestId(null);
                setPendingAuthAction(null);
                go("telegram-auth");
              }}
            />
          )}
          {screen === "about-service" && (
            <AboutServiceScreen
              key="about-service"
              onBack={() => go("objects")}
            />
          )}
          {screen === "feedback" && (
            <FeedbackScreen key="feedback" onBack={() => go("objects")} />
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
                setMasterAbout("");
                go("city-select");
              }}
            />
          )}
          {screen === "master-about" && (
            <MasterAboutScreen
              key="master-about"
              initialValue={masterAbout}
              onBack={() => go("city-select")}
              onConfirm={(about) => {
                setMasterAbout(about);
                go("lead-contact");
              }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {limitOpen && quota && (
            <PanelLimitSheet
              quota={quota}
              onClose={() => setLimitOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
