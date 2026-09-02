import type { CatalogApplianceKind } from "@/lib/appliance-catalog";
import type { ApplianceManual, ApplianceSpec } from "@/types";

export type BarcodeLookupResponse = {
  gtin: string;
  kind: CatalogApplianceKind | null;
  kindMatched: boolean;
  product: {
    id: string;
    brand: string;
    productCode: string;
    modelName: string;
  };
  powerW: number | null;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  title: string | null;
  brandLogoUrl: string | null;
  productImageUrl: string | null;
  categoryName: string | null;
  status: string;
  statusDetail: string | null;
};
