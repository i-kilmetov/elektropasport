import { cn } from "@/lib/utils";

/** Sample Russian-looking EAN-13 used only as a visual guide (not for lookup). */
export const EXAMPLE_EAN13 = "4601234567893";

const L_CODES: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};

const G_CODES: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
};

const R_CODES: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
};

/** First-digit parity for the left group (L=odd, G=even). */
const LEFT_PARITY: Record<string, string> = {
  "0": "LLLLLL",
  "1": "LLGLGG",
  "2": "LLGGLG",
  "3": "LLGGGL",
  "4": "LGLLGG",
  "5": "LGGLLG",
  "6": "LGGGLL",
  "7": "LGLGLG",
  "8": "LGLGGL",
  "9": "LGGLGL",
};

function ean13Bits(digits: string): string {
  if (!/^\d{13}$/.test(digits)) return "";
  const first = digits[0]!;
  const parity = LEFT_PARITY[first] ?? "LLLLLL";
  const left = digits.slice(1, 7);
  const right = digits.slice(7, 13);
  let bits = "101";
  for (let i = 0; i < 6; i += 1) {
    const d = left[i]!;
    bits += (parity[i] === "G" ? G_CODES : L_CODES)[d] ?? L_CODES["0"];
  }
  bits += "01010";
  for (let i = 0; i < 6; i += 1) {
    bits += R_CODES[right[i]!] ?? R_CODES["0"];
  }
  bits += "101";
  return bits;
}

export function Ean13Example({
  code = EXAMPLE_EAN13,
  className,
  compact = false,
}: {
  code?: string;
  className?: string;
  compact?: boolean;
}) {
  const bits = ean13Bits(code);
  const barWidth = compact ? 1.6 : 2;
  const height = compact ? 44 : 88;
  const quiet = compact ? 10 : 14;
  const width = quiet * 2 + bits.length * barWidth;
  const textSize = compact ? 12 : 16;
  const textY = height + (compact ? 15 : 22);
  const label = /^\d{13}$/.test(code)
    ? `${code.slice(0, 1)} ${code.slice(1, 7)} ${code.slice(7)}`
    : code;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height + (compact ? 20 : 28)}`}
        className={cn(
          "mx-auto h-auto w-full bg-white",
          compact ? "max-w-[240px] rounded-[8px]" : "max-w-[280px] rounded-[12px]",
        )}
        role="img"
        aria-label={`Пример штрихкода EAN-13 ${code}`}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height + (compact ? 20 : 28)}
          fill="#fff"
        />
        {bits.split("").map((bit, index) =>
          bit === "1" ? (
            <rect
              key={index}
              x={quiet + index * barWidth}
              y={compact ? 4 : 8}
              width={barWidth}
              height={height}
              fill="#111113"
            />
          ) : null,
        )}
        <text
          x={width / 2}
          y={textY}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={textSize}
          letterSpacing="0.5"
          fill="#111113"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
