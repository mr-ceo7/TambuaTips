import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function StandingsSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl animate-pulse">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 px-4 py-3 flex justify-center border-r border-zinc-800/50 last:border-0">
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Table Content */}
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/30 border-b border-zinc-800/50">
            <tr>
              <th className="px-4 py-3 w-12"><Skeleton className="h-4 w-4" /></th>
              <th className="px-2 py-3"><Skeleton className="h-4 w-24" /></th>
              <th className="px-2 py-3 w-10"><Skeleton className="h-4 w-4" /></th>
              <th className="px-2 py-3 w-12"><Skeleton className="h-4 w-6" /></th>
              <th className="px-4 py-3 w-12"><Skeleton className="h-4 w-6" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {[...Array(10)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </td>
                <td className="px-2 py-3 text-center"><Skeleton className="h-4 w-4" /></td>
                <td className="px-2 py-3 text-center"><Skeleton className="h-4 w-6" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-6" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-zinc-800/50 flex justify-center">
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}
