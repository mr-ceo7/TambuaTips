import React from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { X, Trash2, HelpCircle, ExternalLink, Calculator, Target } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function BetSlipDrawer() {
  const { 
    selections, 
    removeSelection, 
    clearSlip, 
    isSlipOpen, 
    setIsSlipOpen, 
    stake, 
    setStake, 
    totalOdds, 
    potentialReturn 
  } = useBetSlip();

  if (!isSlipOpen && selections.length === 0) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSlipOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
            onClick={() => setIsSlipOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Toggle Button (visible when closed but has selections) */}
      <AnimatePresence>
        {!isSlipOpen && selections.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsSlipOpen(true)}
            className="fixed bottom-6 right-6 z-[80] h-14 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-full shadow-2xl shadow-emerald-500/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            <Calculator className="w-5 h-5" />
            <span className="flex flex-col items-start leading-none">
              <span className="text-xs opacity-80">Bet Slip</span>
              <span className="text-sm">{selections.length} Pick{selections.length !== 1 ? 's' : ''}</span>
            </span>
            <span className="bg-zinc-950 text-emerald-400 px-2 py-1 rounded text-sm font-mono tracking-tighter ml-2">
              {totalOdds.toFixed(2)}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isSlipOpen && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-[100] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold font-display uppercase tracking-wider text-white">Bet Slip</h2>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
                  Simulator
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selections.length > 0 && (
                  <button 
                    onClick={clearSlip}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors tooltip-trigger relative group delay-75"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="absolute -bottom-8 right-0 bg-zinc-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-medium shadow-xl">
                      Clear All
                    </span>
                  </button>
                )}
                <button 
                  onClick={() => setIsSlipOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex items-start gap-2 text-amber-500/90 text-xs leading-relaxed">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                <strong>This is a Simulator Tool.</strong> TambuaTips is not a betting site. Build your slip here to calculate returns, then click export below to place your real bet on official bookmakers.
              </p>
            </div>

            {/* Selections List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {selections.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-4 px-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">Your slip is empty</p>
                  <p className="text-xs">Browse matches and tap on the odds to add selections to your simulator slip.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {selections.map((sel) => (
                    <motion.div 
                      key={sel.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative group overflow-hidden"
                    >
                      <button 
                        onClick={() => removeSelection(sel.id)}
                        className="absolute top-2 right-2 p-1.5 bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded transition-colors z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      
                      <div className="pr-8">
                        <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {sel.matchName}
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <div>
                            <div className="text-sm font-bold text-zinc-200">{sel.selection}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap max-w-[140px]">{sel.market}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono font-bold text-emerald-400">@{sel.odds.toFixed(2)}</span>
                            {sel.bookmaker && <div className="text-[10px] text-zinc-600 mt-1 uppercase">{sel.bookmaker}</div>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer / Calculator */}
            {selections.length > 0 && (
              <div className="bg-zinc-900 border-t border-zinc-800 p-4 sm:p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-zinc-400 font-medium">Total Multi-Bet Odds</span>
                  <span className="text-xl font-display font-bold text-white tracking-tight">{totalOdds.toFixed(2)}</span>
                </div>
                
                <div className="mb-5">
                  <label htmlFor="stake" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Simulated Stake Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">KES</span>
                    <input 
                      type="number" 
                      id="stake"
                      value={stake || ''}
                      onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white font-bold font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Input stake..."
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <span className="text-sm text-emerald-400 font-medium tracking-wide">Potential Payout</span>
                  <span className="text-xl font-display font-bold text-emerald-400 tracking-tight">KES {potentialReturn.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-bold">Export to Bookmaker</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a 
                      href="https://www.betika.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-[#00A550]/10 text-[#00A550] border border-[#00A550]/30 hover:bg-[#00A550] hover:text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-wide group"
                    >
                      Betika <ExternalLink className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <a 
                      href="https://www.sportpesa.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-[#013589]/10 text-[#2B6CC4] border border-[#2B6CC4]/30 hover:bg-[#013589] hover:text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-wide group"
                    >
                      SportPesa <ExternalLink className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                  <a 
                    href="https://www.betway.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1.5 w-full py-2.5 mt-2 bg-black text-white border border-zinc-800 hover:bg-zinc-800 rounded-xl transition-colors text-xs font-bold uppercase tracking-wide group"
                  >
                    Betway <ExternalLink className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
