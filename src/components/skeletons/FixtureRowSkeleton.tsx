import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function FixtureRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/40 animate-pulse">
      <div className="w-14 text-center shrink-0">
        <Skeleton className="h-4 w-10 mx-auto" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="text-right shrink-0">
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="w-4 h-4 rounded-full shrink-0 ml-2" />
    </div>
  );
}
