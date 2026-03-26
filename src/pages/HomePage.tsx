import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ChevronRight, ChevronLeft, Trophy, TrendingUp, Target, Flame, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { fetchTodayFixtures, LEAGUES } from '../services/sportsApiService';
import { fetchNews, mixPromoSlides, FALLBACK_IMAGE, type NewsItem } from '../services/newsService';
import { getTipStats, getFreeTips } from '../services/tipsService';
import { FixtureData } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
import { PageTransition } from '../components/PageTransition';

function LiveScoreboard({ fixtures }: { fixtures: FixtureData[] }) {
  const liveFixtures = fixtures.filter(f => f.status === 'live');
  if (liveFixtures.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Now</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {liveFixtures.map(f => (
          <Link
            key={f.id}
            to={`/match/${f.id}`}
            className="flex-shrink-0 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 min-w-[200px] hover:border-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="text-[10px] text-zinc-500 mb-2 truncate">{f.league}</div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs font-medium text-zinc-200 truncate">{f.homeTeam}</div>
                <div className="text-xs font-medium text-zinc-200 truncate">{f.awayTeam}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-display font-bold text-led text-emerald-400">{f.score || '0 - 0'}</div>
                <div className="text-[10px] text-red-400 font-mono">{f.elapsed}'</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AnimatedPremiumAd() {
  return (
    <div className="absolute inset-0 w-full h-full bg-zinc-950 overflow-hidden">
      {/* Video Background with Invert Trick to make white bg into dark theme context */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover mix-blend-screen border-none invert hue-rotate-180 brightness-110 opacity-70"
      >
        <source src="/tambua-brand.mp4" type="video/mp4" />
      </video>

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
      
      {/* Animated Content */}
      <div className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-end pointer-events-none">
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2 }}
        >
          <span className="inline-block px-3 py-1 bg-gold-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded mb-3 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            Premium Access
          </span>
          <h3 className="text-xl sm:text-3xl font-display font-bold text-white leading-tight mb-4 drop-shadow-md">
            Unlock Expert Tips with 75%+ Win Rate
          </h3>
          
          {/* Steps Animation */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5 pointer-events-auto">
            {[
              { step: 1, text: "Click Get Premium" },
              { step: 2, text: "Unlock Daily Tips" },
              { step: 3, text: "Start Winning" }
            ].map((s, i) => (
              <motion.div 
                key={s.step}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + (i * 0.15) }}
                className="flex items-center gap-2 bg-zinc-900/60 backdrop-blur-sm border border-gold-500/20 px-3 py-1.5 sm:py-2 rounded-lg"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold">
                  {s.step}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-zinc-200">{s.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
            className="pointer-events-auto"
          >
            <Link to="/tips" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-zinc-950 font-bold rounded-xl hover:bg-gold-400 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)] text-sm">
              Go Premium Now <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function NewsCarousel({ articles }: { articles: NewsItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (articles.length === 0) return;
    const isPremiumAd = articles[currentIndex]?.id === 'promo-premium';
    const delay = isPremiumAd ? 12000 : 5000; // 12s for video ad, 5s for others
    
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % articles.length);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [articles, currentIndex]);

  if (articles.length === 0) return null;
  const item = articles[currentIndex];
  const isPromo = String(item.id).startsWith('promo-');

  return (
    <div className="relative w-full h-[280px] sm:h-[360px] rounded-2xl overflow-hidden group">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          {item.id === 'promo-premium' ? (
            <AnimatedPremiumAd />
          ) : (
            <>
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded mb-3 ${isPromo ? 'bg-gold-500 text-zinc-950' : 'bg-emerald-500/90 text-zinc-950'}`}>
                  {item.category}
                </span>
                <h3 className="text-lg sm:text-2xl font-display font-bold text-white leading-tight mb-2">{item.title}</h3>
                {!isPromo && (
                  <div className="flex items-center gap-3 text-xs text-zinc-300">
                    <span className="font-medium text-emerald-400">{item.source}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                    <span>{item.time}</span>
                  </div>
                )}
                {isPromo && (
                  <Link to={item.link} className="inline-flex items-center gap-2 mt-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                    Learn More <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setCurrentIndex(prev => (prev - 1 + articles.length) % articles.length)} className="h-8 w-8 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-all hover:scale-110">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setCurrentIndex(prev => (prev + 1) % articles.length)} className="h-8 w-8 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-all hover:scale-110">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {articles.slice(0, 8).map((_, i) => (
          <button key={i} onClick={() => setCurrentIndex(i)} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-zinc-600'}`} />
        ))}
      </div>
    </div>
  );
}

function QuickFixtures({ fixtures }: { fixtures: FixtureData[] }) {
  // Group by league
  const grouped = useMemo(() => {
    const map = new Map<string, FixtureData[]>();
    fixtures.slice(0, 20).forEach(f => {
      const list = map.get(f.league) || [];
      list.push(f);
      map.set(f.league, list);
    });
    return Array.from(map.entries());
  }, [fixtures]);

  return (
    <div className="space-y-4">
      {grouped.map(([league, matches]) => (
        <div key={league} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{league}</h4>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {matches.slice(0, 5).map(f => (
              <Link key={f.id} to={`/match/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 truncate">{f.homeTeam}</div>
                  <div className="text-sm text-zinc-200 truncate">{f.awayTeam}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  {f.status === 'live' ? (
                    <>
                      <div className="text-sm font-bold text-emerald-400 font-mono">{f.score || '0 - 0'}</div>
                      <div className="text-[10px] text-red-400 font-mono">{f.elapsed}'</div>
                    </>
                  ) : f.status === 'finished' ? (
                    <div className="text-sm font-bold text-zinc-400 font-mono">{f.score || 'FT'}</div>
                  ) : (
                    <div className="text-xs text-zinc-500">{new Date(f.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeagueShortcuts() {
  const leagues = Object.values(LEAGUES).slice(0, 8);
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {leagues.map(league => (
        <Link
          key={league.id}
          to={`/standings?league=${league.id}`}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/30 transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-2xl">{league.flag}</span>
          <span className="text-[10px] text-zinc-400 text-center leading-tight truncate w-full">{league.name.split(' ')[0]}</span>
        </Link>
      ))}
    </div>
  );
}

export function HomePage() {
  usePageTitle('Home');
  const [fixtures, setFixtures] = useState<FixtureData[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = getTipStats();
  const freeTips = getFreeTips();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fixturesData, newsData] = await Promise.all([
          fetchTodayFixtures(),
          fetchNews(1),
        ]);
        setFixtures(fixturesData);
        setNewsArticles(mixPromoSlides(newsData.articles));
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 font-mono uppercase tracking-widest">Loading TambuaTips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      {/* Live Scoreboard */}
      <LiveScoreboard fixtures={fixtures} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: News + Fixtures */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* News Carousel */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-display font-bold uppercase">Latest News</h2>
              <Link to="/news" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <NewsCarousel articles={newsArticles} />
          </section>

          {/* League Shortcuts */}
          <section>
            <h2 className="text-lg font-display font-bold uppercase mb-4">Popular Leagues</h2>
            <LeagueShortcuts />
          </section>

          {/* Today's Fixtures */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold uppercase">Today's Matches</h2>
              <Link to="/fixtures" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                All Fixtures <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <QuickFixtures fixtures={fixtures} />
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-5 flex items-center gap-4 backdrop-blur-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Win Rate</p>
                <p className="text-2xl font-display font-bold text-white">{stats.winRate}%</p>
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-5 flex items-center gap-4 backdrop-blur-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Tips Record</p>
                <p className="text-2xl font-display font-bold text-white">{stats.won}W - {stats.lost}L</p>
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-5 flex items-center gap-4 backdrop-blur-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total Tips</p>
                <p className="text-2xl font-display font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Free Tips Preview */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" /> Today's Free Tips
              </h3>
              <Link to="/tips" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">View All</Link>
            </div>
            {freeTips.length > 0 ? (
              <div className="space-y-3">
                {freeTips.slice(0, 3).map(tip => (
                  <div key={tip.id} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-1">{tip.league}</div>
                    <div className="text-sm font-medium text-zinc-200 mb-1">{tip.homeTeam} vs {tip.awayTeam}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">{tip.prediction}</span>
                      <span className="text-xs text-zinc-500">@ {tip.odds}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">No free tips yet today. Check back soon!</p>
            )}
            <Link to="/tips" className="mt-4 w-full py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
              Get Expert Tips <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Referral CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/20 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">🎁 Invite & Earn</h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Share TambuaTips with friends and unlock free daily premium tips. The more you invite, the more you win!
            </p>
            <button className="w-full py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm">
              Share Invite Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
