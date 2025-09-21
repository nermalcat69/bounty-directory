import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
    />
  );
}

// Specific skeleton components for different UI elements
export function BountyCardSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function BountyListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <BountyCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="text-center mb-8 space-y-4">
      {/* Title skeleton */}
      <Skeleton className="h-6 w-96 mx-auto" />
      
      {/* Bounty amount skeleton */}
      <div className="flex justify-center items-center space-x-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Description skeleton */}
      <div className="space-y-2 max-w-[620px] mx-auto">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="mb-6 space-y-4">
      {/* Title skeleton */}
      <Skeleton className="h-8 w-48" />
      
      {/* Filter buttons skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20" />
        ))}
      </div>
      
      {/* Search and sort skeleton */}
      <div className="flex gap-4 items-center">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex justify-center min-h-screen w-full md:px-0 px-6 mt-[10%]">
      <div className="w-full max-w-6xl space-y-8">
        <HeroSkeleton />
        <FiltersSkeleton />
        <BountyListSkeleton />
      </div>
    </div>
  );
}