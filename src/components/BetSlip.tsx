import React, { useState } from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { X, Trash2, Receipt, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function BetSlip() {
  const { selections, removeSelection, clearSlip, isSlipOpen, setIsSlipOpen } = useBetSlip();
  const [stake, setStake] = useState<string>('10');

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const potentialPayout = parseFloat(stake || '0') * totalOdds;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isSlipOpen && selections.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsSlipOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95"
          >
            <Receipt className="h-6 w-6" />
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white border-2 border-zinc-950">
              {selections.length}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bet Slip Drawer */}
      <AnimatePresence>
        {isSlipOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSlipOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 p-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-500" />
                  <h2 className="font-display text-lg font-bold text-white">Bet Slip</h2>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    {selections.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsSlipOpen(false)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all hover:scale-110 active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selections.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                    <Receipt className="mb-4 h-12 w-12 opacity-20" />
                    <p>Your bet slip is empty</p>
                    <p className="text-sm">Add selections to build your accumulator</p>
                  </div>
                ) : (
                  selections.map((sel) => (
                    <div key={sel.id} className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                            {sel.homeTeam} vs {sel.awayTeam}
                          </p>
                          <p className="font-bold text-white">{sel.prediction}</p>
                          <p className="text-[10px] text-zinc-400 mt-1">Odds from {sel.bookmaker}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => removeSelection(sel.id)}
                            className="text-zinc-500 hover:text-red-400 transition-all hover:scale-110 active:scale-95"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <span className="font-mono font-bold text-emerald-400">{sel.odds.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selections.length > 0 && (
                <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Total Odds</span>
                    <span className="font-mono font-bold text-emerald-400">{totalOdds.toFixed(2)}</span>
                  </div>
                  
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Stake Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                      <input
                        type="number"
                        min="0"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-7 pr-3 font-mono text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="mb-6 flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20">
                    <span className="font-bold text-emerald-500">Potential Payout</span>
                    <span className="font-mono text-lg font-bold text-emerald-400">
                      ${potentialPayout.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearSlip}
                      className="rounded-lg border border-zinc-800 px-4 py-3 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all hover:scale-105 active:scale-95"
                    >
                      Clear
                    </button>
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20">
                      Place Bet <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
