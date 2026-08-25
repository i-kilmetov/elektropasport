"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import { AdminDashboardScreen } from "@/components/screens/admin-dashboard-screen";
import { AboutServiceScreen } from "@/components/screens/about-service-screen";
import { AnalysisScreen } from "@/components/screens/analysis-screen";
import { ApplianceDetailScreen } from "@/components/screens/appliance-detail-screen";
import { BecomeMasterScreen } from "@/components/screens/become-master-screen";
import { MasterDashboardScreen } from "@/components/screens/master-dashboard-screen";
import { MasterSearchScreen } from "@/components/screens/master-search-screen";
import { MasterSuccessScreen } from "@/components/screens/master-success-screen";
import { MasterNotFoundScreen } from "@/components/screens/master-not-found-screen";
import { CitySelectScreen } from "@/components/screens/city-select-screen";
import { GeoAddressScreen } from "@/components/screens/geo-address-screen";
import { FeedbackScreen } from "@/components/screens/feedback-screen";
import { ResearchSurveyScreen } from "@/components/screens/research-survey-screen";
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
import { LeadAddressScreen } from "@/components/screens/lead-address-screen";
import { HouseInsightScreen } from "@/components/screens/house-insight-screen";
import { NoPanelDetailScreen } from "@/components/screens/no-panel-detail-screen";
import { NoPanelOptionsScreen } from "@/components/screens/no-panel-options-screen";
import { ObjectsScreen } from "@/components/screens/objects-screen";
import { PanelLimitSheet } from "@/components/screens/panel-limit-sheet";
import { PanelAdvantagesScreen } from "@/components/screens/panel-advantages-screen";
import { PanelGameScreen } from "@/components/screens/panel-game-screen";
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
  WaitlistSheet,
  type WaitlistKind,
} from "@/components/ui/waitlist-sheet";
import { PanelHouseAddressSheet } from "@/components/ui/panel-house-address-sheet";
import { PdConsentGate } from "@/components/ui/pd-consent-gate";
import { SchemeErrorBoundary } from "@/components/ui/scheme-error-boundary";
import { fetchPdConsentStatus } from "@/lib/pd-consent-client";
import { clearSchemeTourSeen } from "@/lib/scheme-onboarding";
import {
  ONBOARDING_SKIP_KEY,
} from "@/components/screens/welcome-screen";
import {
  canUseServerAuth,
  consumePostAuthSkipSplash,
  isTelegramMiniApp,
} from "@/lib/client-auth";
import {
  clearPendingInstallLead,
  readPendingInstallLead,
} from "@/lib/pending-lead";
import {
  clearPendingPanelShare,
  readPendingPanelShare,
  writePendingPanelShare,
} from "@/lib/pending-panel-share";
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
  payableAmountRub,
  resolveRequestTypeCodeForService,
  isMoscow,
  type LeadServiceType,
} from "@/lib/lead-services";
import {
  AuthSessionExpiredError,
  claimInviteToken,
  fetchHomeItems,
  fetchIsAdmin,
  fetchMasterProfile,
  fetchMasterRequestPanel,
  fetchPanelQuota,
  getCachedHomeItems,
  persistDeleteInstallRequest,
  persistDeletePanel,
  persistInstallRequest,
  persistInstallRequestPatch,
  persistMasterApplication,
  persistPanel,
  persistPanelAppliances,
  persistPanelPatch,
  createPanelShare,
  fetchPanelById,
  fetchSharedPanel,
  formatErrorMessage,
  mergeAppliancesUnion,
  recordInviteLinkOpen,
  syncDataEpochFromServer,
} from "@/lib/user-data";
import {
  electricalGuessForYear,
  groundingToHasGround,
  houseInsightToPanelSnapshot,
} from "@/lib/house-insight";
import { buildLocalHouseInsight, buildPanelHouseSnapshot } from "@/lib/house-insight-local";
import { assessGroundingForYear } from "@/lib/grounding-assessment";
import { clientLookupMoscowPassport } from "@/lib/moscow-client-lookup";
import { syncRatingFromCharacteristics } from "@/lib/device-spec-guide";
import { deriveRailCount } from "@/lib/panel-rails";
import { isAtPanelLimit, isInviteToken, type PanelQuota } from "@/lib/invites";
import {
  DEVICE_TYPE_OPTIONS,
} from "@/lib/manufacturer-brands";
import { resolveDeviceSeriesLabel } from "@/lib/device-catalog";
import {
  getPanelShareTokenFromLocation,
  getTelegramStartParam,
  isMasterReferralParam,
  isPanelShareToken,
  stripPanelShareFromLocation,
} from "@/lib/panel-share";
import { isResearchSurveyLaunch } from "@/lib/research-survey-access";
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
import { BrandAuthIntro, BrandSplash } from "@/components/brand-splash";
import { useHomeAppliancesEnabled } from "@/hooks/use-home-appliances-enabled";
import { isTestAppHost } from "@/lib/app-env";
import { TEST_SITE_INACTIVITY_MS } from "@/lib/test-site-auth";
import { cn } from "@/lib/utils";

function isTestAppClientHost(): boolean {
  return (
    typeof window !== "undefined" && isTestAppHost(window.location.hostname)
  );
}

function panelRailCount(
  panel: Pick<PanelObject, "railCount" | "devices"> | null | undefined,
  fallbackDevices?: Device[] | null,
): number {
  const derived = deriveRailCount(panel?.devices ?? fallbackDevices);
  if (panel?.railCount && panel.railCount > 0) {
    return Math.min(4, Math.max(panel.railCount, derived));
  }
  return derived;
}

function pickLivePanelFields(
  live: PanelObject,
  remote: PanelObject,
): Pick<
  PanelObject,
  "photoDataUrl" | "devices" | "appliances" | "appliancesUpdatedAt"
> {
  const liveAt = live.appliancesUpdatedAt
    ? Date.parse(live.appliancesUpdatedAt)
    : 0;
  const remoteAt = remote.appliancesUpdatedAt
    ? Date.parse(remote.appliancesUpdatedAt)
    : 0;
  if (liveAt > remoteAt) {
    return {
      photoDataUrl: remote.photoDataUrl || live.photoDataUrl,
      devices:
        (remote.devices?.length ?? 0) > 0 ? remote.devices : live.devices,
      appliances: live.appliances,
      appliancesUpdatedAt: live.appliancesUpdatedAt,
    };
  }
  if (remoteAt > liveAt) {
    return {
      photoDataUrl: remote.photoDataUrl || live.photoDataUrl,
      devices:
        (remote.devices?.length ?? 0) > 0 ? remote.devices : live.devices,
      appliances: remote.appliances,
      appliancesUpdatedAt: remote.appliancesUpdatedAt,
    };
  }
  return {
    photoDataUrl: remote.photoDataUrl || live.photoDataUrl,
    devices: (remote.devices?.length ?? 0) > 0 ? remote.devices : live.devices,
    appliances: mergeAppliancesUnion(remote.appliances, live.appliances),
    appliancesUpdatedAt:
      remote.appliancesUpdatedAt ?? live.appliancesUpdatedAt,
  };
}

