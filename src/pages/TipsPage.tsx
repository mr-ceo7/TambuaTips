import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Lock, Star, Trophy, ChevronRight, ArrowRight } from 'lucide-react';
import { getFreeTips, getPremiumTips, getTipStats, type Tip } from '../services/tipsService';
import { usePageTitle } from '../hooks/usePageTitle';

function TipCard({ tip, locked = false }: { tip: Tip; locked?: boolean; key?: string }) {
  return (
    <div className={`rounded-2xl border p-5 transition-all hover:-translate-y-1 ${
      locked 
        ? 'bg-zinc-900/60 border-zinc-800 hover:shadow-lg hover:shadow-gold-500/5' 
        : 'bg-emerald-500/5 border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{tip.league}</span>
        {locked ? (
          <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" /> Premium
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
            <Zap className="w-3 h-3" /> Free
          </span>
        )}
      </div>

      {/* Teams */}
      <Link to={`/match/${tip.fixtureId}`} className="block mb-3 group">
        <p className="text-base font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
          {tip.homeTeam} vs {tip.awayTeam}
        </p>
        <p className="text-xs text-zinc-500">{new Date(tip.matchDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </Link>

      {/* Prediction */}
      {locked ? (
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-center">
          <Lock className="w-6 h-6 text-gold-400/40 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">Unlock with Premium</p>
        </div>
      ) : (
        <>
          <div className="bg-zinc-950/50 border border-emerald-500/10 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-emerald-400">{tip.prediction}</span>
              <span className="text-sm font-bold text-zinc-300">@ {tip.odds}</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < tip.confidence ? 'text-gold-400 fill-gold-400' : 'text-zinc-700'}`} />
              ))}
              <span className="ml-auto text-xs text-zinc-500">{tip.bookmaker}</span>
            </div>
          </div>
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
  );
}

export function TipsPage() {
  usePageTitle('Expert Tips');
  const freeTips = getFreeTips();
  const premiumTips = getPremiumTips();
  const stats = getTipStats();

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase mb-2">Expert Tips</h1>
        <p className="text-sm text-zinc-400">Data-driven predictions from our expert analysts</p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-emerald-400">{stats.winRate}%</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Win Rate</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-white">{stats.total}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Tips</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-emerald-400">{stats.won}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Won</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-red-400">{stats.lost}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Lost</p>
        </div>
      </div>

      {/* Free Tips Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-display font-bold uppercase">Today's Free Tips</h2>
        </div>
        {freeTips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {freeTips.map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
            <Zap className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 mb-2">No free tips published yet today</p>
            <p className="text-xs text-zinc-600">Check back soon — our analysts are working on today's picks</p>
          </div>
        )}
      </section>

      {/* Premium Tips Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-gold-400" />
            <h2 className="text-lg font-display font-bold uppercase">Premium Tips</h2>
          </div>
        </div>
        {premiumTips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {premiumTips.map(tip => <TipCard key={tip.id} tip={tip} locked />)}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
            <Lock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 mb-2">No premium tips yet today</p>
            <p className="text-xs text-zinc-600">Premium subscribers get exclusive expert analysis daily</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-purple-500/20 border border-emerald-500/20 rounded-2xl p-6 text-center">
        <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-xl font-display font-bold text-white mb-2">Unlock Premium Access</h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">Get all expert predictions, detailed analysis, and priority alerts. Join thousands of winning bettors.</p>
        <button className="px-8 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 text-sm">
          Go Premium — Starting at $4.99/mo
        </button>
      </div>
    </div>
  );
}
