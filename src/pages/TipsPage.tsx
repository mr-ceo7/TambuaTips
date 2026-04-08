import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Lock, Star, Trophy, Crown, ChevronRight, Target, Plus, Check, Eye, AlertTriangle, X, Gift, Clock } from 'lucide-react';
import { TeamWithLogo, LeagueLogo } from '../components/TeamLogo';
import { ReferralWidget } from '../components/ReferralWidget';
import { ReferralModal } from '../components/ReferralModal';
import { getFreeTips, getPremiumTips, getTipsByCategory, getTipStats, getAllJackpots, getJackpotBundleInfo, type Tip, type TipCategory, type JackpotPrediction, type JackpotBundleInfo } from '../services/tipsService';
import { CATEGORY_LABELS, getPricingTiers, type TierConfig } from '../services/pricingService';
import { SEO } from '../components/SEO';
import { useUser } from '../context/UserContext';
// Detached: import { useBetSlip } from '../context/BetSlipContext';
import { format, parseISO } from 'date-fns';

// ─── Category order for display ──────────────────────────────
const CATEGORY_ORDER: TipCategory[] = ['free', '2+', '4+', 'gg', '10+', 'vip'];
const CATEGORY_ICONS: Record<TipCategory, React.ElementType> = {
  'free': Zap,
  '2+': Target,
  '4+': Star,
  'gg': Trophy,
  '10+': Crown,
  'vip': Crown,
};

