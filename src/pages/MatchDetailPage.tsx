import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Clock, MapPin, Trophy, TrendingUp, Lock, Zap, Star } from 'lucide-react';
import { fetchFixtureById } from '../services/sportsApiService';
import { getTipByFixtureId, type Tip } from '../services/tipsService';
import { FixtureData } from '../types';

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [fixture, setFixture] = useState<FixtureData | null>(null);
  const [tip, setTip] = useState<Tip | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'stats' | 'tip'>('preview');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchFixtureById(parseInt(id));
        setFixture(data);
        const matchTip = getTipByFixtureId(parseInt(id));
        setTip(matchTip);
      } catch (err) {
        console.error('Failed to load match:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
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

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-3xl">
      {/* Back */}
      <Link to="/fixtures" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Fixtures
      </Link>

      {/* Match Header Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden">
        {/* Status Badge */}
        <div className="flex items-center justify-center mb-4">
          {fixture.status === 'live' ? (
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live — {fixture.elapsed}'
            </span>
          ) : fixture.status === 'finished' ? (
            <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase rounded-full">Full Time</span>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* League */}
        <div className="text-center mb-6">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">{fixture.league}</span>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Home */}
          <div className="flex-1 text-center">
            {fixture.homeLogo && (
              <img src={fixture.homeLogo} alt={fixture.homeTeam} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 object-contain" />
            )}
            <h3 className="text-sm sm:text-base font-bold text-zinc-200">{fixture.homeTeam}</h3>
            <span className="text-[10px] text-zinc-500 uppercase">Home</span>
          </div>

          {/* Score */}
          <div className="flex-shrink-0 text-center">
            {fixture.score ? (
              <div className={`text-3xl sm:text-5xl font-display font-bold font-mono ${fixture.status === 'live' ? 'text-emerald-400 text-led' : 'text-white'}`}>
                {fixture.score}
              </div>
            ) : (
              <div className="text-2xl sm:text-4xl font-display font-bold text-zinc-600">VS</div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 text-center">
            {fixture.awayLogo && (
              <img src={fixture.awayLogo} alt={fixture.awayTeam} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 object-contain" />
            )}
            <h3 className="text-sm sm:text-base font-bold text-zinc-200">{fixture.awayTeam}</h3>
            <span className="text-[10px] text-zinc-500 uppercase">Away</span>
          </div>
        </div>

        {/* Venue */}
        {fixture.venue && (
          <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-zinc-500">
            <MapPin className="w-3 h-3" /> {fixture.venue}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 mb-6">
        {[
          { key: 'preview', label: 'Preview' },
          { key: 'stats', label: 'Stats' },
          { key: 'tip', label: 'Expert Tip' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-emerald-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
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

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Match Info</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500 block text-xs">Competition</span>
                <span className="text-zinc-200">{fixture.league}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Date</span>
                <span className="text-zinc-200">{kickoff.toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Kickoff</span>
                <span className="text-zinc-200">{kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {fixture.venue && (
                <div>
                  <span className="text-zinc-500 block text-xs">Venue</span>
                  <span className="text-zinc-200">{fixture.venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 text-center">
          <TrendingUp className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-zinc-400 mb-2">Match Stats</h4>
          <p className="text-xs text-zinc-500">Detailed match statistics will be available closer to kickoff and during the match.</p>
        </div>
      )}

      {activeTab === 'tip' && (
        <div className="space-y-4">
          {tip ? (
            <div className={`rounded-xl p-5 border ${tip.isPremium ? 'bg-gold-500/5 border-gold-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <div className="flex items-center gap-2 mb-4">
                {tip.isPremium ? (
                  <span className="px-2.5 py-1 bg-gold-500/20 text-gold-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Premium
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Free Tip
                  </span>
                )}
              </div>

              {tip.isPremium ? (
                <div className="text-center py-6">
                  <Lock className="w-10 h-10 text-gold-400/50 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-zinc-300 mb-2">Premium Tip</h4>
                  <p className="text-sm text-zinc-500 mb-4">Unlock this expert prediction with a Premium subscription</p>
                  <Link to="/tips" className="inline-block px-6 py-2.5 bg-gold-500 text-zinc-950 font-bold rounded-xl hover:bg-gold-400 transition-all hover:scale-105 text-sm">
                    Go Premium
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Prediction</span>
                    <p className="text-lg font-bold text-emerald-400">{tip.prediction}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <span className="text-xs text-zinc-500">Odds</span>
                      <p className="text-sm font-bold text-zinc-200">@ {tip.odds}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Confidence</span>
                      <p className="text-sm font-bold text-zinc-200">{'⭐'.repeat(tip.confidence)}</p>
                    </div>
                  </div>
                  {tip.reasoning && (
                    <div>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Analysis</span>
                      <p className="text-sm text-zinc-300 leading-relaxed mt-1">{tip.reasoning}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center">
              <Zap className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-zinc-400 mb-2">No Tip Available</h4>
              <p className="text-xs text-zinc-500 mb-4">Our experts haven't published a tip for this match yet.</p>
              <Link to="/tips" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Browse available tips →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
