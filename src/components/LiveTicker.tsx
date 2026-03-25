import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

const recentWins = [
  "✅ Arsenal vs Chelsea — Over 2.5 WON (1.85 odds)",
  "✅ Lakers vs Warriors — Lakers -4.5 WON (1.90 odds)",
  "✅ Real Madrid vs Barcelona — BTTS WON (1.75 odds)",
  "✅ Djokovic vs Alcaraz — Over 3.5 Sets WON (2.10 odds)",
  "✅ Man City vs Liverpool — Home Win WON (2.05 odds)",
];

export function LiveTicker() {
  return (
    <div className="w-full bg-zinc-950 border-y border-zinc-800 py-1.5 sm:py-2 overflow-hidden flex items-center">
      <div className="bg-emerald-500 text-zinc-950 font-bold px-2 sm:px-4 py-1 text-[10px] sm:text-sm z-10 shrink-0 flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-zinc-950"></span>
        </span>
        Live Results
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center">
        <motion.div
          className="flex whitespace-nowrap gap-4 sm:gap-8 px-2 sm:px-4"
          animate={{ x: [0, -1000] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20,
          }}
        >
          {recentWins.concat(recentWins).map((win, i) => (
            <span key={i} className="text-xs sm:text-sm font-medium text-zinc-300 flex items-center gap-2">
               {win}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
