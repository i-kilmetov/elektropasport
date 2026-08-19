import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Щитток"
      className={cn(
        "inline-block aspect-[111/96] shrink-0 bg-current",
        onDark ? "text-white" : "text-zinc-950",
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
