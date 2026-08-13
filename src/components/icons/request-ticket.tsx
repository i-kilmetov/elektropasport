import { Check } from "lucide-react";

function barcodeWidths(value: string): number[] {
  return [...value].flatMap((char, index) => {
    const n = char.charCodeAt(0) + index * 3;
    return [1.5 + (n % 3), 1, 1 + ((n >> 2) % 2), 1.2];
  });
}

function tornTicketPath(width: number, height: number): string {
  const step = 10;
  const depth = 8;
  const right = width;
  const bottom = height;
  const radius = 14;

  let d = `M ${depth} 0`;
  d += ` H ${right - radius}`;
  d += ` Q ${right} 0 ${right} ${radius}`;
  d += ` V ${bottom - radius}`;
  d += ` Q ${right} ${bottom} ${right - radius} ${bottom}`;
  d += ` H ${depth}`;

  for (let y = bottom; y > 0; y -= step) {
    const mid = Math.max(0, y - step / 2);
    const next = Math.max(0, y - step);
    d += ` L 0 ${mid} L ${depth} ${next}`;
  }

  d += " Z";
  return d;
}

export function RequestTicket({ publicCode }: { publicCode: string }) {
  const bars = barcodeWidths(publicCode);
  const width = 236;
  const height = 118;

  return (
    <div className="relative mx-auto" style={{ width }}>
      <div className="absolute -right-1.5 -top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.35)]">
        <Check className="h-4 w-4" strokeWidth={2.6} />
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
        aria-hidden
      >
        <path
          d={tornTicketPath(width, height)}
          fill="#f4ead6"
          style={{ filter: "drop-shadow(0 10px 16px rgba(17,17,19,0.10))" }}
        />
      </svg>

      <div className="relative flex h-[118px] flex-col justify-center pl-7 pr-5">
        <div className="absolute bottom-3 top-3 left-[18px] border-l border-dashed border-zinc-400/55" />
        <div className="font-mono text-[28px] font-bold tracking-[0.08em] text-zinc-900">
          {publicCode}
        </div>
        <div className="mt-3 flex h-9 items-end gap-px overflow-hidden">
          {bars.map((barWidth, index) => (
            <span
              key={`${publicCode}-${index}`}
              className="shrink-0 bg-zinc-900"
              style={{
                width: barWidth,
                height: index % 5 === 0 ? "70%" : "100%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
