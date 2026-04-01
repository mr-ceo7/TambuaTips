import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { TrendingUp, Clock, ChevronDown, ChevronUp, Star, Activity, ShieldAlert, FileText, BarChart3, Share2, Bell, BellRing, PlusCircle } from 'lucide-react';
import { MatchTip } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../context/UserContext';
// Detached: import { useBetSlip } from '../context/BetSlipContext';
import { toast } from 'sonner';
import { TeamLogo } from './TeamLogo';

interface MatchCardProps {
  tip: MatchTip;
  key?: React.Key;
}

export function MatchCard({ tip }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { favoriteTeams, toggleFavoriteTeam, notifiedMatches, toggleMatchNotification } = useUser();
  // Detached: const { addSelection, selections } = useBetSlip();

  let dateStr = 'TBD';
  try {
    if (tip.matchDate) {
      dateStr = format(parseISO(tip.matchDate), 'MMM d, h:mm a');
    }
  } catch (e) {
    dateStr = tip.matchDate || 'TBD';
  }

  const isLive = tip.status === 'live';
  const isFinished = tip.status === 'finished';
  const isUpcoming = tip.status === 'upcoming';

  const isHomeFavorite = favoriteTeams.includes(tip.homeTeam);
  const isAwayFavorite = favoriteTeams.includes(tip.awayTeam);
  const isNotified = notifiedMatches.includes(tip.id.toString());
  // Detached: const isInBetSlip = selections.some(s => s.matchId === tip.id.toString());

  const handleShare = async () => {
    const text = `🔥 TambuaTips Prediction!\n⚽ ${tip.homeTeam} vs ${tip.awayTeam}\n✅ Tip: ${tip.prediction}\n💰 Odds: ${tip.odds?.[0]?.value || 'N/A'}\n\nGet more AI predictions at tambuatips.com`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TambuaTips Prediction',
          text: text,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Prediction copied to clipboard!');
    }
  };

  /* Detached: handleAddToBetSlip removed */

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl bg-[#0a0a0a] border border-zinc-800 shadow-2xl flex flex-col h-full hover:-translate-y-1 hover:shadow-emerald-500/10 transition-all duration-300"
    >
      {/* Top Bar - Broadcast style */}
      <div className="flex items-center justify-between bg-zinc-900 px-3 sm:px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 sm:gap-3 truncate">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 truncate">
            {tip.sport} <span className="text-zinc-600 px-1">•</span> {tip.league}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span className="hidden sm:inline">LIVE</span> {tip.elapsed ? `${tip.elapsed}'` : ''}
            </span>
          ) : isFinished ? (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              FT
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-zinc-400">
              <Clock className="h-3 w-3" />
              {dateStr}
            </span>
          )}
          {isUpcoming && (
            <button 
              onClick={() => toggleMatchNotification(tip.id.toString(), tip.homeTeam, tip.awayTeam)}
              className={cn("ml-1 sm:ml-2 transition-all p-1 hover:scale-110 active:scale-95", isNotified ? "text-emerald-400" : "text-zinc-500 hover:text-emerald-400")}
              title={isNotified ? "Remove Notification" : "Notify Me"}
            >
              {isNotified ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
          )}
          <button 
            onClick={handleShare}
            className="ml-1 sm:ml-2 text-zinc-500 hover:text-emerald-400 transition-all p-1 hover:scale-110 active:scale-95"
            title="Share Prediction"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scoreboard Area */}
      <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 sm:p-6 flex-1">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-full">
          <div className="flex-1 text-right min-w-0">
            <div className="flex items-center justify-end gap-2 mb-1">
              <button onClick={() => toggleFavoriteTeam(tip.homeTeam)} className="focus:outline-none hover:scale-110 active:scale-95 transition-transform">
                <Star className={cn("w-3 h-3 sm:w-4 sm:h-4 transition-colors", isHomeFavorite ? "fill-gold-400 text-gold-400" : "text-zinc-600 hover:text-gold-400")} />
              </button>
              <h3 className="text-sm sm:text-xl font-display font-bold text-white uppercase tracking-wide truncate" title={tip.homeTeam}>{tip.homeTeam}</h3>
              <TeamLogo teamName={tip.homeTeam} size={28} className="hidden sm:inline-flex" />
              <TeamLogo teamName={tip.homeTeam} size={20} className="sm:hidden" />
            </div>
            <div className="mt-1.5 flex justify-end gap-1">
              {tip.form?.home.split('-').map((res, i) => (
                <span key={i} className={cn(
                  "flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-[2px] text-[8px] sm:text-[9px] font-bold",
                  res === 'W' ? "bg-emerald-500/20 text-emerald-500" :
                  res === 'L' ? "bg-red-500/20 text-red-500" : "bg-zinc-500/20 text-zinc-400"
                )}>
                  {res}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex shrink-0 flex-col items-center justify-center px-2 sm:px-4">
            {(isLive || isFinished) && tip.score ? (
              <div className="text-xl sm:text-3xl font-bold text-led-gold text-gold-400 tracking-widest whitespace-nowrap">
                {tip.score}
              </div>
            ) : (
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-zinc-800/50 border border-zinc-700/50 text-xs sm:text-sm font-bold text-zinc-500">
                VS
              </div>
            )}
          </div>
          
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-start gap-2 mb-1">
              <TeamLogo teamName={tip.awayTeam} size={28} className="hidden sm:inline-flex" />
              <TeamLogo teamName={tip.awayTeam} size={20} className="sm:hidden" />
              <h3 className="text-sm sm:text-xl font-display font-bold text-white uppercase tracking-wide truncate" title={tip.awayTeam}>{tip.awayTeam}</h3>
              <button onClick={() => toggleFavoriteTeam(tip.awayTeam)} className="focus:outline-none hover:scale-110 active:scale-95 transition-transform">
                <Star className={cn("w-3 h-3 sm:w-4 sm:h-4 transition-colors", isAwayFavorite ? "fill-gold-400 text-gold-400" : "text-zinc-600 hover:text-gold-400")} />
              </button>
            </div>
            <div className="mt-1.5 flex justify-start gap-1">
              {tip.form?.away.split('-').map((res, i) => (
                <span key={i} className={cn(
                  "flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-[2px] text-[8px] sm:text-[9px] font-bold",
                  res === 'W' ? "bg-emerald-500/20 text-emerald-500" :
                  res === 'L' ? "bg-red-500/20 text-red-500" : "bg-zinc-500/20 text-zinc-400"
                )}>
                  {res}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tip & Odds Section */}
      <div className="border-t border-zinc-800/50 bg-zinc-950 p-4 mt-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-emerald-400 uppercase tracking-wide text-xs sm:text-sm">Expert Tip</span>
              </div>
              <div className="flex items-center gap-1 sm:hidden">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn("h-3 w-3", i < tip.confidenceStars ? "fill-gold-500 text-gold-500" : "fill-zinc-800 text-zinc-800")} 
                  />
                ))}
              </div>
            </div>
            <p className="text-base sm:text-lg font-bold text-white">{tip.prediction}</p>
          </div>
          
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start border-t sm:border-t-0 border-zinc-800/50 pt-3 sm:pt-0 mt-1 sm:mt-0 gap-2 sm:gap-0">
            <div className="hidden sm:flex items-center gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={cn("h-3.5 w-3.5", i < tip.confidenceStars ? "fill-gold-500 text-gold-500" : "fill-zinc-800 text-zinc-800")} 
                />
              ))}
            </div>
            {/* Detached: Odds value and Add To Bet Slip button */}
          </div>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex w-full items-center justify-center gap-1 border-t border-zinc-800/50 pt-3 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors hover:bg-zinc-900/50 rounded-b-xl pb-2"
        >
          {expanded ? 'Hide Details' : (isUpcoming ? 'View Match Preview' : 'View Deep Dive')}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded Analysis */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-zinc-900/50 border-t border-zinc-800"
          >
            <div className="p-4 space-y-5">
              {isUpcoming ? (
                <div className="bg-zinc-950/50 rounded-xl p-3 sm:p-4 border border-zinc-800/50">
                  <h4 className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2 sm:mb-3">
                    <FileText className="w-4 h-4" />
                    Match Preview
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4 sm:mb-5">
                    {tip.reasoning}
                  </p>
                  
                  {tip.keyStats && tip.keyStats.length > 0 && (
                    <div className="mb-4 sm:mb-5">
                      <h5 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" /> Key Stats
                      </h5>
                      <ul className="space-y-2">
                        {tip.keyStats.map((stat, i) => (
                           <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-400">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            <span>{stat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {tip.homeStats && tip.awayStats && (
                    <div className="mb-4 sm:mb-5">
                      <h5 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" /> Team Statistics
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="space-y-2">
                          <div className="font-bold text-zinc-300 truncate px-1">{tip.homeTeam}</div>
                          <div className="bg-zinc-900 rounded py-1.5 border border-zinc-800">
                            <span className="block text-[10px] text-zinc-500 mb-0.5">Avg Scored</span>
                            <span className="font-mono text-emerald-400">{tip.homeStats.avgGoalsScored}</span>
                          </div>
                          <div className="bg-zinc-900 rounded py-1.5 border border-zinc-800">
                            <span className="block text-[10px] text-zinc-500 mb-0.5">Avg Conceded</span>
                            <span className="font-mono text-red-400">{tip.homeStats.avgGoalsConceded}</span>
                          </div>
                          <div className="bg-zinc-900 rounded py-1.5 border border-zinc-800">
                            <span className="block text-[10px] text-zinc-500 mb-0.5">Clean Sheets</span>
                            <span className="font-mono text-blue-400">{tip.homeStats.cleanSheets}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                          VS
                        </div>
                        <div className="space-y-2">
                          <div className="font-bold text-zinc-300 truncate px-1">{tip.awayTeam}</div>
                          <div className="bg-zinc-900 rounded py-1.5 border border-zinc-800">
                            <span className="block text-[10px] text-zinc-500 mb-0.5">Avg Scored</span>
                            <span className="font-mono text-emerald-400">{tip.awayStats.avgGoalsScored}</span>
                          </div>
                          <div className="bg-zinc-900 rounded py-1.5 border border-zinc-800">
                            <span className="block text-[10px] text-zinc-500 mb-0.5">Avg Conceded</span>
                            <span className="font-mono text-red-400">{tip.awayStats.avgGoalsConceded}</span>
                          </div>
                          <div className="bg-zinc-900 rounded py-1.5 border border-zinc-800">
                            <span className="block text-[10px] text-zinc-500 mb-0.5">Clean Sheets</span>
                            <span className="font-mono text-blue-400">{tip.awayStats.cleanSheets}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h5 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Head-to-Head
                    </h5>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      {tip.h2h}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                      <Activity className="h-3 w-3" /> Tactical Analysis
                    </h4>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {tip.reasoning}
                    </p>
                  </div>
                  
                  {tip.h2h && (
                    <div className="rounded bg-zinc-950/50 p-3 border border-zinc-800/50">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Head to Head</span>
                      <p className="text-xs text-zinc-400">{tip.h2h}</p>
                    </div>
                  )}
                </>
              )}

              {/* Detached: Odds Comparison block */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


