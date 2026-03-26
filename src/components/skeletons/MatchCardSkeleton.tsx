import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function MatchCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-[#0a0a0a] border border-zinc-800 shadow-2xl flex flex-col h-full animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between bg-zinc-900 px-3 sm:px-4 py-3 border-b border-zinc-800">
        <Skeleton className="h-4 w-24 sm:w-32" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Scoreboard Area Skeleton */}
      <div className="px-5 py-4 bg-linear-to-b from-zinc-900 to-zinc-900/40 border-b border-zinc-800/50 flex items-center justify-between gap-2 sm:gap-4 h-full">
          <div className="flex-1 flex flex-col items-end gap-2">
            <Skeleton className="h-5 w-20 sm:w-28" />
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-3 w-3 sm:h-4 sm:w-4 rounded-[2px]" />
              ))}
            </div>
          </div>
          
          <div className="flex shrink-0 flex-col items-center justify-center px-2 sm:px-4">
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
          </div>
          
          <div className="flex-1 flex flex-col items-start gap-2">
            <Skeleton className="h-5 w-20 sm:w-28" />
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-3 w-3 sm:h-4 sm:w-4 rounded-[2px]" />
              ))}
            </div>
          </div>
        </div>

      {/* Tip & Odds Section Skeleton */}
      <div className="border-t border-zinc-800/50 bg-zinc-950 p-4 mt-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="hidden sm:flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-3.5 w-3.5" />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-800/50 pt-3 flex justify-center">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
