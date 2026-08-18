import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

function SkeletonBar({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/80",
        className,
      )}
    />
  );
}

export function HomeListCardSkeleton() {
  return (
    <GlassCard className="flex items-start gap-3 p-4">
      <SkeletonBar className="h-12 w-12 shrink-0 rounded-[16px]" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <SkeletonBar className="h-4 w-[58%]" />
        <SkeletonBar className="h-3 w-[82%]" />
        <SkeletonBar className="h-3 w-[44%]" />
      </div>
    </GlassCard>
  );
}

export function HomeListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <HomeListCardSkeleton key={i} />
      ))}
    </div>
  );
}