// ─── Tip Card ────────────────────────────────────────────────
function TipCard({ tip, locked = false, onGetFree }: { tip: Tip; locked?: boolean; key?: React.Key; onGetFree?: () => void }) {
  const { user, setShowAuthModal, setShowPricingModal, hasAccess } = useUser();
  // Detached: const { addSelection, selections } = useBetSlip();
  const [addedBookmaker, setAddedBookmaker] = useState<string | null>(null);

  // Detached: const isInSlip = selections.some(s => s.fixtureId === tip.fixtureId);

  const handleUnlock = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) setShowAuthModal(true);
    else setShowPricingModal(true, tip.category);
  };

  /* Detached: handleAddToSlip and bestOdds logic */

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:-translate-y-1 ${
      locked 
        ? 'bg-zinc-900/60 border-zinc-800 hover:shadow-lg hover:shadow-gold-500/5' 
        : 'bg-emerald-500/5 border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <LeagueLogo leagueName={tip.league} size={20} />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">{tip.league}</span>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 ${
          tip.category?.toLowerCase() === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
          tip.category?.toLowerCase() === 'vip' ? 'bg-gold-500/20 text-gold-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {CATEGORY_LABELS[tip.category]?.label || tip.category}
        </span>
      </div>

      {/* Teams */}
      <Link to={`/match/${tip.fixtureId}`} className="block mb-3 group">
        <div className="flex items-center gap-2 text-base font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
          <TeamWithLogo teamName={tip.homeTeam} size={22} textClassName="font-bold" />
          <span className="text-zinc-500 text-sm">vs</span>
          <TeamWithLogo teamName={tip.awayTeam} size={22} textClassName="font-bold" />
        </div>
        <p className="text-xs text-zinc-500">{new Date(tip.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </Link>

      {/* Prediction */}
      <div className="relative group/tip">
        {locked ? (
          <div className="relative">
            {/* Blurred Prediction Preview — Completely secure, data is not even sent from the backend */}
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 mb-3 blur-sm select-none pointer-events-none">
              <div className="flex items-center justify-between mb-2">
                {/* We render a randomized placeholder to ensure character count leakage is impossible */}
                <span className="text-sm font-bold text-zinc-700 tracking-widest">
                  {tip.prediction.split('').map(() => '•').join('')}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-20">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-zinc-700" />
                ))}
              </div>
            </div>

            {/* Action Buttons Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 rounded-xl border border-zinc-800/50 gap-2 px-3">
              <button 
                onClick={handleUnlock}
                className="flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 transition-all group/eye"
              >
                <div className="p-1.5 rounded-full bg-gold-500/20 text-gold-400 group-hover/eye:scale-110 transition-all mb-1">
                  <Eye className="w-4 h-4" />
                </div>
                <p className="text-[9px] text-gold-400 font-bold uppercase tracking-wider">
                  Unlock
                </p>
              </button>
              {onGetFree && (
                <button 
                  onClick={(e) => { e.preventDefault(); onGetFree(); }}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all group/free"
                >
                  <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 group-hover/free:scale-110 transition-all mb-1">
                    <Gift className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                    Get Free
                  </p>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Prediction & confidence */}
            <div className="bg-zinc-950/50 border border-emerald-500/10 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-emerald-400">{tip.prediction}</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < tip.confidence ? 'text-gold-400 fill-gold-400' : 'text-zinc-700'}`} />
                ))}
              </div>
            </div>

            {/* Detached: Multi-bookmaker odds block */}

            {tip.reasoning && (
              <p className="text-xs text-zinc-400 leading-relaxed">{tip.reasoning}</p>
            )}
            {tip.result !== 'pending' && (
              <div className={`mt-3 px-4 py-2.5 rounded-xl text-center uppercase font-display tracking-wider ${
                tip.result === 'won' ? 'bg-emerald-500/20 text-emerald-400 text-lg font-black animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/30' :
                tip.result === 'lost' ? 'bg-red-500/20 text-red-400 text-xs font-bold' :
                'bg-zinc-800 text-zinc-400 text-xs font-bold'
              }`}>
                {tip.result === 'won' ? '🎉 WIN!' : tip.result}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Jackpot Card ────────────────────────────────────────────
function JackpotCard({ jackpot, onGetFree }: { jackpot: JackpotPrediction; key?: React.Key; onGetFree?: () => void }) {
  const { user, setShowAuthModal, setSelectedJackpot, setShowJackpotModal } = useUser();
  const isUnlocked = !jackpot.locked;
  const variationCount = jackpot.variations?.length || jackpot.variation_count || 0;

  const handlePurchase = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setSelectedJackpot(jackpot);
      setShowJackpotModal(true);
    }
  };

  const resultBadge = jackpot.result && jackpot.result !== 'pending' ? jackpot.result : null;

  return (
    <div className={`bg-zinc-900/60 border rounded-2xl overflow-hidden transition-all ${
      resultBadge === 'won' ? 'border-emerald-500/40' :
      resultBadge === 'lost' ? 'border-red-500/40' :
      resultBadge === 'bonus' ? 'border-yellow-500/40' :
      resultBadge === 'postponed' ? 'border-orange-500/40' :
      'border-zinc-800'
    }`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              resultBadge === 'won' ? 'bg-emerald-500/20' :
              resultBadge === 'lost' ? 'bg-red-500/20' :
              'bg-gold-500/20'
            }`}>
              <Trophy className={`w-6 h-6 ${
                resultBadge === 'won' ? 'text-emerald-400' :
                resultBadge === 'lost' ? 'text-red-400' :
                'text-gold-400'
              }`} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white uppercase tracking-wide">
                {jackpot.type === 'midweek' ? 'Midweek Jackpot' : 'Mega Jackpot'}
              </h4>
              <p className="text-xs text-zinc-400 font-medium">
                {jackpot.type === 'midweek' ? '13 Matches' : '17 Matches'} • <span className="text-gold-400 font-bold">{jackpot.dcLevel === 99 ? 'ALL ' : jackpot.dcLevel}DC</span> • {variationCount} Variation{variationCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            {resultBadge && (
              <span className={`block text-[10px] font-black uppercase tracking-wider mb-1 px-2.5 py-0.5 rounded-full ${
                resultBadge === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                resultBadge === 'lost' ? 'bg-red-500/20 text-red-400' :
                resultBadge === 'bonus' ? 'bg-yellow-500/20 text-yellow-400' :
                resultBadge === 'postponed' ? 'bg-orange-500/20 text-orange-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>{resultBadge}</span>
            )}
            <span className="text-lg font-bold text-gold-400">{jackpot.currency_symbol || 'KES'} {jackpot.price.toLocaleString(undefined, {minimumFractionDigits: jackpot.price % 1 !== 0 ? 2 : 0})}</span>
          </div>
        </div>

        {jackpot.price === 0 ? (
          <p className="text-sm text-zinc-400 mb-4">
            FREE prediction with <span className="text-gold-400 font-semibold">ALL</span> Double Chances to guide you
          </p>
        ) : (
          <p className="text-sm text-zinc-400 mb-4">
            <span className="text-white font-semibold">{variationCount}</span> prediction{variationCount !== 1 ? 's' : ''} with <span className="text-gold-400 font-semibold">{jackpot.dcLevel === 99 ? 'ALL' : jackpot.dcLevel}</span> Double Chances
          </p>
        )}

        {/* Locked/Unlocked Content */}
        {isUnlocked && jackpot.variations && jackpot.variations.length > 0 ? (
          <div className="bg-zinc-950/50 border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900 z-10">
                  <tr className="border-b border-zinc-800">
                    <th className="px-2.5 py-2 text-left text-zinc-500 font-bold uppercase tracking-wider w-7">#</th>
                    <th className="px-2.5 py-2 text-left text-zinc-500 font-bold uppercase tracking-wider">Match</th>
                    {jackpot.variations.map((_, vi) => (
                      <th key={vi} className="px-2 py-2 text-center text-gold-400 font-bold uppercase tracking-wider w-12">V{vi + 1}</th>
                    ))}
                    <th className="px-2 py-2 text-center text-zinc-500 font-bold uppercase tracking-wider w-16">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {jackpot.matches.map((m, idx) => (
                    <tr key={idx} className={`border-b border-zinc-800/50 last:border-0 ${
                      m.result === 'won' ? 'bg-emerald-500/5' : m.result === 'lost' ? 'bg-red-500/5' : m.result === 'postponed' ? 'bg-orange-500/5' : ''
                    }`}>
                      <td className="px-2.5 py-1.5 text-zinc-500 font-mono">{idx + 1}</td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex flex-col gap-0.5">
                          {(m.country || m.matchDate) && (
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              {m.country && m.countryFlag && (
                                m.countryFlag.startsWith('http') 
                                  ? <img src={m.countryFlag} alt={m.country} className="w-3.5 h-2.5 object-cover rounded-[2px]" />
                                  : <span className="text-xs">{m.countryFlag}</span>
                              )}
                              {m.country && <span>{m.country}</span>}
                              {m.country && m.matchDate && <span className="mx-0.5 opacity-50">•</span>}
                              {m.matchDate && (
                                <span className="text-zinc-400 font-mono flex items-center gap-0.5" title="Kickoff Time">
                                  <Clock className="w-2.5 h-2.5" />
                                  {(() => {
                                    try {
                                      return format(parseISO(m.matchDate), 'HH:mm');
                                    } catch {
                                      return String(m.matchDate).split('T')[1]?.substring(0,5) || String(m.matchDate);
                                    }
                                  })()}
                                </span>
                              )}
                            </span>
                          )}
                          <span className="text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                            <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-xs" />
                            <span className="text-zinc-600 mx-0.5">vs</span>
                            <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-xs" />
                          </span>
                        </div>
                      </td>
                      {jackpot.variations.map((v, vi) => (
                        <td key={vi} className="px-2 py-1.5 text-center">
                          <span className="font-mono font-bold text-emerald-400 text-sm">{v[idx] || '-'}</span>
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        {m.result === 'won' ? (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase">Won</span>
                        ) : m.result === 'lost' ? (
                          <span className="text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full uppercase">Lost</span>
                        ) : m.result === 'postponed' ? (
                          <span className="text-[10px] font-black text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full uppercase">PPD</span>
                        ) : (
                          <span className="text-[10px] text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : isUnlocked ? (
          <div className="bg-zinc-950/50 border border-emerald-500/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-zinc-500">No variations added yet.</p>
          </div>
        ) : (
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-5 mb-4 text-center">
            <Lock className="w-7 h-7 text-gold-400/40 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {jackpot.match_count || jackpot.matches?.length || 0} matches • {variationCount} variations locked
            </p>
          </div>
        )}

        {!isUnlocked && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handlePurchase}
              className="flex-1 py-3 bg-gold-500 text-zinc-950 font-bold rounded-xl text-sm hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
            >
              Unlock {jackpot.currency_symbol || 'KES'} {jackpot.price.toLocaleString(undefined, {minimumFractionDigits: jackpot.price % 1 !== 0 ? 2 : 0})}
            </button>
            {onGetFree && (
              <button 
                onClick={(e) => { e.preventDefault(); onGetFree(); }}
                className="flex-1 py-3 flex items-center justify-center gap-1.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Gift className="w-4 h-4" />
                Get Free
              </button>
            )}
          </div>
        )}
        
        {isUnlocked && (
          <div className="w-full py-3 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm text-center border border-emerald-500/30">
            ✓ Predictions Unlocked
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Main Page ───────────────────────────────────────────────
export function TipsPage() {
  const { user, hasAccess, hasJackpotAccess, setShowAuthModal, setShowPricingModal, setShowJackpotModal, setSelectedJackpot } = useUser();
  const [activeTab, setActiveTab] = useState<'tips' | 'jackpot'>('tips');
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, winRate: 0 });
  const [jackpots, setJackpots] = useState<JackpotPrediction[]>([]);
  const [bundleInfo, setBundleInfo] = useState<JackpotBundleInfo | null>(null);
  const [tipsByCategory, setTipsByCategory] = useState<Record<string, Tip[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState<boolean | string | number>(false);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingJackpot, setLoadingJackpot] = useState(true);
  const [pricingTiers, setPricingTiers] = useState<TierConfig[]>([]);

  const structData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Expert Football Betting Tips & Jackpot Predictions",
    "description": "Premium sports intelligence hub providing expert data-driven football predictions and jackpot analysis.",
    "publisher": {
      "@type": "Organization",
      "name": "TambuaTips",
      "logo": "https://tambuatips.com/logo.png"
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Common screenshot keys: PrintScreen or Cmd+Shift+3/4/5
      if (e.key === 'PrintScreen' || 
         (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
        
        // Let the OS take the screenshot of the blurred overlay instead
        setShowScreenshotWarning(true);

        // Wipe clipboard to deter simple scraping
        if (navigator.clipboard) {
          navigator.clipboard.writeText('TambuaTips is protected. Share your link to get free access!').catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ─── Auto-polling: fetch tips & jackpots every 30s ────────
  useEffect(() => {
    let isMounted = true;

    const fetchData = async (isInitial = false) => {
      if (isInitial) {
        setLoadingTips(true);
        setLoadingJackpot(true);
      }

      // Fetch all tip categories in parallel
      const tipsPromise = Promise.all(
        CATEGORY_ORDER.map(async cat => {
          const tips = await getTipsByCategory(cat);
          return { cat, tips };
        })
      );
      const jackpotPromise = getAllJackpots();
      const bundlePromise = getJackpotBundleInfo();
      const pricingTiersPromise = getPricingTiers();

      const [tipsResults, jackpotResults, bundleResult, fetchedTiers] = await Promise.all([tipsPromise, jackpotPromise, bundlePromise, pricingTiersPromise]);

      if (!isMounted) return;

      const newMap: Record<string, Tip[]> = {};
      tipsResults.forEach(r => { newMap[r.cat] = r.tips; });
      setTipsByCategory(newMap);
      setJackpots(jackpotResults);
      setBundleInfo(bundleResult);
      setPricingTiers(fetchedTiers);

      if (isInitial) {
        setLoadingTips(false);
        setLoadingJackpot(false);
      }
    };

    // Initial fetch
    fetchData(true);

    // Poll every 30 seconds, but only when the tab is visible
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => fetchData(false), 15_000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Fetch immediately on return, then resume interval
        fetchData(false);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.subscription.tier, JSON.stringify(user?.purchasedJackpotIds)]);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      <SEO 
        title={activeTab === 'tips' ? 'Expert Football Betting Tips' : 'Sportpesa Jackpot Predictions'}
        description="Get data-driven football predictions, daily free tips, and expert jackpot analysis for Sportpesa Midweek and Mega Jackpots. Stop guessing, start winning."
        keywords="football tips, betting predictions, sportpesa jackpot, mega jackpot, midweek jackpot, soccer picks, vip tips"
        canonical="https://tambuatips.com/tips"
        structData={structData}
      />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase mb-2">Expert Tips</h1>
        <p className="text-sm text-zinc-400">Data-driven predictions from our expert analysts</p>
      </div>

      {/* Detached: Stats Banner */}

      {/* Referral Modal (opened from locked tip cards) */}
      <ReferralModal isOpen={!!showReferralModal} onClose={() => setShowReferralModal(false)} tipId={(typeof showReferralModal === 'number' || typeof showReferralModal === 'string') ? Number(showReferralModal) : undefined} />


      {/* Tab Bar */}
      <div className="flex bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('tips')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tips' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" /> Daily Tips
        </button>
        <button
          onClick={() => setActiveTab('jackpot')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'jackpot' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" /> Jackpot
        </button>
      </div>

      {/* Daily Tips Tab */}
      {activeTab === 'tips' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {(!user || !hasAccess('vip')) && pricingTiers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-white">Subscription Packages</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {pricingTiers.filter(t => t.id === 'basic' || t.id === 'standard' || t.id === 'premium').map(pkg => {
                  let sumPrice = 0;
                  pkg.categories.forEach(cat => {
                    if (cat === 'free') return;
                    const individual = pricingTiers.find(t => t.categories.length === 1 && t.categories[0] === cat);
                    if (individual) {
                       sumPrice += individual.price2wk;
                    }
                  });
                  
                  const isDiscounted = sumPrice > pkg.price2wk && pkg.price2wk > 0;
                  const discountPct = isDiscounted ? Math.round((1 - pkg.price2wk / sumPrice) * 100) : 0;

                  return (
                    <div key={pkg.id} className={`bg-zinc-900 border ${pkg.popular ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-zinc-800'} rounded-2xl p-2.5 sm:p-5 flex flex-col relative overflow-hidden transition-all hover:border-emerald-500/50`}>
                      {pkg.popular && (
                        <div className="absolute top-2 sm:top-3 right-[-35px] sm:right-[-30px] bg-emerald-500 text-zinc-950 text-[8px] sm:text-[10px] font-bold px-8 py-0.5 sm:py-1 rotate-45 shadow-sm transform-gpu">
                          POPULAR
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-2 sm:mb-3">
                        <h4 className="text-sm sm:text-lg font-black text-white">{pkg.name.replace(' Plan', '')}</h4>
                        {isDiscounted && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mt-1 sm:mt-0">
                            Save {discountPct}%
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-end gap-1 mb-1">
                        <div className="text-lg sm:text-2xl font-black text-white leading-none">
                          <span className="text-[10px] sm:text-sm text-zinc-400 mr-1">{pkg.currency_symbol || 'KES'}</span>
                          {pkg.price2wk.toLocaleString()}
                        </div>
                        <span className="text-[9px] sm:text-xs text-zinc-500 font-normal mb-0.5">/ 2 wks</span>
                      </div>

                      <div className="h-3 sm:h-4 mb-2 sm:mb-3">
                        {isDiscounted ? (
                          <p className="text-[9px] sm:text-[10px] text-zinc-500 line-through">
                            Value: {pkg.currency_symbol || 'KES'} {sumPrice.toLocaleString()}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex-1 mb-3 flex flex-col mt-1 sm:mt-0">
                        <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-widest">Contains:</span>
                        <div className="flex flex-wrap gap-1.5">
                           {pkg.categories.filter(c => c !== 'free').map(c => (
                             <span key={c} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                               {CATEGORY_LABELS[c]?.label || c}
                             </span>
                           ))}
                        </div>
                      </div>
                      
                      <button 
                         onClick={(e) => { 
                           e.preventDefault(); 
                           if (!user) setShowAuthModal(true); 
                           else setShowPricingModal(true, undefined, pkg.id); 
                         }}
                         className={`w-full py-1.5 sm:py-2.5 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                           pkg.popular 
                             ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20' 
                             : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                         }`}
                       >
                         GET {pkg.name.toUpperCase().replace(' PLAN', '')}
                       </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {loadingTips ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              <div className="h-64 bg-zinc-900/60 border border-zinc-800 rounded-2xl" />
              <div className="h-64 bg-zinc-900/60 border border-zinc-800 rounded-2xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {CATEGORY_ORDER.map(cat => {
                const tips = tipsByCategory[cat] || [];
                const catInfo = CATEGORY_LABELS[cat];
                const Icon = CATEGORY_ICONS[cat];
                const userHasAccess = hasAccess(cat);
                const isExpanded = expandedCategories[cat];
                
                if (tips.length === 0) return null;

                // Split strictly between upcoming/live and historical
                const pendingTips = tips.filter(t => t.result === 'pending');
                const historyTips = tips.filter(t => t.result !== 'pending');
                
                // Show maximum 2 historical matches by default to prevent huge scrolling blocks
                const displayedHistory = isExpanded ? historyTips : historyTips.slice(0, 2);
                const displayedTips = [...pendingTips, ...displayedHistory];

                return (
                  <div key={cat} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
                    <div className="p-5">
                      {/* Category Header Mimicking JackpotCard */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            cat === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
                            cat === 'vip' ? 'bg-gold-500/20 text-gold-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-white uppercase tracking-wide">
                              {catInfo.label.toUpperCase().includes('TIPS') ? catInfo.label.toUpperCase() : `${catInfo.label.toUpperCase()} TIPS`}
                            </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-zinc-400 font-medium">
                              {tips.length} Prediction{tips.length !== 1 ? 's' : ''}
                            </p>
                            {!userHasAccess && (
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> {catInfo.minTier} plan
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>


                    {/* NEW: Master Unlock Buttons for the Category */}
                      {!userHasAccess && pendingTips.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                          <button
                            onClick={(e) => { 
                              e.preventDefault(); 
                              if (!user) setShowAuthModal(true); 
                              else setShowPricingModal(true, cat); 
                            }}
                            className="flex-1 py-2.5 px-2 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 rounded-xl text-xs text-gold-400 font-bold uppercase flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Lock className="w-4 h-4" /> Unlock
                          </button>

                          {user && (
                            <button 
                              onClick={(e) => { e.preventDefault(); setShowReferralModal(true); }}
                              className="flex-1 py-2.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs text-white font-bold uppercase flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Gift className="w-4 h-4" /> Get for Free
                            </button>
                          )}
                        </div>
                      )}


                    {/* Tips Table */}
                    <div className="bg-zinc-950/50 border border-emerald-500/20 rounded-xl overflow-hidden mb-0">
                      <div className="max-h-[32rem] overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-zinc-900 z-10">
                            <tr className="border-b border-zinc-800">
                              <th className="px-2.5 py-2 text-left text-zinc-500 font-bold uppercase tracking-wider w-7">#</th>
                              <th className="px-2.5 py-2 text-left text-zinc-500 font-bold uppercase tracking-wider">Match</th>
                              <th className="px-2 py-2 text-center text-emerald-400 font-bold uppercase tracking-wider w-24">Tip</th>
                              <th className="px-2 py-2 text-center text-zinc-500 font-bold uppercase tracking-wider w-16">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedTips.map((tip, idx) => {
                              const isTipUnlocked = user?.unlocked_tip_ids?.includes(Number(tip.id));
                              const locked = !userHasAccess && tip.result === 'pending' && !isTipUnlocked;
                              const onGetFree = (!userHasAccess && tip.result === 'pending' && !isTipUnlocked && user) ? () => setShowReferralModal(tip.id) : undefined;
                              
                              return (
                                <tr key={tip.id} className={`border-b border-zinc-800/50 last:border-0 ${
                                  tip.result === 'won' ? 'bg-emerald-500/5' : tip.result === 'lost' ? 'bg-red-500/5' : tip.result === 'postponed' ? 'bg-orange-500/5' : ''
                                }`}>
                                  <td className="px-2.5 py-1.5 text-zinc-500 font-mono">{idx + 1}</td>
                                  <td className="px-2.5 py-1.5">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                        {tip.league && <LeagueLogo leagueName={tip.league} size={12} />}
                                        {tip.league && <span>{tip.league}</span>}
                                        {tip.league && tip.matchDate && <span className="mx-0.5 opacity-50">•</span>}
                                        {tip.matchDate && (
                                          <span className="text-zinc-400 font-mono flex items-center gap-0.5" title="Kickoff Time">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(tip.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </span>
                                      <Link to={`/match/${tip.fixtureId}`} className="text-zinc-300 inline-flex items-center gap-1 flex-wrap hover:text-emerald-400 transition-colors">
                                        <TeamWithLogo teamName={tip.homeTeam} size={14} textClassName="text-xs" />
                                        <span className="text-zinc-600 mx-0.5">vs</span>
                                        <TeamWithLogo teamName={tip.awayTeam} size={14} textClassName="text-xs" />
                                      </Link>
                                    </div>
                                  </td>
                                 <td className="px-2 py-1.5 text-center">
                                    {locked ? (
                                      <div className="flex flex-col items-center justify-center h-full py-1">
                                        <span className="font-mono font-bold text-zinc-700 text-sm tracking-widest blur-[2px] leading-none">
                                          •••
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full py-1">
                                        <span className="font-mono font-bold text-emerald-400 text-sm leading-none">{tip.prediction}</span>
                                        <div className="flex items-center justify-center gap-0.5 mt-1.5">
                                          {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-2 h-2 ${i < tip.confidence ? 'text-gold-400 fill-gold-400' : 'text-zinc-700'}`} />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {tip.result === 'won' ? (
                                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase">Won</span>
                                    ) : tip.result === 'lost' ? (
                                      <span className="text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full uppercase">Lost</span>
                                    ) : tip.result === 'postponed' ? (
                                      <span className="text-[10px] font-black text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full uppercase">PPD</span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                   {/* History Toggle */}
                    {historyTips.length > 2 && (
                      <div className="mt-5 text-center">
                        <button 
                          onClick={() => toggleCategory(cat)}
                          className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors inline-flex items-center gap-1 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700"
                        >
                          {isExpanded ? 'Hide Past History' : 'View More History'} 
                          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* Jackpot Tab */}
      {activeTab === 'jackpot' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-display font-bold uppercase mb-1">Sportpesa Jackpot Predictions</h2>
          </div>

          {loadingJackpot ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              <div className="h-64 bg-zinc-900/60 border border-zinc-800 rounded-2xl" />
              <div className="h-64 bg-zinc-900/60 border border-zinc-800 rounded-2xl" />
            </div>
          ) : jackpots.length > 0 ? (
            <div className="space-y-6">
              {/* Bundle Upsell Banner */}
              {bundleInfo && bundleInfo.locked_count > 1 && (
                <div className="bg-linear-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
                  
                  <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center shrink-0">
                      <Gift className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-0.5">Unlock All Jackpots</h3>
                      <p className="text-sm text-zinc-300">
                        Get all {bundleInfo.locked_count} pending predictions and <span className="text-emerald-400 font-bold">save {bundleInfo.discount_pct}%</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto relative z-10">
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] text-zinc-500 line-through">
                        {bundleInfo.currency_symbol} {bundleInfo.original_price.toLocaleString(undefined, {minimumFractionDigits: bundleInfo.original_price % 1 !== 0 ? 2 : 0})}
                      </p>
                      <p className="font-black text-emerald-400 text-lg leading-none">
                        {bundleInfo.currency_symbol} {bundleInfo.discounted_price.toLocaleString(undefined, {minimumFractionDigits: bundleInfo.discounted_price % 1 !== 0 ? 2 : 0})}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        // Create a faux bundle jackpot prediction object for the modal
                        const bundleJackpot: JackpotPrediction = {
                          id: 'bundle',
                          type: 'mega', // Visual only
                          dcLevel: 5,
                          matches: [],
                          variations: [],
                          price: bundleInfo.discounted_price,
                          result: 'pending',
                          currency: bundleInfo.currency,
                          currency_symbol: bundleInfo.currency_symbol,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        };
                        setSelectedJackpot(bundleJackpot);
                        setShowJackpotModal(true);
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Unlock Bundle
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jackpots.map(j => {
                  const isUnlocked = !j.locked;
                  return (
                    <JackpotCard 
                      key={j.id} 
                      jackpot={j} 
                      onGetFree={(!isUnlocked && user) ? () => setShowReferralModal(true) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
              <Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 mb-2">No jackpot predictions available yet</p>
              <p className="text-xs text-zinc-600">Check back when the next Midweek or Mega Jackpot is announced</p>
            </div>
          )}
        </div>
      )}

      {/* CTA */}

      {/* Anti-Screenshot Overlay */}
      {showScreenshotWarning && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4">
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full relative">
            <button 
              onClick={() => setShowScreenshotWarning(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-display font-bold text-white mb-2">Screenshot Detected</h2>
              <p className="text-sm text-zinc-400">
                Sharing screenshots of premium tips is heavily prohibited. If you want to share TambuaTips with friends, use your referral link below instead to earn free VIP days!
              </p>
            </div>

            <ReferralWidget />
          </div>
        </div>
      )}
    </div>
  );
}
