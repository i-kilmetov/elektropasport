"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  getManufacturerBrand,
  getManufacturerPalette,
  resolveBrandKey,
  type ManufacturerBrandKey,
} from "@/lib/manufacturer-brands";

function LogoSvg({
  children,
  className,
  viewBox = "0 0 24 12",
}: {
  children: ReactNode;
  className?: string;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("h-3 w-[22px]", className)}
      aria-hidden
      fill="none"
    >
      {children}
    </svg>
  );
}

/**
 * Compact marks approximating official manufacturer logos
 * (proportions / colors / signature shapes used on DIN modules).
 */
function BrandLogo({ brandKey }: { brandKey: ManufacturerBrandKey }) {
  switch (brandKey) {
    case "abb":
      /* Red rectangle + white ABB wordmark */
      return (
        <LogoSvg viewBox="0 0 36 14" className="h-3.5 w-[28px]">
          <rect width="36" height="14" rx="1.4" fill="#FF000F" />
          <path
            fill="#fff"
            d="M5.2 10.6 8.05 3.4h2.35L13.25 10.6h-2.05l-.55-1.55H7.8l-.55 1.55H5.2zm3.05-3.05h1.95L9.25 5.05 8.25 7.55zM14.6 10.6V3.4h2.85c1.55 0 2.55.85 2.55 2.15 0 .95-.55 1.65-1.45 1.95L20.4 10.6h-2.15l-1.4-2.75h-.95v2.75H14.6zm2.1-4.35h.75c.55 0 .9-.3.9-.75s-.35-.75-.9-.75h-.75v1.5zM22.15 10.6V3.4H28.1v1.7h-3.85v1.2H27.7v1.55h-3.45v1.05H28.3v1.7h-6.15z"
          />
        </LogoSvg>
      );
    case "schneider":
      /* Green square with white cross (Schneider Electric symbol) */
      return (
        <LogoSvg viewBox="0 0 14 14" className="h-3.5 w-3.5">
          <rect width="14" height="14" rx="2.2" fill="#3DCD58" />
          <path
            fill="#fff"
            d="M6.1 2.6h1.8v3.5h3.5v1.8H7.9v3.5H6.1V7.9H2.6V6.1H6.1V2.6z"
          />
        </LogoSvg>
      );
    case "systeme":
      /* Systeme Electric — green tile + white SE */
      return (
        <LogoSvg viewBox="0 0 28 14" className="h-3.5 w-[24px]">
          <rect width="28" height="14" rx="2" fill="#3DCD58" />
          <path
            fill="#fff"
            d="M6.2 9.8c-.85-.55-1.35-1.4-1.35-2.45C4.85 5.4 6 4.2 7.85 4.2c1.15 0 2 .4 2.55 1.05L9.25 6.55c-.3-.35-.7-.55-1.25-.55-.85 0-1.45.6-1.45 1.4s.6 1.4 1.45 1.4c.55 0 .95-.2 1.25-.55l1.15 1.25c-.6.7-1.55 1.15-2.7 1.15-.85 0-1.6-.25-2.1-.85zM12.4 10.4V3.6h2.55c1.7 0 2.75.95 2.75 2.4 0 1.45-1.05 2.4-2.75 2.4h-.95v2H12.4zm1.6-3.45h.9c.7 0 1.15-.4 1.15-1s-.45-1-1.15-1h-.9v2zM19.2 10.4V3.6h1.55v5.35H24v1.45h-4.8z"
          />
        </LogoSvg>
      );
    case "legrand":
      /* Red Legrand wordmark */
      return (
        <LogoSvg viewBox="0 0 44 12" className="h-3 w-[34px]">
          <path
            fill="#C8102E"
            d="M1.2 10.5V1.5h1.85v7.35H7.4V10.5H1.2zm8.2 0V1.5h5.5v1.65H11.3v1.85h3.1v1.55h-3.1V8.85h3.75V10.5H9.4zm7.85 0V1.5h1.85v9H17.25zm4.05 0V1.5h1.85l2.05 4.55L27.25 1.5H29.1v9h-1.7V4.55L25.45 10.5h-1.35L22.15 4.55V10.5h-1.85zm10.5 0V1.5h1.85v6.9h3.35V10.5h-5.2z"
          />
        </LogoSvg>
      );
    case "hager":
      /* Bold red Hager “H” mark (characteristic double uprights + bar) */
      return (
        <LogoSvg viewBox="0 0 18 12" className="h-3.5 w-4">
          <path
            fill="#E30613"
            d="M1 11V1h3.2v3.55h9.6V1H17v10h-3.2V6.15H4.2V11H1z"
          />
        </LogoSvg>
      );
    case "chint":
      /* Blue CHINT wordmark */
      return (
        <LogoSvg viewBox="0 0 40 12" className="h-3 w-[30px]">
          <path
            fill="#00A0E3"
            d="M3.4 9.6C1.85 8.55.95 7.1.95 5.4.95 2.7 3 1 5.9 1c1.7 0 3.05.55 3.95 1.55L8.35 4.2c-.5-.6-1.25-.95-2.2-.95-1.55 0-2.65 1.05-2.65 2.5S4.6 8.25 6.15 8.25c.95 0 1.7-.35 2.2-.95l1.5 1.6C8.95 10.15 7.55 10.8 5.7 10.8c-1 0-1.85-.35-2.3-1.2zM12.2 10.4V1.6h2.15v8.8H12.2zm4.55 0V1.6h2.15v8.8h-2.15zm4.2 0 3.55-8.8h2.35L30.4 10.4h-2.3l-.6-1.7h-3.7l-.6 1.7h-2.25zm3.95-3.45h2.45l-1.225-3.4-1.225 3.4z"
          />
        </LogoSvg>
      );
    case "iek":
      /* Red tile + white IEK */
      return (
        <LogoSvg viewBox="0 0 30 14" className="h-3.5 w-[24px]">
          <rect width="30" height="14" rx="1.6" fill="#E30613" />
          <path
            fill="#fff"
            d="M4.2 10.6V3.4h1.55v2.55h2.85V3.4H10.15v7.2H8.6V7.35H5.75v3.25H4.2zm8.35 0V3.4h5.2v1.45H14.1v1.35h2.95v1.35H14.1v1.6h3.7v1.45h-5.25zm7.2 0V3.4h1.55v7.2h-1.55z"
          />
        </LogoSvg>
      );
    case "ekf":
      /* Orange EKF wordmark */
      return (
        <LogoSvg viewBox="0 0 28 12" className="h-3 w-[22px]">
          <path
            fill="#F36F21"
            d="M1.4 10.5V1.5h5.7v1.65H3.25v1.7h3.45v1.5H3.25v2.5H7.3V10.5H1.4zm8.15 0V1.5h1.9v7.35h3.9V10.5h-5.8zm7.85 0V1.5h1.9v2.85l2.95-2.85h2.35L21.7 4.55 25.1 10.5h-2.4l-2.7-3.4-.75.8v2.6h-1.86z"
          />
        </LogoSvg>
      );
    case "dekraft":
      /* Blue DEKraft badge */
      return (
        <LogoSvg viewBox="0 0 40 14" className="h-3.5 w-[30px]">
          <rect width="40" height="14" rx="1.6" fill="#1B4F9C" />
          <path
            fill="#fff"
            d="M3.4 10.6V3.4h2.7c1.55 0 2.5.9 2.5 2.2S7.65 7.8 6.1 7.8H4.95v2.8H3.4zm1.55-4.2h1.15c.6 0 1-.35 1-1s-.4-1-1-1H4.95v2zM10.6 10.6V3.4h1.5v7.2h-1.5zm3.35 0V3.4h1.5l1.35 3.55L18.15 3.4h1.5v7.2h-1.4V6.05L17 10.6h-1.15l-1.25-4.55V10.6h-1.4zm8.1 0V3.4h1.5v5.55h2.55v1.65h-4.05zm5.55 0 1.55-7.2h1.7l1.55 7.2h-1.55l-.25-1.35h-1.2l-.25 1.35h-1.55zm1.55-2.85h.85l-.425-2.25-.425 2.25zM32.4 10.6V3.4h3.7v1.4h-2.2v1.25h1.95v1.3h-1.95v1.55h2.35v1.7h-3.85z"
          />
        </LogoSvg>
      );
    case "keaz":
      /* KEAZ blue wordmark */
      return (
        <LogoSvg viewBox="0 0 36 12" className="h-3 w-[28px]">
          <path
            fill="#0033A0"
            d="M1.5 10.5V1.5h1.85v3.2L6.05 1.5h2.2L5.5 5.35 8.7 10.5H6.4L4.45 7.25l-.85.95v2.3H1.5zm9.4 0V1.5h5.9v1.65h-4.05v1.7h3.7v1.5h-3.7v2.5h4.35V10.5h-6.2zm8.55 0V1.5h1.85v2.85l1.25-1.35h2.25L21.6 5.5 24.5 10.5h-2.3l-1.7-2.7-.75.75v1.95h-1.7zm8.4 0V1.5h1.85v9H27.85zm3.95 0V1.5h1.85v9h-1.85z"
          />
        </LogoSvg>
      );
    case "tdm":
      /* Orange TDM Electric */
      return (
        <LogoSvg viewBox="0 0 34 12" className="h-3 w-[26px]">
          <path
            fill="#EA580C"
            d="M1.6 3.2V1.5h7.7v1.7H6.85v7.3H4.95V3.2H1.6zm10.1 7.3V1.5h5.95v1.65h-4.1v1.7h3.7v1.45h-3.7v2.15h4.3V10.5h-6.15zm8.55 0V1.5h2.05l2.55 5.1L27.4 1.5H29.5v9h-1.85V4.55L25.55 10.5h-1.4L22.05 4.55V10.5h-1.8z"
          />
        </LogoSvg>
      );
    case "zubr":
      /* Amber ZUBR wordmark */
      return (
        <LogoSvg viewBox="0 0 34 12" className="h-3 w-[26px]">
          <path
            fill="#D97706"
            d="M1.4 1.5h5.7v1.6H4.55L7.7 10.5H5.55L2.55 3.65V10.5H1.1V1.5h.3zm8.2 9V1.5h1.85v9H9.6zm4.55 0V1.5h1.85v3.2L18.7 1.5h2.2L18.15 5.35 21.35 10.5H19L17.1 7.25l-.85.95v2.3h-1.1zm9.35 0V1.5h1.85v3.2L28.05 1.5h2.2L27.5 5.35 30.7 10.5H28.4L26.5 7.25l-.85.95v2.3h-1.15z"
          />
        </LogoSvg>
      );
    case "meander":
      /* Teal meander (square-wave) symbol */
      return (
        <LogoSvg viewBox="0 0 28 12" className="h-3 w-[22px]">
          <path
            stroke="#0F766E"
            strokeWidth="2.2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            d="M2 9V3h6v6h6V3h6v6h6"
          />
        </LogoSvg>
      );
    case "novatek":
      /* Blue NTE / Novatek tile */
      return (
        <LogoSvg viewBox="0 0 28 14" className="h-3.5 w-[24px]">
          <rect width="28" height="14" rx="1.6" fill="#1D4ED8" />
          <path
            fill="#fff"
            d="M4.2 10.6V3.4h1.45l2.55 4.2V3.4h1.4v7.2H8.2L5.65 6.4v4.2H4.2zm8.1 0V3.4h1.5v5.55H17v1.65h-4.7zm6.35 0V3.4h4.1v1.4h-2.55v1.2h2.2v1.3h-2.2v1.55h2.7v1.75h-4.25z"
          />
        </LogoSvg>
      );
    case "digitop":
      /* Digitop — purple DT mark */
      return (
        <LogoSvg viewBox="0 0 22 14" className="h-3.5 w-[18px]">
          <rect width="22" height="14" rx="2" fill="#7C3AED" />
          <path
            fill="#fff"
            d="M4.2 10.6V3.4h4.1c1.55 0 2.55.95 2.55 2.4S9.85 8.2 8.3 8.2H5.75v2.4H4.2zm1.55-3.85h1.95c.65 0 1.1-.4 1.1-1s-.45-1-1.1-1H5.75v2zM13.2 10.6V3.4h1.55v7.2H13.2z"
          />
        </LogoSvg>
      );
    case "navigator":
      /* Navigator — dark triangle / compass */
      return (
        <LogoSvg viewBox="0 0 14 14" className="h-3.5 w-3.5">
          <path
            fill="#0F172A"
            d="M7 1.2 12.8 12.2H1.2L7 1.2z"
          />
          <path fill="#fff" d="M7 5.2 9.1 10H4.9L7 5.2z" />
        </LogoSvg>
      );
    case "kontaktor":
      /* Контактор — crimson K in rounded square */
      return (
        <LogoSvg viewBox="0 0 14 14" className="h-3.5 w-3.5">
          <rect width="14" height="14" rx="2.2" fill="#BE123C" />
          <path
            fill="#fff"
            d="M3.6 11V3h1.7v3.15L8.15 3H10.2L7.05 6.15 10.45 11H8.25L5.95 7.55l-.65.7V11H3.6z"
          />
        </LogoSvg>
      );
    default:
      return null;
  }
}

