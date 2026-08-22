export const LOGO_INK = "#111113";
export const BRAND_YELLOW = "#D3DA00";
export const WORDMARK_REST = "ОКОМ";
export const LOGO_FONT_WEIGHT = 500;

/** Gap between the two stripes (top stripe sits a bit higher) */
export const STRIPE_STRIPE_GAP = "0.038em";
/** Space from lower stripe to the T crossbar */
export const STRIPE_ABOVE_CROSSBAR = "0.016em";
/** Geologica empty space above the T crossbar inside the glyph box */
export const T_CAP_BEARING = "0.11em";
export const STRIPE_HEIGHT = "0.08em";
/** Top stripe — nearly square (length slightly greater than height). */
export const STRIPE_TOP_WIDTH = "0.095em";
export const STRIPE_BOTTOM_WIDTH = "0.30em";
/** Room above the letter for stripes when rotating the mark */
export const STRIPE_PAD_TOP = `calc(${STRIPE_HEIGHT} + ${STRIPE_STRIPE_GAP} + ${STRIPE_HEIGHT} + ${STRIPE_ABOVE_CROSSBAR} - ${T_CAP_BEARING})`;

export function wordmarkTypeStyle(fontSize: string | number, color: string) {
  return {
    fontFamily: "var(--font-geologica)",
    fontWeight: LOGO_FONT_WEIGHT,
    fontSize,
    color,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  } as const;
}

export const splashWordmarkTypeStyle = wordmarkTypeStyle(
  "clamp(3rem, min(18vw, 22vh), 6.5rem)",
  LOGO_INK,
);

export const headerWordmarkTypeStyle = wordmarkTypeStyle(
  "clamp(2rem, min(7.5vw, 11vh), 2.75rem)",
  LOGO_INK,
);
