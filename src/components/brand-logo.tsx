import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  imgClassName,
  alt = "Щитток",
}: {
  className?: string;
  imgClassName?: string;
  alt?: string;
}) {
  return (
    <div className={cn("aspect-[111/96] overflow-hidden bg-black", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={alt}
        className={cn("h-full w-full object-contain", imgClassName)}
      />
    </div>
  );
}
