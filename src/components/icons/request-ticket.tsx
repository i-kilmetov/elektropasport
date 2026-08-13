import { Check } from "lucide-react";

function barcodeWidths(value: string): number[] {
  return [...value].flatMap((char, index) => {
    const n = char.charCodeAt(0) + index * 3;
    return [1.5 + (n % 3), 1, 1 + ((n >> 2) % 2), 1.2];
  });
}

export function RequestTicket({ publicCode }: { publicCode: string }) {
  const bars = barcodeWidths(publicCode);

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <div className="relative overflow-hidden rounded-[22px] border border-black/8 bg-[#fffdf6] shadow-[0_10px_28px_rgba(17,17,19,0.08)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-3 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 10px, rgba(17,17,19,0.06) 10px 12px)",
          }}
        />
        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
          <Check className="h-4 w-4" strokeWidth={2.6} />
        </div>
        <div className="px-5 pb-3 pt-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
            Электропаспорт
          </div>
          <div className="mt-2 font-mono text-[28px] font-bold tracking-[0.08em] text-zinc-900">
            {publicCode}
          </div>
          <div className="mt-3 flex h-11 items-end gap-px overflow-hidden">
            {bars.map((width, index) => (
              <span
                key={`${publicCode}-${index}`}
                className="shrink-0 bg-zinc-900"
                style={{
                  width,
                  height: index % 5 === 0 ? "72%" : "100%",
                }}
              />
            ))}
          </div>
        </div>
        <div
          className="h-4 bg-[#fffdf6]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12px 16px, var(--bg) 6px, transparent 6.5px)",
            backgroundSize: "24px 16px",
            backgroundRepeat: "repeat-x",
          }}
        />
      </div>
    </div>
  );
}
