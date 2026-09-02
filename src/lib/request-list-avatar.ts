import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Hammer,
  Home,
  Layers,
  Plug,
  Wrench,
  Zap,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { ConsultationIcon } from "@/components/icons/consultation-icon";
import { FULL_CATALOG_KIND_OPTIONS } from "@/lib/appliance-catalog";
import {
  applianceKindIcon,
  HOME_APPLIANCE_CATALOG,
} from "@/lib/home-appliances";
import type { RequestTypeCode } from "@/lib/request-codes";
import { isRequestTypeCode } from "@/lib/request-codes";
import type { HomeApplianceKind, InstallRequest } from "@/types";
import { isStandaloneAiConsultation } from "@/types";

export type RequestListAvatarIcon = LucideIcon | typeof BreakerIcon | typeof ConsultationIcon;

export type RequestListAvatarMeta = {
  Icon: RequestListAvatarIcon;
  bgClass: string;
  iconClass: string;
};

function parseRequestTypeCode(publicCode?: string): RequestTypeCode | null {
  if (!publicCode) return null;
  const prefix = publicCode.split("-")[0]?.trim();
  return prefix && isRequestTypeCode(prefix) ? prefix : null;
}

function applianceKindFromTopicLabel(topicLabel: string): HomeApplianceKind | null {
  const normalized = topicLabel.trim().toLowerCase();
  if (!normalized) return null;

  for (const item of HOME_APPLIANCE_CATALOG) {
    if (item.title.toLowerCase() === normalized) return item.kind;
  }
  for (const item of FULL_CATALOG_KIND_OPTIONS) {
    if (item.title.toLowerCase() === normalized) return item.id;
  }
  return null;
}

const TYPE_AVATAR: Record<
  RequestTypeCode,
  Pick<RequestListAvatarMeta, "Icon" | "bgClass" | "iconClass">
> = {
  C: {
    Icon: ConsultationIcon,
    bgClass: "bg-violet-100",
    iconClass: "text-violet-700",
  },
  V: {
    Icon: Home,
    bgClass: "bg-emerald-100",
    iconClass: "text-emerald-700",
  },
  P: {
    Icon: Layers,
    bgClass: "bg-sky-100",
    iconClass: "text-sky-700",
  },
  S: {
    Icon: Wrench,
    bgClass: "bg-amber-100",
    iconClass: "text-amber-800",
  },
  M: {
    Icon: Hammer,
    bgClass: "bg-orange-100",
    iconClass: "text-orange-700",
  },
  F: {
    Icon: Zap,
    bgClass: "bg-yellow-100",
    iconClass: "text-yellow-800",
  },
  L: {
    Icon: Layers,
    bgClass: "bg-zinc-200",
    iconClass: "text-zinc-700",
  },
  I: {
    Icon: Plug,
    bgClass: "bg-blue-100",
    iconClass: "text-blue-700",
  },
  O: {
    Icon: ClipboardList,
    bgClass: "bg-zinc-100",
    iconClass: "text-zinc-600",
  },
  U: {
    Icon: ClipboardList,
    bgClass: "bg-zinc-100",
    iconClass: "text-zinc-600",
  },
};

export function resolveRequestListAvatar(
  request: InstallRequest,
): RequestListAvatarMeta {
  if (request.aiConsultation) {
    if (request.aiConsultation.category === "electrical") {
      return {
        Icon: BreakerIcon,
        bgClass: "bg-amber-100",
        iconClass: "text-amber-800",
      };
    }

    const kind = applianceKindFromTopicLabel(request.aiConsultation.topicLabel);
    if (kind) {
      return {
        Icon: applianceKindIcon(kind),
        bgClass: "bg-sky-100",
        iconClass: "text-sky-700",
      };
    }

    return {
      Icon: Wrench,
      bgClass: "bg-sky-100",
      iconClass: "text-sky-700",
    };
  }

  const typeCode = parseRequestTypeCode(request.publicCode);
  if (typeCode) {
    return TYPE_AVATAR[typeCode];
  }

  if (isStandaloneAiConsultation(request)) {
    return TYPE_AVATAR.C;
  }

  return TYPE_AVATAR.U;
}
