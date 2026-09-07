import { cn } from "@/lib/utils";

export type TokomPlusMarkVariant = "color" | "mono" | "onYellow";

const PALETTE: Record<
  TokomPlusMarkVariant,
  { back: string; mid: string; front: string; plus: string }
> = {
  color: {
    back: "#111113",
    mid: "#6B7B00",
    front: "#D4E117",
    plus: "#111113",
  },
  mono: {
    back: "#111113",
    mid: "#8E8E93",
    front: "#C7C7CC",
    plus: "#111113",
  },
  /** On brand yellow (#D3DA00) — white / gray instead of lime. */
  onYellow: {
    back: "#111113",
    mid: "#9A9A9E",
    front: "#FFFFFF",
    plus: "#111113",
  },
};

function PlusGlyph({
  cx,
  cy,
  size,
  stroke,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  size: number;
  stroke: string;
  strokeWidth: number;
}) {
  const half = size / 2;
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="square">
      <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} />
      <line x1={cx} y1={cy - half} x2={cx} y2={cy + half} />
    </g>
  );
}

/** Layered circle + plus mark for «Током Плюс». */
export function TokomPlusMark({
  size = 28,
  variant = "color",
  className,
  title = "Током Плюс",
}: {
  size?: number;
  variant?: TokomPlusMarkVariant;
  className?: string;
  title?: string;
}) {
  const c = PALETTE[variant];
  // ViewBox tuned so trailing discs and floating pluses fit.
  const vb = "0 0 40 36";

  return (
    <svg
      width={size}
      height={size * (36 / 40)}
      viewBox={vb}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Trailing discs (left → right) */}
      <circle cx="14.5" cy="19" r="11.2" fill={c.back} />
      <circle cx="17.2" cy="19" r="11.2" fill={c.mid} />
      <circle cx="20.5" cy="19" r="11.2" fill={c.front} />
      {/* Main plus */}
      <PlusGlyph cx={20.5} cy={19} size={11} stroke={c.plus} strokeWidth={2.6} />
      {/* Floating pluses (upper-right) */}
      <PlusGlyph cx={32.5} cy={8.5} size={5.2} stroke={c.plus} strokeWidth={1.35} />
      <PlusGlyph cx={36.2} cy={4.2} size={3.6} stroke={c.plus} strokeWidth={1.1} />
    </svg>
  );
}