/** Short manufacturer word as printed near the DIN face logo. */
const FACE_MANUFACTURER_LABEL: Record<ManufacturerBrandKey, string> = {
  abb: "ABB",
  schneider: "Schneider",
  systeme: "Systeme",
  legrand: "Legrand",
  hager: "Hager",
  chint: "CHINT",
  iek: "IEK",
  ekf: "EKF",
  dekraft: "DEKraft",
  keaz: "KEAZ",
  tdm: "TDM",
  zubr: "ZUBR",
  meander: "Меандр",
  novatek: "Новатек",
  digitop: "DigiTOP",
  navigator: "Navigator",
  kontaktor: "Контактор",
};

type FaceTypeStyle = {
  fontSize: string;
  fontWeight: number;
  letterSpacing: string;
  fontFamily: string;
  textTransform?: "uppercase" | "none";
  color: string;
};

/**
 * Per-brand face typography: manufacturer ≈ logo, series ≈ secondary mark
 * (size ratio ~0.55–0.7 like on real DIN modules).
 */
function brandFaceStyles(
  brandKey: ManufacturerBrandKey | null,
  accent: string,
): { manufacturer: FaceTypeStyle; series: FaceTypeStyle } {
  const sans =
    'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  const narrow =
    'ui-sans-serif, system-ui, -apple-system, "Arial Narrow", Arial, sans-serif';
  const serif = 'Georgia, "Times New Roman", Times, serif';
  const seriesInk = "#27272A";

  switch (brandKey) {
    case "abb":
      return {
        manufacturer: {
          fontSize: "9px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          fontFamily: sans,
          textTransform: "uppercase",
          color: accent,
        },
        series: {
          fontSize: "5.5px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          fontFamily: sans,
          color: seriesInk,
        },
      };
    case "iek":
    case "hager":
      return {
        manufacturer: {
          fontSize: "9px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          fontFamily: sans,
          textTransform: "uppercase",
          color: accent,
        },
        series: {
          fontSize: "5.5px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          fontFamily: sans,
          color: seriesInk,
        },
      };
    case "schneider":
    case "systeme":
      return {
        manufacturer: {
          fontSize: "7px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          fontFamily: sans,
          color: accent,
        },
        series: {
          fontSize: "5.5px",
          fontWeight: 600,
          letterSpacing: "0",
          fontFamily: sans,
          color: seriesInk,
        },
      };
    case "legrand":
      return {
        manufacturer: {
          fontSize: "8px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          fontFamily: serif,
          color: accent,
        },
        series: {
          fontSize: "5.5px",
          fontWeight: 600,
          letterSpacing: "0.02em",
          fontFamily: sans,
          color: seriesInk,
        },
      };
    case "chint":
    case "keaz":
    case "dekraft":
      return {
        manufacturer: {
          fontSize: "8px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          fontFamily: sans,
          textTransform: "uppercase",
          color: accent,
        },
        series: {
          fontSize: "5px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          fontFamily: sans,
          color: seriesInk,
        },
      };
    case "ekf":
    case "tdm":
    case "zubr":
      return {
        manufacturer: {
          fontSize: "8.5px",
          fontWeight: 800,
          letterSpacing: "0.07em",
          fontFamily: narrow,
          textTransform: "uppercase",
          color: accent,
        },
        series: {
          fontSize: "5.5px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          fontFamily: narrow,
          color: seriesInk,
        },
      };
    case "meander":
    case "novatek":
    case "digitop":
    case "navigator":
    case "kontaktor":
      return {
        manufacturer: {
          fontSize: "7.5px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          fontFamily: sans,
          color: accent,
        },
        series: {
          fontSize: "5px",
          fontWeight: 600,
          letterSpacing: "0",
          fontFamily: sans,
          color: seriesInk,
        },
      };
    default:
      return {
        manufacturer: {
          fontSize: "8px",
          fontWeight: 800,
          letterSpacing: "0.04em",
          fontFamily: sans,
          textTransform: "uppercase",
          color: accent,
        },
        series: {
          fontSize: "5.5px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          fontFamily: sans,
          color: seriesInk,
        },
      };
  }
}

