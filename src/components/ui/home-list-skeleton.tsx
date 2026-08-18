import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-zinc-200/90", className)} />
  );
}

function HomeCardSkeleton() {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_1px_1px_rgba(17,17,19,0.04),0_2px_6px_rgba(17,17,19,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <SkeletonBar className="h-14 w-14 shrink-0 rounded-[16px]" />
        <SkeletonBar className="h-5 w-14 rounded-full" />
      </div>
      <SkeletonBar className="mb-2 h-4 w-[58%]" />
      <SkeletonBar className="mb-3 h-3 w-[78%]" />
      <div className="flex gap-1.5">
        <SkeletonBar className="h-6 w-16 rounded-full" />
        <SkeletonBar className="h-6 w-14 rounded-full" />
        <SkeletonBar className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function HomeScreenSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-[24px] bg-white p-4">
        <div className="flex items-center gap-3.5">
          <SkeletonBar className="h-[72px] w-[72px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-4 w-[72%]" />
            <SkeletonBar className="h-3 w-[48%]" />
            <SkeletonBar className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div>
        <SkeletonBar className="mb-2.5 h-4 w-16" />
        <div className="space-y-3">
          <HomeCardSkeleton />
          <HomeCardSkeleton />
        </div>
      </div>
      <div>
        <SkeletonBar className="mb-2.5 h-4 w-20" />
        <HomeCardSkeleton />
      </div>
    </div>
  );
}

export function HomeListCardSkeleton() {
  return <HomeCardSkeleton />;
}

export function HomeListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <HomeCardSkeleton key={i} />
      ))}
    </div>
  );
}
