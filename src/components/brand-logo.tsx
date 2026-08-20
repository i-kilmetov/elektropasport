import { cn } from "@/lib/utils";

export const BRAND_YELLOW = "#D3DA00";

export function BrandLogo({
  className,
  onDark = false,
}: {
  className?: string;
  /** Black background → brand yellow. Light / brand-yellow background → black. */
  onDark?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Током"
      className={cn(
        "inline-block aspect-[136/34] shrink-0 bg-current",
        onDark ? "text-[#D3DA00]" : "text-zinc-950",
        className,
      )}
      style={{
        WebkitMaskImage: "url(/logo.png)",
        maskImage: "url(/logo.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
