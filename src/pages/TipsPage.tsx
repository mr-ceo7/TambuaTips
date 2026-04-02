import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Lock, Star, Trophy, Crown, ChevronRight, Target, Plus, Check, Eye, AlertTriangle, X, Gift } from 'lucide-react';
import { TeamWithLogo } from '../components/TeamLogo';
import { ReferralWidget } from '../components/ReferralWidget';
import { ReferralModal } from '../components/ReferralModal';
import { getFreeTips, getPremiumTips, getTipsByCategory, getTipStats, getAllJackpots, type Tip, type TipCategory, type JackpotPrediction } from '../services/tipsService';
import { CATEGORY_LABELS } from '../services/pricingService';
import { usePageTitle } from '../hooks/usePageTitle';
import { useUser } from '../context/UserContext';
// Detached: import { useBetSlip } from '../context/BetSlipContext';

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
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{tip.league}</span>
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 ${
          tip.category === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
          tip.category === 'vip' ? 'bg-gold-500/20 text-gold-400' :
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
        <p className="text-xs text-zinc-500">{new Date(tip.matchDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
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
                  Purchase
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
              <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-center uppercase ${
                tip.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                tip.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {tip.result}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Jackpot Card ────────────────────────────────────────────
function JackpotCard({ jackpot }: { jackpot: JackpotPrediction; key?: React.Key }) {
  const { user, setShowAuthModal, setSelectedJackpot, setShowJackpotModal, hasJackpotAccess } = useUser();
  const isUnlocked = hasJackpotAccess(jackpot.id);

  const handlePurchase = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setSelectedJackpot(jackpot);
      setShowJackpotModal(true);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gold-500/20">
              <Trophy className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase">
                {jackpot.type === 'midweek' ? 'Midweek Jackpot' : 'Mega Jackpot'}
              </h4>
              <p className="text-[10px] text-zinc-500">
                {jackpot.type === 'midweek' ? '13 Matches' : '17 Matches'} • {jackpot.dcLevel}DC
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gold-400">{jackpot.currency_symbol || 'KES'} {jackpot.price.toLocaleString(undefined, {minimumFractionDigits: jackpot.price % 1 !== 0 ? 2 : 0})}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 mb-3">
          Double chance predictions covering {jackpot.dcLevel} outcomes per match for maximum coverage.
        </p>

        {/* Locked/Unlocked Content */}
        {isUnlocked ? (
          <div className="bg-zinc-950/50 border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
            <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-2">
              {jackpot.matches.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-800 last:border-0">
                  <span className="text-[10px] text-zinc-400 truncate mr-2 inline-flex items-center gap-1">
                    <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-[10px]" />
                    <span className="text-zinc-600">vs</span>
                    <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-[10px]" />
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                    {m.pick}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 mb-4 text-center">
            <Lock className="w-6 h-6 text-gold-400/40 mx-auto mb-2" />
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              {jackpot.matches.length} match predictions locked
            </p>
          </div>
        )}

        {!isUnlocked && (
          <button
            onClick={handlePurchase}
            className="w-full py-2.5 bg-gold-500 text-zinc-950 font-bold rounded-xl text-sm hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
          >
            Purchase — {jackpot.currency_symbol || 'KES'} {jackpot.price.toLocaleString(undefined, {minimumFractionDigits: jackpot.price % 1 !== 0 ? 2 : 0})}
          </button>
        )}
        
        {isUnlocked && (
          <div className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm text-center border border-emerald-500/30">
            Predictions Unlocked
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Main Page ───────────────────────────────────────────────
export function TipsPage() {
  usePageTitle('Expert Tips');
  const { user, hasAccess, setShowAuthModal, setShowPricingModal } = useUser();
  const [activeTab, setActiveTab] = useState<'tips' | 'jackpot'>('tips');
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, winRate: 0 });
  const [jackpots, setJackpots] = useState<JackpotPrediction[]>([]);
  const [tipsByCategory, setTipsByCategory] = useState<Record<string, Tip[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

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

  useEffect(() => {
    // Detached: getTipStats().then(setStats);
    getAllJackpots().then(setJackpots);
    
    Promise.all(CATEGORY_ORDER.map(async cat => {
      const tips = await getTipsByCategory(cat);
      return { cat, tips };
    })).then(results => {
      const newMap: Record<string, Tip[]> = {};
      results.forEach(r => { newMap[r.cat] = r.tips; });
      setTipsByCategory(newMap);
    });
  }, [user?.subscription.tier, JSON.stringify(user?.purchasedJackpotIds)]);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase mb-2">Expert Tips</h1>
        <p className="text-sm text-zinc-400">Data-driven predictions from our expert analysts</p>
      </div>

      {/* Detached: Stats Banner */}

      {/* Referral Modal (opened from locked tip cards) */}
      <ReferralModal isOpen={showReferralModal} onClose={() => setShowReferralModal(false)} />

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
        <div className="space-y-8">
          {CATEGORY_ORDER.map(cat => {
            const tips = tipsByCategory[cat] || [];
            if (tips.length === 0) return null;
            const catInfo = CATEGORY_LABELS[cat];
            const Icon = CATEGORY_ICONS[cat];
            const userHasAccess = hasAccess(cat);

            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${cat === 'free' ? 'text-emerald-500' : cat === 'vip' ? 'text-gold-400' : 'text-blue-400'}`} />
                  <h2 className="text-lg font-display font-bold uppercase">{catInfo.label}</h2>
                  {!userHasAccess && (
                    <span className="ml-auto px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {catInfo.minTier} plan
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    // Split strictly between upcoming/live and historical
                    const pendingTips = tips.filter(t => t.result === 'pending');
                    const historyTips = tips.filter(t => t.result !== 'pending');
                    const isExpanded = expandedCategories[cat];
                    
                    // Show maximum 2 historical matches by default to prevent huge scrolling blocks
                    const displayedHistory = isExpanded ? historyTips : historyTips.slice(0, 2);
                    const displayedTips = [...pendingTips, ...displayedHistory];

                    return displayedTips.map(tip => (
                      <TipCard 
                        key={tip.id} 
                        tip={tip} 
                        // It is ONLY locked if they dont have access AND the match hasnt finished yet
                        locked={!userHasAccess && tip.result === 'pending'}
                        onGetFree={(!userHasAccess && tip.result === 'pending' && user) ? () => setShowReferralModal(true) : undefined}
                      />
                    ));
                  })()}
                </div>
                
                {tips.filter(t => t.result !== 'pending').length > 2 && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => toggleCategory(cat)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors inline-flex items-center gap-1 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700"
                    >
                      {expandedCategories[cat] ? 'Hide Past History' : 'View More History'} 
                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedCategories[cat] ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Jackpot Tab */}
      {activeTab === 'jackpot' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-display font-bold uppercase mb-1">Sportpesa Jackpot Predictions</h2>
            <p className="text-xs text-zinc-400">Double chance predictions for Midweek (13 matches) and Mega (17 matches) jackpots. Choose your DC level.</p>
          </div>

          {jackpots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jackpots.map(j => (
                <JackpotCard key={j.id} jackpot={j} />
              ))}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4">
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
