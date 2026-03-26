import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function MatchDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-3xl animate-pulse">
      {/* Back link */}
      <Skeleton className="h-4 w-32 mb-6" />

      {/* Match Header Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-center mb-4">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="text-center mb-6 flex justify-center">
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-10">
          <div className="flex-1 flex flex-col items-center">
            <Skeleton className="w-16 h-16 sm:w-24 sm:h-24 rounded-full mb-3" />
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>

          <div className="flex-shrink-0 text-center px-2">
            <Skeleton className="h-10 w-16 sm:w-20" />
          </div>

          <div className="flex-1 flex flex-col items-center">
            <Skeleton className="w-16 h-16 sm:w-24 sm:h-24 rounded-full mb-3" />
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <Skeleton className="h-6 w-48 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-zinc-900/60 border border-zinc-800 rounded-xl p-1.5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 flex-1 min-w-[100px] rounded-lg" />
        ))}
      </div>

      {/* Content Area skeleton (looks like preview tab) */}
      <div className="space-y-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex gap-3">
          <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5" />
          <div className="space-y-2 flex-full w-full">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
