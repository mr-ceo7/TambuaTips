import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Clock, MapPin, Trophy, TrendingUp, Lock, Zap, Star, ExternalLink, Calculator, Target, Activity } from 'lucide-react';
import { fetchFixtureById } from '../services/sportsApiService';
import { getTipByFixtureId, type Tip } from '../services/tipsService';
import { FixtureData } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
// Detached: import { useBetSlip } from '../context/BetSlipContext';
import { useUser } from '../context/UserContext';
import { MatchDetailSkeleton } from '../components/skeletons/MatchDetailSkeleton';

/* Detached: MOCK_ODDS */

const MOCK_STATS = {
  form: { home: ['W', 'D', 'W', 'W', 'L'], away: ['L', 'L', 'D', 'W', 'D'] },
  h2h: [
    { date: '2023-11-04', result: 'Home 2-1 Away' },
    { date: '2023-04-12', result: 'Away 0-0 Home' },
    { date: '2022-10-22', result: 'Home 3-0 Away' }
  ],
  avgGoals: { homeScored: 2.1, homeConceded: 0.8, awayScored: 1.2, awayConceded: 1.6 }
};

export function MatchDetailPage() {
  usePageTitle('Match Detail');
  const { id } = useParams<{ id: string }>();
  const [fixture, setFixture] = useState<FixtureData | null>(null);
  const [tip, setTip] = useState<Tip | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'odds' | 'stats' | 'tip'>('preview');
  
  // Detached: const { addSelection, selections } = useBetSlip();
  const { user, setShowAuthModal, setShowPricingModal } = useUser();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchFixtureById(parseInt(id));
        setFixture(data);
        const matchTip = await getTipByFixtureId(parseInt(id));
        setTip(matchTip || undefined);
      } catch (err) {
        console.error('Failed to load match:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <MatchDetailSkeleton />;
  }

  if (!fixture) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
        <h2 className="text-xl font-bold text-zinc-300 mb-4">Match not found</h2>
        <Link to="/fixtures" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to Fixtures</Link>
      </div>
    );
  }

  const kickoff = new Date(fixture.matchDate);
  const matchName = `${fixture.homeTeam} vs ${fixture.awayTeam}`;

  /* Detached: handleAddOdd and isSelected */

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-3xl">
      <Link to="/fixtures" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Fixtures
      </Link>

      {/* Match Header Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-center mb-4">
          {fixture.status === 'live' ? (
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live — {fixture.elapsed}'
            </span>
          ) : fixture.status === 'finished' ? (
            <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold uppercase rounded-full">Full Time</span>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Clock className="w-3 h-3" /> {kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="text-center mb-6">
          <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{fixture.league}</span>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-10">
          <div className="flex-1 text-center group">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 bg-zinc-800/50 rounded-full flex items-center justify-center p-3 border border-zinc-700/50 group-hover:border-emerald-500/30 transition-colors">
              {fixture.homeLogo ? (
                <img src={fixture.homeLogo} alt={fixture.homeTeam} className="w-full h-full object-contain drop-shadow-lg" />
              ) : <Target className="w-8 h-8 text-zinc-600" />}
            </div>
            <h3 className="text-sm sm:text-lg font-bold text-zinc-200 leading-tight">{fixture.homeTeam}</h3>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1 block">Home</span>
          </div>

          <div className="flex-shrink-0 text-center px-2">
            {fixture.score ? (
              <div className={`text-4xl sm:text-5xl font-display font-bold font-mono tracking-tighter ${fixture.status === 'live' ? 'text-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-white'}`}>
                {fixture.score}
              </div>
            ) : (
              <div className="text-2xl sm:text-4xl font-display font-black text-zinc-700">VS</div>
            )}
          </div>

          <div className="flex-1 text-center group">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 bg-zinc-800/50 rounded-full flex items-center justify-center p-3 border border-zinc-700/50 group-hover:border-emerald-500/30 transition-colors">
              {fixture.awayLogo ? (
                <img src={fixture.awayLogo} alt={fixture.awayTeam} className="w-full h-full object-contain drop-shadow-lg" />
              ) : <Target className="w-8 h-8 text-zinc-600" />}
            </div>
            <h3 className="text-sm sm:text-lg font-bold text-zinc-200 leading-tight">{fixture.awayTeam}</h3>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1 block">Away</span>
          </div>
        </div>

        {fixture.venue && (
          <div className="flex items-center justify-center gap-1.5 mt-8 text-xs font-medium text-zinc-500 bg-zinc-950/50 py-2 px-4 rounded-full w-max mx-auto border border-zinc-800/50">
            <MapPin className="w-3 h-3 text-emerald-500" /> {fixture.venue}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto custom-scrollbar bg-zinc-900/60 border border-zinc-800 rounded-xl p-1.5 mb-6 shadow-lg">
        {[
          { key: 'preview', label: 'Preview' },
          { key: 'stats', label: 'H2H & Stats' },
          { key: 'tip', label: 'Expert Tip' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-sm font-bold rounded-lg transition-all relative whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" /> Match Preview
              </h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {fixture.homeTeam} host {fixture.awayTeam} in the {fixture.league}. 
                {fixture.status === 'upcoming' && ` Kickoff is at ${kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${kickoff.toLocaleDateString()}.`}
                {fixture.status === 'live' && ` The match is currently live!`}
                {fixture.status === 'finished' && ` The final score was ${fixture.score}.`}
              </p>
            </div>
            {/* Detached: Odds Simulator Available block */}
          </div>
        )}

        {/* Detached: ODDS COMPARISON TAB */}

        {/* STATS & H2H TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Form */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-bold text-white tracking-wider flex items-center gap-2 mb-4 uppercase">
                <Activity className="w-4 h-4 text-emerald-500" /> Recent Form (Last 5)
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-300">{fixture.homeTeam}</span>
                  <div className="flex gap-1.5">
                    {MOCK_STATS.form.home.map((f, i) => (
                      <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white ${f==='W'?'bg-emerald-500':f==='D'?'bg-zinc-600':'bg-red-500'}`}>{f}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-300">{fixture.awayTeam}</span>
                  <div className="flex gap-1.5">
                    {MOCK_STATS.form.away.map((f, i) => (
                      <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white ${f==='W'?'bg-emerald-500':f==='D'?'bg-zinc-600':'bg-red-500'}`}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Averages */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-bold text-white tracking-wider mb-4 uppercase">Avg Goals Per Match</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/50 text-center">
                  <span className="text-xs text-zinc-500 block mb-1">Home Scored</span>
                  <span className="text-xl font-mono font-bold text-emerald-400">{MOCK_STATS.avgGoals.homeScored}</span>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/50 text-center">
                  <span className="text-xs text-zinc-500 block mb-1">Away Scored</span>
                  <span className="text-xl font-mono font-bold text-emerald-400">{MOCK_STATS.avgGoals.awayScored}</span>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/50 text-center">
                  <span className="text-xs text-zinc-500 block mb-1">Home Conceded</span>
                  <span className="text-xl font-mono font-bold text-red-400">{MOCK_STATS.avgGoals.homeConceded}</span>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/50 text-center">
                  <span className="text-xs text-zinc-500 block mb-1">Away Conceded</span>
                  <span className="text-xl font-mono font-bold text-red-400">{MOCK_STATS.avgGoals.awayConceded}</span>
                </div>
              </div>
            </div>

            {/* H2H */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-bold text-white tracking-wider flex items-center gap-2 mb-4 uppercase">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Head-to-Head
              </h4>
              <div className="space-y-3">
                {MOCK_STATS.h2h.map((match, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                    <span className="text-xs text-zinc-500 font-mono">{match.date}</span>
                    <span className="text-sm font-bold text-zinc-300">{match.result.replace('Home', fixture.homeTeam).replace('Away', fixture.awayTeam)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXPERT TIP TAB */}
        {activeTab === 'tip' && (
          <div className="space-y-4">
            {tip ? (
              <div className={`rounded-xl p-6 border shadow-xl relative overflow-hidden ${tip.isPremium ? 'bg-gold-500/10 border-gold-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                {/* Background glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 blur-3xl opacity-20 rounded-full ${tip.isPremium ? 'bg-gold-500' : 'bg-emerald-500'}`}></div>
                
                <div className="flex items-center gap-2 mb-6 relative z-10">
                  {tip.isPremium ? (
                    <span className="px-3 py-1.5 bg-gold-500/20 text-gold-400 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-gold-500/30">
                      <Star className="w-3.5 h-3.5" /> Premium Pick
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-emerald-500/30">
                      <Zap className="w-3.5 h-3.5" /> Free Expert Tip
                    </span>
                  )}
                </div>

                {tip.isPremium && !user?.isPremium ? (
                  <div className="text-center py-8 relative z-10">
                    <Lock className="w-12 h-12 text-gold-400/50 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-white mb-2">Premium Tip Locked</h4>
                    <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">Unlock this expert prediction with a Premium TambuaTips subscription to increase your edge.</p>
                    <button 
                      onClick={() => !user ? setShowAuthModal(true) : setShowPricingModal(true)}
                      className="inline-block px-8 py-3 bg-linear-to-r from-gold-600 to-gold-400 text-zinc-950 font-black tracking-wide rounded-xl shadow-lg shadow-gold-500/30 hover:shadow-gold-500/50 transition-all hover:-translate-y-1 text-sm uppercase"
                    >
                      {user ? 'Upgrade to Premium' : 'Login to Upgrade'}
                    </button>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="mb-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                      <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest block mb-1">Official Prediction</span>
                      <p className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight">{tip.prediction}</p>
                    </div>
                    <div className="mb-6">
                      <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 w-full">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Confidence</span>
                        <p className="text-lg font-bold text-gold-400 tracking-widest">{'⭐'.repeat(tip.confidence)}</p>
                      </div>
                    </div>
                    {tip.reasoning && (
                      <div className="border-t border-zinc-800/50 pt-5">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
                          <Activity className="w-3 h-3" /> Tactical Analysis
                        </span>
                        <p className="text-sm text-zinc-300 leading-relaxed max-w-none">{tip.reasoning}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-10 text-center shadow-lg">
                <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-zinc-300 mb-2">No Tip Published Yet</h4>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">Our analysts are still reviewing the data for this match. Check back closer to kickoff.</p>
                <Link to="/tips" className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-500/30 bg-emerald-500/10 px-6 py-2.5 rounded-xl hover:bg-emerald-500/20">Browse available tips →</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
