import { Skeleton } from '@usertour-packages/skeleton';

// Skeleton for the main navigation tabs
export const ContentDetailHeaderNavSkeleton = () => {
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 lg:gap-x-6 lg:mx-6">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-4 w-16" />
      ))}
    </nav>
  );
};

// Main skeleton for ContentDetailHeader
export const ContentDetailHeaderSkeleton = () => {
  return (
    <div className="border-b bg-white w-full z-10 lg:sticky lg:top-0">
      <div className="flex flex-wrap min-h-16 items-center gap-x-4 gap-y-2 px-4 py-2">
        {/* Back arrow skeleton */}
        <Skeleton className="h-6 w-8 sm:ml-4" />

        {/* Content name skeleton */}
        <Skeleton className="h-5 w-40 max-w-full" />

        {/* Edit button skeleton */}
        <Skeleton className="h-8 w-8 ml-2" />

        {/* Navigation tabs skeleton */}
        <ContentDetailHeaderNavSkeleton />

        {/* Right side actions skeleton */}
        <div className="ml-auto flex flex-wrap items-center gap-2 lg:gap-4">
          {/* Autosave/Published text skeleton */}
          <div className="px-1 text-sm text-muted-foreground lg:min-w-60 lg:text-right">
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>

          {/* Edit In Builder button skeleton */}
          <Skeleton className="h-9 w-32" />

          {/* Publish button skeleton */}
          <Skeleton className="h-9 w-20" />

          {/* Actions dropdown skeleton */}
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>
    </div>
  );
};