function typeStyleToCss(style: FaceTypeStyle): CSSProperties {
  return {
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    fontFamily: style.fontFamily,
    textTransform: style.textTransform,
    lineHeight: 1.05,
  };
}

/**
 * Face identity for the scheme:
 * - manufacturer logo on the real device → manufacturer name (brand color / logo-like type)
 * - manufacturer + series on the real device → both lines, series smaller (~0.6×)
 * Series is shown only when it was actually read/saved (`device.series`), not catalog guess.
 */
export function DeviceFaceIdentityMark({
  brandKey,
  brand,
  series,
  className,
}: {
  brandKey?: string;
  brand?: string;
  /** Series only when present on the device / in saved data. */
  series?: string;
  className?: string;
}) {
  const key = resolveBrandKey(brandKey, brand);
  const meta = getManufacturerBrand(brandKey, brand);
  const palette = getManufacturerPalette(brandKey, brand);
  const manufacturerLabel =
    (key ? FACE_MANUFACTURER_LABEL[key] : null) ||
    meta?.label ||
    brand?.trim() ||
    null;
  const seriesLabel = series?.trim() || null;

  if (!manufacturerLabel && !seriesLabel) return null;

  const styles = brandFaceStyles(key ?? null, palette.accent);
  const title = [manufacturerLabel, seriesLabel].filter(Boolean).join(" · ");

  return (
    <span
      title={title}
      className={cn(
        "flex max-w-full flex-col items-start gap-[1px] overflow-hidden",
        className,
      )}
    >
      {manufacturerLabel && (
        <span
          className="max-w-full truncate leading-none"
          style={typeStyleToCss(styles.manufacturer)}
        >
          {manufacturerLabel}
        </span>
      )}
      {seriesLabel && (
        <span
          className="max-w-full truncate leading-none"
          style={typeStyleToCss(styles.series)}
        >
          {seriesLabel}
        </span>
      )}
    </span>
  );
}

/** @deprecated Prefer DeviceFaceIdentityMark — kept for catalog/list chips. */
export function SeriesMark({
  series,
  brandKey,
  brand,
  className,
}: {
  series?: string;
  brandKey?: string;
  brand?: string;
  className?: string;
}) {
  return (
    <DeviceFaceIdentityMark
      series={series}
      brandKey={brandKey}
      brand={brand}
      className={className}
    />
  );
}

export function BrandMark({
  brandKey,
  brand,
  className,
}: {
  brandKey?: string;
  brand?: string;
  className?: string;
}) {
  const key = resolveBrandKey(brandKey, brand);
  const meta = getManufacturerBrand(brandKey, brand);
  if (!key || !meta) return null;

  return (
    <span
      title={meta.label}
      className={cn(
        "inline-flex h-4 max-w-full items-center justify-start overflow-hidden",
        className,
      )}
    >
      <BrandLogo brandKey={key} />
    </span>
  );
}
