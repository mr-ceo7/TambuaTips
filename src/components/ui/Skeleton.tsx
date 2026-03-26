import React from 'react';
import { cn } from '../../lib/utils'; // Changed to match MatchCard's cn component path

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-800", className)}
      {...props}
    />
  );
}
