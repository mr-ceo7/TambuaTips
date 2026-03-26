import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function NewsCardSkeleton() {
  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-3 mb-8 sm:mb-12 animate-pulse">
      {/* Featured Articles - Takes 2 cols on md */}
      <div className="md:col-span-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-6 flex flex-col">
        {/* Header Area */}
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Search & Filter Area */}
        <div className="space-y-3 mb-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* Big Featured Image */}
        <div className="relative w-full min-h-[200px] sm:min-h-[240px] rounded-xl overflow-hidden mt-2">
          <Skeleton className="h-full w-full absolute inset-0 rounded-xl" />
          <div className="absolute bottom-4 left-4 right-4 z-10 space-y-3">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-3 mt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats/Side columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