const SPLASH_SEEN_KEY = "ep:splash-seen";
const SPLASH_SEEN_PERSIST_KEY = "ep:splash-seen-persist";

type SplashPhase = "pending" | "show" | "done";

function readSplashSeen(): boolean {
  if (isTestAppClientHost()) return true;
  try {
    if (localStorage.getItem(SPLASH_SEEN_PERSIST_KEY) === "1") return true;
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    localStorage.setItem(SPLASH_SEEN_PERSIST_KEY, "1");
  } catch {
    // private mode
  }
}

export function AppShell({ forceResearchSurvey = false }: { forceResearchSurvey?: boolean } = {}) {
  const homeAppliancesEnabled = useHomeAppliancesEnabled();
  const surveyLaunch = forceResearchSurvey || isResearchSurveyLaunch();
  const [screen, setScreen] = useState<AppScreen>(() =>
    forceResearchSurvey ? "research-survey" : "telegram-auth",
  );
  const [onboardingReady, setOnboardingReady] = useState(forceResearchSurvey);
  const [splashPhase, setSplashPhase] = useState<SplashPhase>(
    forceResearchSurvey ? "done" : "pending",
  );
  const [showAuthIntro, setShowAuthIntro] = useState(
    () => !forceResearchSurvey && !isTestAppClientHost(),
  );
  const [items, setItems] = useState<HomeListItem[]>(() => getCachedHomeItems());
  const [itemsLoading, setItemsLoading] = useState(
    () => getCachedHomeItems().length === 0,
  );
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [quota, setQuota] = useState<PanelQuota | null>(null);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [waitlistKind, setWaitlistKind] = useState<WaitlistKind | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [activeApplianceId, setActiveApplianceId] = useState<string | null>(
    null,
  );
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [objectsTab, setObjectsTab] = useState<0 | 1>(0);
  const [askNameOnBack, setAskNameOnBack] = useState(false);
  const [schemeTourPending, setSchemeTourPending] = useState(false);
  const [panelHousePromptOpen, setPanelHousePromptOpen] = useState(false);
  const [panelHouseSaving, setPanelHouseSaving] = useState(false);
  const [panelHouseSaved, setPanelHouseSaved] = useState(false);
  const [panelHouseSaveError, setPanelHouseSaveError] = useState<string | null>(
    null,
  );
  const [pdConsentReady, setPdConsentReady] = useState(false);
  const [pdConsentChecked, setPdConsentChecked] = useState(false);
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
    "add-panel" | "no-panel" | "call-master" | "help-electrical" | null
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
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedAddressFiasId, setSelectedAddressFiasId] = useState<
    string | null
  >(null);
  const [helpElectricalFlow, setHelpElectricalFlow] = useState(false);
  const [selectedLeadService, setSelectedLeadService] =
    useState<LeadServiceType | null>(null);
  const [leadPanelModules, setLeadPanelModules] = useState<number | null>(null);
  const [masterAbout, setMasterAbout] = useState("");
  const [leadFlow, setLeadFlow] = useState<LeadFlow>("install");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [masterMode, setMasterMode] = useState(false);
  const [searchRequestId, setSearchRequestId] = useState<string | null>(null);
  const [masterViewRequest, setMasterViewRequest] =
    useState<InstallRequest | null>(null);
  const [foundMaster, setFoundMaster] = useState<{
    firstName: string;
    phone: string;
    username: string;
  } | null>(null);
  const submittedLeadIds = useRef(new Set<string>());
  const consumedShareRef = useRef(false);

  const go = useCallback((next: AppScreen) => {
    hapticNav();
    setScreen(next);
  }, []);

  /** After Telegram OAuth return — home with skeletons, not boot splash. */
  useLayoutEffect(() => {
    if (isTestAppClientHost() || !consumePostAuthSkipSplash()) return;
    markSplashSeen();
    setSplashPhase("done");
    setShowAuthIntro(false);
    setOnboardingReady(true);
    if (surveyLaunch) {
      setScreen("research-survey");
    } else if (canUseServerAuth() && !readPendingPanelShare()) {
      setScreen("objects");
    }
  }, []);

  useLayoutEffect(() => {
    if (surveyLaunch) {
      markSplashSeen();
      setSplashPhase("done");
      setShowAuthIntro(false);
      return;
    }
    if (isTestAppClientHost()) {
      setSplashPhase("done");
      return;
    }
    if (canUseServerAuth()) {
      markSplashSeen();
      setSplashPhase("done");
      return;
    }
    if (readSplashSeen()) {
      setSplashPhase("done");
      return;
    }
    setSplashPhase("show");
  }, []);

  useLayoutEffect(() => {
    const token = getPanelShareTokenFromLocation();
    if (!token) return;
    writePendingPanelShare(token);
    stripPanelShareFromLocation();
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
    const intent =
      typeof window !== "undefined"
        ? (() => {
            try {
              return (
                sessionStorage.getItem("ep_intent") ||
                new URLSearchParams(window.location.search).get("intent")
              );
            } catch {
              return null;
            }
          })()
        : null;

    if (surveyLaunch) {
      setShowAuthIntro(false);
      markSplashSeen();
      setSplashPhase("done");
      setScreen("research-survey");
      setOnboardingReady(true);
      return;
    }

    if (canUseServerAuth()) {
      try {
        sessionStorage.removeItem("ep_intent");
      } catch {
        // ignore
      }
      if (
        !readPendingPanelShare() &&
        (intent === "become-master" || isMasterReferralParam(startParam))
      ) {
        setScreen("become-master");
      } else if (!readPendingPanelShare()) {
        setScreen("objects");
      }
    } else if (isMasterReferralParam(startParam) || intent === "become-master") {
      try {
        sessionStorage.setItem("ep_intent", "become-master");
      } catch {
        // ignore
      }
      if (isTestAppClientHost()) {
        setScreen("telegram-auth");
      } else {
        setScreen("telegram-auth");
        setShowAuthIntro(true);
      }
    } else if (isTestAppClientHost()) {
      setScreen("telegram-auth");
    } else {
      setScreen("telegram-auth");
      setShowAuthIntro(true);
    }
    setOnboardingReady(true);
  }, []);

  /** App UI (home, scheme, …) only after Telegram auth. */
  useEffect(() => {
    if (!onboardingReady) return;
    if (canUseServerAuth() || isTelegramMiniApp()) return;
    const allowed: AppScreen[] = isTestAppClientHost()
      ? ["telegram-auth", "research-survey"]
      : ["telegram-auth", "research-survey"];
    if (!allowed.includes(screen)) {
      setScreen("telegram-auth");
    }
  }, [onboardingReady, screen]);

  /** Clear test-site cookie after idle timeout on the staging host. */
  useEffect(() => {
    if (!isTestAppClientHost()) return;

    let lastActivity = Date.now();
    const touchActivity = () => {
      lastActivity = Date.now();
    };
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ] as const;

    for (const event of activityEvents) {
      window.addEventListener(event, touchActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity < TEST_SITE_INACTIVITY_MS) return;
      void fetch("/api/test-access", { method: "DELETE" }).finally(() => {
        window.location.assign("/test-login");
      });
    }, 30_000);

    return () => {
      for (const event of activityEvents) {
        window.removeEventListener(event, touchActivity);
      }
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkPdConsent = () => {
      if (!canUseServerAuth()) {
        setPdConsentChecked(true);
        setPdConsentReady(true);
        return;
      }
      void fetchPdConsentStatus().then((accepted) => {
        if (cancelled) return;
        setPdConsentReady(accepted);
        setPdConsentChecked(true);
      });
    };

    checkPdConsent();
    const retryTimer = window.setTimeout(checkPdConsent, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const epochWiped = await syncDataEpochFromServer().catch(() => false);
      const cached = epochWiped ? [] : getCachedHomeItems();
      if (cached.length > 0) {
        setItems(cached);
        setItemsLoading(false);
      } else {
        setItemsLoading(true);
      }
      setItemsError(null);

      try {
        const invite = getTelegramStartParam();
        if (isInviteToken(invite)) {
          void recordInviteLinkOpen(invite);
        }

        const authed = canUseServerAuth();
        if (!authed) {
          if (!cancelled) {
            setItems([]);
            setItemsLoading(false);
          }
          return;
        }

        const claimPromise = isInviteToken(invite)
          ? claimInviteToken(invite).catch((error) => {
              console.error(error);
              return null;
            })
          : Promise.resolve(null);

        const [loaded, masterProfile, admin, nextQuota, claimed] =
          await Promise.all([
            fetchHomeItems(),
            fetchMasterProfile().catch(() => null),
            fetchIsAdmin().catch(() => false),
            fetchPanelQuota().catch(() => null),
            claimPromise,
            syncUserProfileFromServer().catch((error) => {
              console.error(error);
            }),
          ]);

        if (cancelled) return;

        setItems(loaded);
        if (masterProfile?.isMaster) setIsMaster(true);
        setIsAdmin(Boolean(admin));
        if (claimed) setQuota(claimed);
        else if (nextQuota) setQuota(nextQuota);
      } catch (error) {
        if (!cancelled) {
          if (error instanceof AuthSessionExpiredError) {
            setItems([]);
            setItemsError(null);
            setShowAuthIntro(true);
            setSplashPhase("done");
            markSplashSeen();
            return;
          }
          const msg =
            error instanceof Error
              ? error.message
              : "Не удалось загрузить данные";
          setItemsError(msg);
          const fallback = epochWiped ? [] : getCachedHomeItems();
          if (fallback.length > 0) {
            setItems(fallback);
          }
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
      | "help-electrical"
      | null;
    if (!pending || !canUseServerAuth()) return;

    sessionStorage.removeItem("ep_pending_auth_action");
    if (pending === "add-panel") {
      setPhotoDataUrl(null);
      setScreen("photo");
    } else if (pending === "no-panel") {
      setScreen("no-panel-options");
    } else if (pending === "call-master" || pending === "help-electrical") {
      setLeadFlow("install");
      setElectricalDetails(null);
      setRequestNeedId(null);
      setNoPanelSetupId(null);
      setSelectedCity(null);
      setSelectedAddress(null);
      setSelectedAddressFiasId(null);
      setHelpElectricalFlow(true);
      setSelectedLeadService(null);
      setLeadBackScreen(pending === "help-electrical" ? "objects" : "scheme");
      if (pending === "help-electrical") setLeadPanelModules(null);
      setScreen("geo-address");
    }
  }, []);

  const isFirstLeadOrder = useMemo(
    () => !items.some((item) => item.kind === "install_request"),
    [items],
  );

  const localPanelCount = useMemo(
    () => items.filter((item) => item.kind === "panel").length,
    [items],
  );

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
      masterViewRequest?.id === activeRequestId
        ? masterViewRequest
        : items.find(
            (item): item is InstallRequest =>
              item.kind === "install_request" && item.id === activeRequestId,
          ) ?? null,
    [items, activeRequestId, masterViewRequest],
  );

  const installSetupTitle = useMemo(() => {
    if (selectedLeadService) {
      const estimatedPriceRub = payableAmountRub({
        serviceType: selectedLeadService,
        panelModules: leadPanelModules,
        isFirstOrder: isFirstLeadOrder,
      });
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
    isFirstLeadOrder,
    requestNeedId,
    noPanelSetupId,
  ]);

  const handlePhoto = useCallback((dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    go("analysis");
  }, [go]);

  const requireTelegramAuth = useCallback((action: "add-panel" | "no-panel") => {
    if (action === "add-panel" && isAtPanelLimit(quota, localPanelCount)) {
      openPanelLimit();
      return;
    }
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
  }, [go, localPanelCount, openPanelLimit, quota]);

  const startHelpElectrical = useCallback(() => {
    setLeadFlow("install");
    setElectricalDetails(null);
    setSelectedCity(null);
    setSelectedAddress(null);
    setSelectedAddressFiasId(null);
    setHelpElectricalFlow(true);
    setSelectedLeadService(null);
    setRequestNeedId(null);
    setNoPanelSetupId(null);
    setLeadPanelModules(null);
    setLeadBackScreen("objects");
    if (canUseServerAuth()) {
      go("geo-address");
      return;
    }
    setPendingAuthAction("help-electrical");
    go("telegram-auth");
  }, [go]);

  const startCallMaster = useCallback(() => {
    setLeadFlow("install");
    setElectricalDetails(null);
    setSelectedCity(null);
    setSelectedAddress(null);
    setSelectedAddressFiasId(null);
    // Same house-insight path as «Помочь с электрикой» (scheme CTA uses this).
    setHelpElectricalFlow(true);
    setSelectedLeadService(null);
    setRequestNeedId(null);
    setNoPanelSetupId(null);
    setLeadBackScreen("scheme");
    const panelDevices = activePanel?.devices ?? devices;
    const modules = countPanelModules(panelDevices);
    setLeadPanelModules(modules > 0 ? modules : null);
    if (canUseServerAuth()) {
      go("geo-address");
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
        clearSchemeTourSeen(panelId);
        setSchemeTourPending(true);
        setScreen("scheme");
        return;
      }

      if (isAtPanelLimit(quota, localPanelCount)) {
        setScreen("objects");
        openPanelLimit();
        return;
      }
      const today = new Date();
      const lastCheck = today.toLocaleDateString("ru-RU");
      const createdAt = today.toISOString();
      const panelCount = items.filter((i) => i.kind === "panel").length;
      const id = `panel-${Date.now()}`;
      const panel: PanelObject = {
        kind: "panel",
        id,
        type: "apartment",
        title: `Щиток ${panelCount + 1}`,
        address: "Добавлен по фото",
        lastCheck,
        createdAt,
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
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить щиток",
        );
        if (error instanceof Error && error.name === "PanelLimitError") {
          setItems((prev) => prev.filter((item) => item.id !== id));
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
      clearSchemeTourSeen(id);
      setSchemeTourPending(true);
      setScreen("scheme");
      void refreshQuota();
    },
    [items, localPanelCount, openPanelLimit, photoDataUrl, quota, refreshQuota, retakePanelId],
  );

  const handleSchemeOnboardingDone = useCallback(() => {
    setSchemeTourPending(false);
    if (!activePanelId || sharedPreview) return;
    const panel = items.find(
      (item): item is PanelObject =>
        item.kind === "panel" && item.id === activePanelId,
    );
    if (!panel?.houseSnapshot) {
      setPanelHousePromptOpen(true);
    }
  }, [activePanelId, items, sharedPreview]);

  const savePanelHouseInsight = useCallback(
    async (payload: {
      city: string;
      address: string;
      fiasId?: string;
      street?: string;
      house?: string;
      block?: string;
    }) => {
      if (!activePanelId) return;
      setPanelHouseSaving(true);
      setPanelHouseSaveError(null);
      setPanelHouseSaved(false);

      const snapshot = buildPanelHouseSnapshot(payload);
      const groundPrefill = groundingToHasGround(snapshot.groundingExpectation);
      const panel = items.find(
        (item): item is PanelObject =>
          item.kind === "panel" && item.id === activePanelId,
      );
      const patch: Partial<
        Pick<PanelObject, "houseSnapshot" | "address" | "hasGround">
      > = {
        houseSnapshot: snapshot,
        address: snapshot.address,
      };
      if (groundPrefill !== undefined && panel?.hasGround === undefined) {
        patch.hasGround = groundPrefill;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.kind === "panel" && item.id === activePanelId
            ? { ...item, ...patch }
            : item,
        ),
      );

      setPanelHouseSaved(true);
      setPanelHouseSaving(false);
      window.setTimeout(() => {
        setPanelHousePromptOpen(false);
        setPanelHouseSaved(false);
      }, 1600);

      void persistPanelPatch(activePanelId, patch).catch((error) => {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось сохранить адрес на сервере";
        setPanelHouseSaveError(message);
        setItemsError(message);
      });

      if (isMoscow(payload.city)) {
        void clientLookupMoscowPassport(payload.address, {
          street: payload.street ?? null,
          house: payload.house ?? null,
          block: payload.block ?? null,
        })
          .then(async (passport) => {
            if (!passport?.buildingYear || !activePanelId) return;
            const panelNow = items.find(
              (item): item is PanelObject =>
                item.kind === "panel" && item.id === activePanelId,
            );
            const savedAddress = passport.address || payload.address.trim();
            const insight = buildLocalHouseInsight({
              city: payload.city,
              address: savedAddress,
              fiasId: payload.fiasId,
            });
            insight.buildingYear = passport.buildingYear;
            insight.moscowOpenDataUsed = true;
            insight.electrical = electricalGuessForYear(passport.buildingYear);
            insight.grounding = assessGroundingForYear(passport.buildingYear);
            const enriched = houseInsightToPanelSnapshot(insight);
            const enrichedGround = groundingToHasGround(
              enriched.groundingExpectation,
            );
            const enrichPatch: Partial<
              Pick<PanelObject, "houseSnapshot" | "address" | "hasGround">
            > = {
              houseSnapshot: { ...enriched, address: savedAddress },
              address: savedAddress,
            };
            if (
              enrichedGround !== undefined &&
              panelNow?.hasGround === undefined
            ) {
              enrichPatch.hasGround = enrichedGround;
            }
            setItems((prev) =>
              prev.map((item) =>
                item.kind === "panel" && item.id === activePanelId
                  ? { ...item, ...enrichPatch }
                  : item,
              ),
            );
            try {
              await persistPanelPatch(activePanelId, enrichPatch);
            } catch (error) {
              console.error(error);
            }
          })
          .catch((error) => console.error(error));
      }
    },
    [activePanelId, items],
  );

  const openPanel = useCallback((id: string) => {
    try {
      const panel =
        items.find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.id === id,
        ) ??
        getCachedHomeItems().find(
          (item): item is PanelObject =>
            item.kind === "panel" && item.id === id,
        );
      if (!panel) {
        setItemsError("Не удалось открыть щиток — данные не найдены");
        return;
      }
      const nextDevices = Array.isArray(panel.devices) ? panel.devices : [];
      setItemsError(null);
      setSharedPreview(null);
      setSchemeTourPending(false);
      setActivePanelId(panel.id);
      setAskNameOnBack(false);
      setPhotoDataUrl(
        typeof panel.photoDataUrl === "string" ? panel.photoDataUrl : null,
      );
      setDevices(nextDevices);
      setSafetyScore(
        panel.phases &&
          panel.powerKw?.trim() &&
          typeof panel.safety === "number"
          ? panel.safety
          : null,
      );
      setLinesCount(panel.linesCount ?? null);
      setRailCount(panelRailCount({ ...panel, devices: nextDevices }));
      setScreen("scheme");

      // Hydrate scheme/appliances from server so another device/session stays in sync.
      if (canUseServerAuth()) {
        void fetchPanelById(panel.id)
          .then((remote) => {
            if (!remote) return;
            setItems((prev) => {
              const live = prev.find(
                (item): item is PanelObject =>
                  item.kind === "panel" && item.id === remote.id,
              );
              const merged = live
                ? {
                    ...remote,
                    ...pickLivePanelFields(live, remote),
                  }
                : remote;
              const exists = prev.some((item) => item.id === remote.id);
              if (!exists) return [merged, ...prev];
              return prev.map((item) =>
                item.kind === "panel" && item.id === remote.id ? merged : item,
              );
            });
            const remoteDevices = Array.isArray(remote.devices)
              ? remote.devices
              : [];
            setDevices((prev) =>
              remoteDevices.length > 0 ? remoteDevices : prev,
            );
            setLinesCount(remote.linesCount ?? null);
            setRailCount(
              panelRailCount({
                ...remote,
                devices:
                  remoteDevices.length > 0 ? remoteDevices : nextDevices,
              }),
            );
            setSafetyScore(
              remote.phases &&
                remote.powerKw?.trim() &&
                typeof remote.safety === "number"
                ? remote.safety
                : null,
            );
            if (typeof remote.photoDataUrl === "string") {
              setPhotoDataUrl(remote.photoDataUrl);
            }
          })
          .catch((error) => {
            console.error("fetchPanelById failed", id, error);
          });
      }
    } catch (error) {
      console.error("openPanel failed", id, error);
      setItemsError(
        error instanceof Error
          ? `Не удалось открыть щиток: ${error.message}`
          : "Не удалось открыть щиток",
      );
    }
  }, [items]);

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

  const openMasterLinkedPanel = useCallback(
    async (requestId: string) => {
      try {
        const panel = await fetchMasterRequestPanel(requestId);
        setSharedPreview({ panel, token: "" });
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
        go("scheme");
      } catch (error) {
        setItemsError(
          error instanceof Error
            ? error.message
            : "Не удалось открыть щиток клиента",
        );
      }
    },
    [go],
  );

  const saveSharedPanel = useCallback(() => {
    if (!sharedPreview) {
      go("objects");
      return;
    }
    if (isAtPanelLimit(quota, localPanelCount)) {
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
      setItemsError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить щиток",
      );
      if (error instanceof Error && error.name === "PanelLimitError") {
        setItems((prev) => prev.filter((item) => item.id !== id));
        openPanelLimit();
      }
    });
    setSharedPreview(null);
    hapticNotification("success");
    go("objects");
    void refreshQuota();
  }, [go, localPanelCount, openPanelLimit, quota, refreshQuota, sharedPreview]);

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

  const assignCircuitLabels = useCallback(
    (updates: Array<{ deviceId: number; label: string }>) => {
      if (!activePanelId || updates.length === 0) return;
      const byId = new Map(
        updates.map((item) => [Number(item.deviceId), item.label]),
      );
      const patchDevice = (device: Device): Device => {
        const label = byId.get(Number(device.id));
        return label != null ? { ...device, circuitLabel: label } : device;
      };
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

  const assignCircuitLabel = useCallback(
    (deviceId: number, label: string) => {
      assignCircuitLabels([{ deviceId, label }]);
    },
    [assignCircuitLabels],
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
        series?: string;
      },
    ) => {
      if (!activePanelId) return;

      const patchDevice = (device: Device): Device => {
        if (device.id !== deviceId) return device;
        const typeLabel = patch.type
          ? (DEVICE_TYPE_OPTIONS.find((item) => item.type === patch.type)
              ?.label ?? device.name)
          : undefined;
        const nextType = patch.type ?? device.type;
        const nextManufacturer = patch.manufacturer ?? device.manufacturer;
        const nextBrandKey = patch.brandKey ?? device.brandKey;
        const characteristics = {
          ...(device.characteristics ?? {}),
          ...(patch.manufacturer
            ? { Производитель: patch.manufacturer }
            : {}),
          ...(typeLabel ? { Тип: typeLabel } : {}),
        };
        const series =
          patch.series?.trim() ||
          device.series ||
          resolveDeviceSeriesLabel({
            series: undefined,
            brandKey: nextBrandKey,
            manufacturer: nextManufacturer,
            type: nextType,
          });
        return {
          ...device,
          ...patch,
          name: typeLabel ?? device.name,
          characteristics,
          series: series || undefined,
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
      safety: number | null;
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
        exactAddress: payload.exactAddress?.trim() || selectedAddress || undefined,
        setupTitle,
        paymentStatus: payload.paymentStatus,
        paidAmountRub: payload.paidAmountRub,
        tbankPaymentId: payload.tbankPaymentId,
        panelId:
          payload.panelId ??
          (leadBackScreen === "scheme" ? activePanelId ?? undefined : undefined),
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

      // Dispatch to masters and show search screen
      setSearchRequestId(id);
      setFoundMaster(null);
      setScreen("master-search");
    },
    [
      activePanelId,
      electricalDetails,
      leadBackScreen,
      leadFlow,
      masterAbout,
      noPanelSetupId,
      requestNeedId,
      selectedCity,
      selectedAddress,
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

    const token = readPendingPanelShare();
    if (!token || !isPanelShareToken(token)) return;
    if (!canUseServerAuth()) return;

    consumedShareRef.current = true;
    clearPendingPanelShare();
    setShowAuthIntro(false);
    markSplashSeen();
    setSplashPhase("done");
    void openSharedPanel(token);
  }, [itemsLoading, onboardingReady, openSharedPanel]);

  if (
    showAuthIntro &&
    !isTestAppClientHost() &&
    !canUseServerAuth() &&
    !isTelegramMiniApp() &&
    !surveyLaunch
  ) {
    return (
      <BrandAuthIntro
        bootReady={onboardingReady && !itemsLoading}
        onLogin={() => {
          try {
            localStorage.setItem(ONBOARDING_SKIP_KEY, "1");
          } catch {
            // private mode
          }
        }}
      />
    );
  }

  if (splashPhase === "pending") {
    return (
      <div className="relative h-[var(--app-height,100dvh)] w-full overflow-hidden bg-[var(--bg)]" />
    );
  }

  if (splashPhase === "show") {
    return (
      <BrandSplash
        bootReady={onboardingReady && !itemsLoading}
        onComplete={() => {
          markSplashSeen();
          setSplashPhase("done");
        }}
      />
    );
  }

  if (!onboardingReady) {
    return (
      <div className="relative h-[var(--app-height,100dvh)] w-full overflow-hidden bg-[var(--bg)]" />
    );
  }

  const fillViewport =
    screen === "objects" ||
    screen === "scheme" ||
    screen === "photo" ||
    screen === "analysis" ||
    screen === "master-search" ||
    screen === "master-success" ||
    screen === "master-not-found" ||
    screen === "admin" ||
    screen === "research-survey" ||
    screen === "panel-game";
  const wideLayout =
    screen === "objects" ||
    screen === "scheme" ||
    screen === "photo" ||
    screen === "admin";

  return (
    <div
      className={cn(
        "relative w-full bg-[var(--bg)] text-zinc-900",
        fillViewport
          ? "flex h-[var(--app-height,100dvh)] flex-col overflow-hidden"
          : "min-h-[var(--app-height,100dvh)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(17,17,19,0.035),transparent_55%)]" />
      <div
        className={cn(
          "relative z-10",
          fillViewport && "flex min-h-0 flex-1 flex-col",
          !wideLayout &&
            "mx-auto w-full max-w-xl lg:max-w-3xl lg:px-8 lg:py-8",
        )}
      >
        <AnimatePresence mode="wait">
          {screen === "objects" && masterMode && (
            <MasterDashboardScreen
              key="master-dashboard"
              onSwitchToUser={() => setMasterMode(false)}
              onOpenRequest={(request) => {
                setMasterViewRequest(request);
                setActiveRequestId(request.id);
                go("request-details");
              }}
              onOpenPanel={(request) => {
                setMasterViewRequest(request);
                setActiveRequestId(request.id);
                void openMasterLinkedPanel(request.id);
              }}
            />
          )}
          {screen === "objects" && !masterMode && (
            <ObjectsScreen
              key="objects"
              items={items}
              loading={itemsLoading}
              error={itemsError}
              quota={quota}
              menuOpen={mainMenuOpen}
              onMenuOpenChange={setMainMenuOpen}
              initialPage={objectsTab}
              onPageChange={setObjectsTab}
              onAdd={() => requireTelegramAuth("add-panel")}
              onOpenPanel={openPanel}
              onOpenRequest={(id) => {
                setMasterViewRequest(null);
                setObjectsTab(1);
                setActiveRequestId(id);
                go("request-details");
              }}
              onDeleteItem={deleteHomeItem}
              onRenameItem={renameHomeItem}
              onNoPanel={() => requireTelegramAuth("no-panel")}
              onHelpElectrical={startHelpElectrical}
              onBecomeMaster={() => go("become-master")}
              onPanelLimit={openPanelLimit}
              homeAppliancesMode={homeAppliancesEnabled}
              onAddAppliance={
                homeAppliancesEnabled
                  ? (panelId, appliance) => {
                      const panel = items.find(
                        (item): item is PanelObject =>
                          item.kind === "panel" && item.id === panelId,
                      );
                      const previousAppliances = panel?.appliances ?? [];
                      const nextAppliances = [...previousAppliances, appliance];
                      setItems((prev) =>
                        prev.map((item) =>
                          item.kind === "panel" && item.id === panelId
                            ? {
                                ...item,
                                appliances: nextAppliances,
                                appliancesUpdatedAt: new Date().toISOString(),
                                lastCheck: "сегодня",
                              }
                            : item,
                        ),
                      );
                      void persistPanelAppliances(panelId, nextAppliances)
                        .then((saved) => {
                          if (!saved) return;
                          setItems((current) =>
                            current.map((item) => {
                              if (item.kind !== "panel" || item.id !== saved.id) {
                                return item;
                              }
                              const savedList = saved.appliances ?? [];
                              const keepList =
                                savedList.length >= nextAppliances.length
                                  ? savedList
                                  : nextAppliances;
                              return {
                                ...item,
                                ...saved,
                                photoDataUrl:
                                  saved.photoDataUrl || item.photoDataUrl,
                                appliances: keepList,
                                appliancesUpdatedAt:
                                  saved.appliancesUpdatedAt ??
                                  item.appliancesUpdatedAt,
                              };
                            }),
                          );
                          setItemsError(null);
                        })
                        .catch((error) => {
                          console.error(error);
                          setItems((current) =>
                            current.map((item) =>
                              item.kind === "panel" && item.id === panelId
                                ? { ...item, appliances: previousAppliances }
                                : item,
                            ),
                          );
                          setItemsError(
                            formatErrorMessage(
                              error,
                              "Не удалось сохранить технику",
                            ),
                          );
                        });
                    }
                  : undefined
              }
              onOpenAppliance={
                homeAppliancesEnabled
                  ? (panelId, applianceId) => {
                      setActivePanelId(panelId);
                      setActiveApplianceId(applianceId);
                      go("appliance-detail");
                    }
                  : undefined
              }
              isMaster={isMaster}
              isAdmin={isAdmin}
              masterMode={false}
              onMasterModeChange={(next) => {
                setMasterMode(next);
                setMainMenuOpen(false);
              }}
              onMasterMode={() => {
                setMasterMode(true);
                setMainMenuOpen(false);
              }}
              onMenuSelect={(id) => {
                setMainMenuOpen(false);
                if (id === "profile") go("profile");
                if (id === "game") go("panel-game");
                if (id === "school") {
                  setMainMenuOpen(false);
                  setWaitlistKind("school");
                  return;
                }
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
              minimal={isTestAppClientHost()}
              onBack={
                isTestAppClientHost()
                  ? undefined
                  : () => {
                      setPendingAuthAction(null);
                      sessionStorage.removeItem("ep_pending_auth_action");
                      setShowAuthIntro(true);
                    }
              }
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
              onNoPanel={
                homeAppliancesEnabled
                  ? () => requireTelegramAuth("no-panel")
                  : undefined
              }
            />
          )}
          {homeAppliancesEnabled &&
            screen === "appliance-detail" &&
            (() => {
              const panel = items.find(
                (item): item is PanelObject =>
                  item.kind === "panel" && item.id === activePanelId,
              );
              const appliance = panel?.appliances?.find(
                (a) => a.id === activeApplianceId,
              );
              if (!appliance) return null;
              return (
                <ApplianceDetailScreen
                  key={`appliance-${appliance.id}`}
                  homeTitle={panel?.title}
                  panel={panel!}
                  appliance={appliance}
                  onBack={() => {
                    setActiveApplianceId(null);
                    go("objects");
                  }}
                  onReplace={(next) => {
                    const panelId = panel!.id;
                    const previousAppliances = panel!.appliances ?? [];
                    const nextAppliances = previousAppliances.map((item) =>
                      item.id === next.id ? next : item,
                    );
                    setItems((prev) =>
                      prev.map((item) =>
                        item.kind === "panel" && item.id === panelId
                          ? {
                              ...item,
                              appliances: nextAppliances,
                              appliancesUpdatedAt: new Date().toISOString(),
                              lastCheck: "сегодня",
                            }
                          : item,
                      ),
                    );
                    void persistPanelAppliances(panelId, nextAppliances)
                      .then((saved) => {
                        if (!saved) return;
                        setItems((current) =>
                          current.map((item) =>
                            item.kind === "panel" && item.id === saved.id
                              ? {
                                  ...item,
                                  ...saved,
                                  photoDataUrl:
                                    saved.photoDataUrl || item.photoDataUrl,
                                  appliances:
                                    saved.appliances ?? nextAppliances,
                                }
                              : item,
                          ),
                        );
                      })
                      .catch((error) => {
                        console.error(error);
                        setItems((current) =>
                          current.map((item) =>
                            item.kind === "panel" && item.id === panelId
                              ? { ...item, appliances: previousAppliances }
                              : item,
                          ),
                        );
                        setItemsError(
                          formatErrorMessage(
                            error,
                            "Не удалось сохранить технику",
                          ),
                        );
                      });
                  }}
                  onDelete={() => {
                    const panelId = panel!.id;
                    const applianceId = appliance.id;
                    const previousAppliances = panel!.appliances ?? [];
                    const nextAppliances = previousAppliances.filter(
                      (item) => item.id !== applianceId,
                    );
                    setItems((prev) =>
                      prev.map((item) =>
                        item.kind === "panel" && item.id === panelId
                          ? {
                              ...item,
                              appliances: nextAppliances,
                              appliancesUpdatedAt: new Date().toISOString(),
                              lastCheck: "сегодня",
                            }
                          : item,
                      ),
                    );
                    setActiveApplianceId(null);
                    go("objects");
                    void persistPanelAppliances(panelId, nextAppliances)
                      .then((saved) => {
                        if (!saved) return;
                        setItems((current) =>
                          current.map((item) =>
                            item.kind === "panel" && item.id === saved.id
                              ? {
                                  ...item,
                                  ...saved,
                                  photoDataUrl:
                                    saved.photoDataUrl || item.photoDataUrl,
                                  appliances:
                                    saved.appliances ?? nextAppliances,
                                }
                              : item,
                          ),
                        );
                      })
                      .catch((error) => {
                        console.error(error);
                        setItems((current) =>
                          current.map((item) =>
                            item.kind === "panel" && item.id === panelId
                              ? { ...item, appliances: previousAppliances }
                              : item,
                          ),
                        );
                        setItemsError(
                          formatErrorMessage(
                            error,
                            "Не удалось удалить технику",
                          ),
                        );
                      });
                  }}
                />
              );
            })()}
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
            <SchemeErrorBoundary
              key={`scheme-boundary-${activePanelId ?? sharedPreview?.token ?? "x"}`}
              panelTitle={activePanel?.title}
              onBack={() => {
                setSharedPreview(null);
                go(masterViewRequest ? "request-details" : "objects");
              }}
            >
              <SchemeScreen
                key={
                  sharedPreview
                    ? `share-${sharedPreview.token}`
                    : (activePanelId ?? "scheme")
                }
                title={activePanel?.title ?? "Щиток"}
                panelId={activePanelId}
                photoDataUrl={activePanel?.photoDataUrl ?? photoDataUrl}
                askNameOnBack={askNameOnBack}
                sharedPreview={Boolean(sharedPreview)}
                onBack={() => {
                  setSharedPreview(null);
                  go(masterViewRequest ? "request-details" : "objects");
                }}
                onSaveShared={
                  sharedPreview && !sharedPreview.token
                    ? undefined
                    : saveSharedPanel
                }
                onShare={shareActivePanel}
                onRename={renamePanel}
                onDelete={deletePanel}
                onAssignCircuit={assignCircuitLabel}
                onAssignCircuits={assignCircuitLabels}
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
                houseSnapshot={activePanel?.houseSnapshot}
                onEditHouse={
                  sharedPreview
                    ? undefined
                    : () => setPanelHousePromptOpen(true)
                }
                railCount={railCount ?? undefined}
                canUseTerminals={
                  Boolean(masterViewRequest) ||
                  ((isMaster || isAdmin) && masterMode)
                }
                startOnboarding={schemeTourPending && !sharedPreview}
                onOnboardingDone={handleSchemeOnboardingDone}
              />
            </SchemeErrorBoundary>
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
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
                setHelpElectricalFlow(false);
                setSelectedLeadService(null);
                setLeadPanelModules(null);
                setLeadBackScreen("panel-advantages");
                go("geo-address");
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
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
                setHelpElectricalFlow(false);
                setSelectedLeadService(null);
                setLeadPanelModules(null);
                setLeadBackScreen("electrical-details");
                go("geo-address");
              }}
            />
          )}
          {screen === "geo-address" && (
            <GeoAddressScreen
              key={`geo-${leadFlow}-${helpElectricalFlow ? "help" : "std"}`}
              onBack={() => go(leadBackScreen)}
              onManual={() => {
                setSelectedCity(null);
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
                go("city-select");
              }}
              onConfirm={({ city, address, fiasId, houseFiasId }) => {
                setSelectedCity(city);
                setSelectedAddress(address);
                setSelectedAddressFiasId(houseFiasId ?? fiasId ?? null);
                go("house-insight");
              }}
            />
          )}
          {screen === "city-select" && (
            <CitySelectScreen
              key={`city-${leadFlow}-${helpElectricalFlow ? "help" : "std"}`}
              title={
                leadFlow === "master"
                  ? "В каком городе работаете?"
                  : "В каком городе находитесь?"
              }
              description={
                leadFlow === "master"
                  ? "Укажите город — так мы поймём, где вы можете брать заявки."
                  : helpElectricalFlow
                    ? "Сначала город, затем точный адрес — подскажем год дома, типичную электрику и контакты УК."
                    : "Укажите город, мы подскажем, как сможем вам помочь."
              }
              moscowHint={
                leadFlow === "master"
                  ? undefined
                  : helpElectricalFlow
                    ? "Укажите точный адрес дома — покажем год постройки, как обычно устроена электрика, и контакты управляющей компании."
                    : "В этом городе у нас есть квалифицированные мастера-электрики. Укажите точный адрес, чтобы сориентировать вас по времени и цене."
              }
              onBack={() =>
                go(
                  leadFlow === "master"
                    ? "become-master"
                    : "geo-address",
                )
              }
              onConfirm={(city) => {
                setSelectedCity(city);
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
                if (leadFlow === "master") {
                  go("master-about");
                  return;
                }
                // Install / help-electrical: always collect address for house insight.
                go("address-select");
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
                setHelpElectricalFlow(true);
                setSelectedCity(null);
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
                setSelectedLeadService(null);
                setLeadPanelModules(null);
                setLeadBackScreen("request-type");
                go("geo-address");
              }}
            />
          )}
          {screen === "address-select" && selectedCity && (
            <LeadAddressScreen
              key={`address-${selectedCity}-${helpElectricalFlow ? "help" : "std"}`}
              city={selectedCity}
              initialAddress={selectedAddress ?? undefined}
              requireApartment={false}
              heading={
                helpElectricalFlow || isMoscow(selectedCity)
                  ? "Точный адрес дома"
                  : undefined
              }
              description={
                isMoscow(selectedCity)
                  ? "Выберите дом из открытых данных Москвы — подтянем год постройки, заземление по году и сроки капремонта."
                  : "Укажите точный адрес через DaData — улица и номер дома."
              }
              onBack={() => go("city-select")}
              onConfirm={(address) => {
                setSelectedAddress(address.value);
                setSelectedAddressFiasId(
                  address.houseFiasId ?? address.fiasId ?? null,
                );
                go("house-insight");
              }}
            />
          )}
          {screen === "house-insight" && selectedCity && selectedAddress && (
            <HouseInsightScreen
              key={`house-${selectedCity}-${selectedAddress}`}
              city={selectedCity}
              address={selectedAddress}
              fiasId={selectedAddressFiasId}
              onBack={() => go("address-select")}
              onCallMaster={() => go("lead-service")}
            />
          )}
          {screen === "lead-service" && selectedCity && (
            <LeadServiceScreen
              key={`lead-service-${selectedCity}-${leadPanelModules ?? 0}-${isFirstLeadOrder}`}
              city={selectedCity}
              panelModules={leadPanelModules}
              isFirstOrder={isFirstLeadOrder}
              onBack={() => {
                if (selectedAddress) {
                  go("house-insight");
                  return;
                }
                go("geo-address");
              }}
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
              exactAddress={selectedAddress ?? undefined}
              serviceType={selectedLeadService ?? undefined}
              panelModules={leadPanelModules ?? undefined}
              isFirstOrder={isFirstLeadOrder}
              setupTitle={installSetupTitle}
              panelId={
                leadBackScreen === "scheme" ? activePanelId ?? undefined : undefined
              }
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
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
                setHelpElectricalFlow(false);
                setLeadPanelModules(null);
                go("objects");
              }}
            />
          )}
          {screen === "request-details" && activeRequest && (
            <RequestDetailsScreen
              key={`request-${activeRequest.id}`}
              request={activeRequest}
              readOnly={Boolean(masterViewRequest)}
              onBack={() => {
                setMasterViewRequest(null);
                setObjectsTab(1);
                go("objects");
              }}
              onRename={renameRequest}
              onDelete={deleteRequest}
              onUpdate={updateRequest}
              onOpenPanel={
                masterViewRequest
                  ? () => {
                      if (masterViewRequest.panelId) {
                        void openMasterLinkedPanel(masterViewRequest.id);
                      }
                    }
                  : (panelId) => openPanel(panelId)
              }
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              key="profile"
              panelsUnlimited={Boolean(quota?.unlimited)}
              inviteCount={quota?.events.length ?? 0}
              onOpenInvites={() => {
                void refreshQuota().then(() => openPanelLimit());
              }}
              isAdmin={isAdmin}
              onOpenAdmin={() => go("admin")}
              onBack={() => go("objects")}
              onLoggedOut={() => {
                setItems([]);
                setActivePanelId(null);
                setActiveRequestId(null);
                setPendingAuthAction(null);
                setMainMenuOpen(false);
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
          {screen === "panel-game" && (
            <SchemeErrorBoundary
              onBack={() => go("objects")}
              panelTitle="Игра"
            >
              <PanelGameScreen
                key="panel-game"
                panels={items.filter(
                  (item): item is PanelObject => item.kind === "panel",
                )}
                onBack={() => go("objects")}
                onAddPanel={() => requireTelegramAuth("add-panel")}
              />
            </SchemeErrorBoundary>
          )}
          {screen === "feedback" && (
            <FeedbackScreen key="feedback" onBack={() => go("objects")} />
          )}
          {screen === "research-survey" && (
            <ResearchSurveyScreen key="research-survey" />
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
          {screen === "master-search" && searchRequestId && (
            <MasterSearchScreen
              key={`search-${searchRequestId}`}
              requestId={searchRequestId}
              onMasterFound={(master) => {
                setFoundMaster(master);
                go("master-success");
              }}
              onTimeout={() => {
                go("master-not-found");
              }}
            />
          )}
          {screen === "master-success" && searchRequestId && foundMaster && (
            <MasterSuccessScreen
              key={`success-${searchRequestId}`}
              requestId={searchRequestId}
              master={foundMaster}
              onClose={() => {
                setSearchRequestId(null);
                setFoundMaster(null);
                go("objects");
              }}
            />
          )}
          {screen === "master-not-found" && (
            <MasterNotFoundScreen
              key="master-not-found"
              onClose={() => {
                setSearchRequestId(null);
                go("objects");
              }}
            />
          )}
          {screen === "admin" && (
            <AdminDashboardScreen
              key="admin"
              onBack={() => go("profile")}
            />
          )}
          {screen === "become-master" && (
            <BecomeMasterScreen
              key="become-master"
              onBack={() => go("objects")}
              onConfirm={() => {
                setLeadFlow("master");
                setHelpElectricalFlow(false);
                setSelectedCity(null);
                setSelectedAddress(null);
                setSelectedAddressFiasId(null);
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
        <AnimatePresence>
          {panelHousePromptOpen && (
            <PanelHouseAddressSheet
              open={panelHousePromptOpen}
              saving={panelHouseSaving}
              saved={panelHouseSaved}
              error={panelHouseSaveError}
              onClose={() => {
                if (panelHouseSaving) return;
                setPanelHousePromptOpen(false);
                setPanelHouseSaved(false);
                setPanelHouseSaveError(null);
              }}
              onConfirm={(payload) => savePanelHouseInsight(payload)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {waitlistKind && (
            <WaitlistSheet
              kind={waitlistKind}
              onClose={() => setWaitlistKind(null)}
            />
          )}
        </AnimatePresence>
        {pdConsentChecked &&
          canUseServerAuth() &&
          !pdConsentReady &&
          screen !== "research-survey" && (
          <PdConsentGate onAccepted={() => setPdConsentReady(true)} />
        )}
      </div>
    </div>
  );
}
