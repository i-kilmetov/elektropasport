"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  getManufacturerBrand,
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

function BrandLogo({
  brandKey,
  color,
}: {
  brandKey: ManufacturerBrandKey;
  color: string;
}) {
  switch (brandKey) {
    case "abb":
      return (
        <LogoSvg viewBox="0 0 28 12">
          <rect x="0.5" y="0.5" width="27" height="11" rx="1.5" stroke={color} strokeWidth="1" />
          <path
            d="M4 9V3.2h2.1c1.15 0 1.85.55 1.85 1.45 0 .62-.35 1.1-.95 1.28L8.3 9H6.95l-.95-2.55H5.2V9H4zm1.2-3.55h.9c.42 0 .7-.22.7-.55s-.28-.55-.7-.55h-.9v1.1zM10.2 9V3.2h2.1c1.15 0 1.85.55 1.85 1.45 0 .62-.35 1.1-.95 1.28L14.5 9h-1.35l-.95-2.55h-.8V9h-1.2zm1.2-3.55h.9c.42 0 .7-.22.7-.55s-.28-.55-.7-.55h-.9v1.1zM16.4 9V3.2h1.2V7.8H20V9h-3.6z"
            fill={color}
          />
        </LogoSvg>
      );
    case "schneider":
    case "systeme":
      return (
        <LogoSvg viewBox="0 0 12 12" className="h-3.5 w-3.5">
          <circle cx="6" cy="6" r="4.6" stroke={color} strokeWidth="1.7" />
          <path d="M6 2.6v6.8M2.6 6h6.8" stroke={color} strokeWidth="1.6" />
        </LogoSvg>
      );
    case "legrand":
      return (
        <LogoSvg viewBox="0 0 28 12">
          <path
            d="M1.5 2.2h1.7v5.4h2.7V9.2H1.5V2.2zm6.2 7V2.2h4.4v1.4H9.4v1.35h2.2v1.3H9.4V7.7h2.85V9.2H7.7zm6.5 0V2.2h1.7v7H14.2zm3.7 0V2.2h1.7l1.7 3.9 1.7-3.9h1.7v7h-1.55V5.1L21.35 9.2h-1.1L18.5 5.1V9.2H17.9z"
            fill={color}
          />
        </LogoSvg>
      );
    case "hager":
      return (
        <LogoSvg viewBox="0 0 24 12">
          <path
            d="M1.2 11V1h3.4v3.8h8.8V1H16.8v10h-3.4V6.4H4.6V11H1.2z"
            fill={color}
          />
        </LogoSvg>
      );
    case "chint":
      return (
        <LogoSvg viewBox="0 0 30 12">
          <path
            d="M3.2 9.4C2 8.6 1.3 7.3 1.3 5.9c0-2.3 1.7-4.1 4.2-4.1 1.5 0 2.7.5 3.5 1.4L7.5 4.7c-.4-.5-1-.8-1.8-.8-1.3 0-2.2.9-2.2 2.1S4.4 8 5.7 8c.8 0 1.4-.3 1.8-.8l1.5 1.4C8.2 9.6 7 10.2 5.4 10.2c-.8 0-1.6-.3-2.2-.8zM11.2 9.8V1.8h1.9v8h-1.9zm4.1 0V1.8h1.9v8h-1.9zm3.8 0 3.2-8h2.1l3.2 8h-2.05l-.55-1.5h-3.3l-.55 1.5H19.1zm3.55-3.1h2.2l-1.1-3-1.1 3z"
            fill={color}
          />
        </LogoSvg>
      );
    case "iek":
      return (
        <LogoSvg viewBox="0 0 24 12">
          <rect x="0.5" y="0.5" width="23" height="11" rx="1.5" stroke={color} strokeWidth="1" />
          <path
            d="M4 9V3h1.35v2.2H7.8V3H9.15v6H7.8V6.35H5.35V9H4zm7.4 0V3h4.6v1.25h-3.25v1.2h2.85v1.2h-2.85V7.7h3.35V9h-4.7zm6.5 0V3h1.35v6H17.9z"
            fill={color}
          />
        </LogoSvg>
      );
    case "ekf":
      return (
        <LogoSvg viewBox="0 0 24 12">
          <path
            d="M2 9.8V2.2h5.1v1.45H3.7v1.55h3.1v1.35H3.7v1.8H7.3V9.8H2zm7.4 0V2.2h1.7v6.1h3.5v1.5h-5.2zm7.1 0V2.2h1.7v2.55l2.7-2.55h2.1l-2.85 2.7L23.5 9.8h-2.15l-2.45-3.05-.7.7V9.8h-1.7z"
            fill={color}
          />
        </LogoSvg>
      );
    case "dekraft":
      return (
        <LogoSvg viewBox="0 0 18 12" className="h-3 w-4">
          <rect x="1" y="1" width="16" height="10" rx="1.5" stroke={color} strokeWidth="1.2" />
          <path d="M4.2 8.5V3.5h2.4c1.3 0 2.1.7 2.1 1.7S8 6.8 6.7 6.8H5.5v1.7H4.2zm1.3-2.85h1.05c.5 0 .85-.25.85-.65s-.35-.65-.85-.65H5.5v1.3zM11.2 8.5 13.1 3.5h1.5L16.5 8.5h-1.4l-.35-1.1h-1.8l-.35 1.1h-1.4zm2.35-2.25h1.1L13.1 4.5l-.55 1.75z" fill={color} />
        </LogoSvg>
      );
    case "keaz":
      return (
        <LogoSvg viewBox="0 0 28 12">
          <path
            d="M2 9.8V2.2h1.7v2.9l2.45-2.9h2.05L5.4 5.2 8.4 9.8H6.25L4.5 6.85l-.8.85v2.1H2zm8.5 0V2.2h5.4v1.45h-3.7v1.55h3.35v1.35H12.2v1.8h3.95v1.45H10.5zm7.7 0V2.2h1.7v2.55l1.15-1.2h2.05L20.9 5.7 23.55 9.8h-2.1l-1.55-2.45-.7.7v1.75h-1zM25 9.8V2.2h1.7v7.6H25z"
            fill={color}
          />
        </LogoSvg>
      );
    case "tdm":
      return (
        <LogoSvg viewBox="0 0 28 12">
          <path
            d="M2.2 3.4V2.2h7.2v1.2H7.1v6.4H5.4V3.4H2.2zm9.4 6.4V2.2h5.5v1.35h-3.8v1.55h3.4v1.25h-3.4V8.25h3.95V9.8h-5.65zm7.9 0V2.2h1.9l2.35 4.7L26.1 2.2H28v7.6h-1.7V5.05L24.3 9.8h-1.25l-2.05-4.75V9.8h-1.55z"
            fill={color}
          />
        </LogoSvg>
      );
    case "zubr":
      return (
        <LogoSvg viewBox="0 0 28 12">
          <path
            d="M2 2.2h5.3v1.4H4.35L7.4 9.8H5.5L2.55 3.85V9.8H1.1V2.2H2zm7.6 7.6V2.2h1.7v7.6H9.6zm4.2 0V2.2h1.7v2.9l2.45-2.9h2.05L17 5.2 20 9.8h-2.15L16.1 6.85l-.8.85v2.1h-1.5zm9.1 0V2.2h1.7v2.9l2.45-2.9H29L26.9 5.2 29.9 9.8h-2.15L25.9 6.85l-.8.85v2.1h-1.5z"
            fill={color}
            transform="scale(0.9) translate(0 0.6)"
          />
        </LogoSvg>
      );
    case "meander":
      return (
        <LogoSvg viewBox="0 0 24 12">
          <path
            d="M2 8.5c2.8-7 5.2-7 8 0s5.2 7 8 0"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </LogoSvg>
      );
    case "novatek":
      return (
        <LogoSvg viewBox="0 0 20 12" className="h-3 w-[18px]">
          <rect x="1" y="1" width="18" height="10" rx="1.5" stroke={color} strokeWidth="1.2" />
          <path d="M4 8.2V3.8h1.2l2.2 3.1V3.8H8.6v4.4H7.4L5.2 5.1v3.1H4zm6.2 0V3.8h3.6v1.05H11.4v.7h1.9v1H11.4v.8h2.5v1.05h-3.7z" fill={color} />
        </LogoSvg>
      );
    case "digitop":
      return (
        <LogoSvg viewBox="0 0 16 12" className="h-3 w-3.5">
          <rect x="1" y="1" width="14" height="10" rx="2" stroke={color} strokeWidth="1.3" />
          <circle cx="8" cy="6" r="2.2" fill={color} />
        </LogoSvg>
      );
    case "navigator":
      return (
        <LogoSvg viewBox="0 0 16 12" className="h-3 w-3.5">
          <path d="M8 1.2 14.5 10H1.5L8 1.2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="8" cy="7.2" r="1.3" fill={color} />
        </LogoSvg>
      );
    case "kontaktor":
      return (
        <LogoSvg viewBox="0 0 16 12" className="h-3 w-3.5">
          <rect x="1.5" y="2" width="13" height="8" rx="1.2" stroke={color} strokeWidth="1.3" />
          <path d="M4 6h8M8 3.5v5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </LogoSvg>
      );
    default:
      return null;
  }
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
      <BrandLogo brandKey={key} color={meta.palette.accent} />
    </span>
  );
}
