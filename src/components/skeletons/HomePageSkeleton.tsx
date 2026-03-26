import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { NewsCardSkeleton } from './NewsCardSkeleton';
import { FixtureRowSkeleton } from './FixtureRowSkeleton';

export function HomePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl animate-pulse">
      {/* League Filter */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Live Scoreboard */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-56 rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-8 gap-6">
        <section className="order-1 lg:col-span-2">
          <Skeleton className="h-20 w-full rounded-xl" />
        </section>

        <section className="order-2 lg:col-span-2">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-[280px] sm:h-[360px] w-full rounded-2xl" />
        </section>

        <section className="order-3 lg:col-span-2">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-800">
            <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
              <Skeleton className="h-4 w-24" />
            </div>
            {[1, 2, 3].map((i) => (
              <FixtureRowSkeleton key={i} />
            ))}
          </div>
        </section>

        <div className="order-4 lg:order-2 lg:col-span-1 lg:row-span-3 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
