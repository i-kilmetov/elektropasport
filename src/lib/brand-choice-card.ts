import type { NoPanelSetupId } from "@/lib/no-panel-setups";
import type { LeadServiceType } from "@/lib/lead-services";

export type BrandChoiceVariant = "ink" | "mustard" | "white";

export const brandChoiceClasses = {
  ink: {
    card: "border-[#111113] bg-[#111113] text-white",
    icon: "bg-[#D3DA00] text-[#111113]",
    body: "text-white/70",
    price: "bg-white/12 text-white",
    inset: "bg-white/10 text-white",
  },
  mustard: {
    card: "border-black/8 bg-[#D3DA00] text-[#111113]",
    icon: "bg-[#111113] text-white",
    body: "text-[#111113]/70",
    price: "bg-white/75 text-[#111113]",
    inset: "bg-white/60 text-[#111113]",
  },
  white: {
    card: "border-black/8 bg-white text-[#111113]",
    icon: "bg-zinc-100 text-[#111113]",
    body: "text-zinc-500",
    price: "bg-zinc-100 text-[#111113]",
    inset: "bg-zinc-50 text-[#111113]",
  },
} as const satisfies Record<
  BrandChoiceVariant,
  {
    card: string;
    icon: string;
    body: string;
    price: string;
    inset: string;
  }
>;

export const LEAD_SERVICE_VARIANTS: Partial<
  Record<LeadServiceType, BrandChoiceVariant>
> = {
  online_consultation: "ink",
  master_home_visit: "mustard",
  master_labeling: "white",
};

export const NO_PANEL_CARD_VARIANTS: Record<NoPanelSetupId, BrandChoiceVariant> =
  {
    plug_fuses: "ink",
    floor_panel_only: "mustard",
    inlet_cable: "white",
    other: "ink",
  };

export const NO_PANEL_CARD_TITLES: Record<NoPanelSetupId, string> = {
  plug_fuses: "Пробки",
  floor_panel_only: "Только этажный щит",
  inlet_cable: "Только вводной кабель",
  other: "Другое",
};
