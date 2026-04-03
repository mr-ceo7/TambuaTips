import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ChevronRight, ChevronLeft, Trophy, Zap, Crown, ArrowRight, ExternalLink, Star, Target } from 'lucide-react';
import { FaWhatsapp, FaTelegramPlane, FaInstagram, FaTiktok } from 'react-icons/fa';
import { fetchTodayFixtures, fetchStandings, fetchFixturesByLeague, LEAGUES, EUROPEAN_LEAGUE_IDS } from '../services/sportsApiService';
import { fetchNews, fetchActiveAds, mixPromoSlides, FALLBACK_IMAGE, NewsItem } from '../services/newsService';
import { getTipStats, getFreeTips } from '../services/tipsService';
import { useCampaign } from '../context/CampaignContext';
import { toast } from 'sonner';
import { FixtureData, TeamStanding } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
import { PageTransition } from '../components/PageTransition';
import { HomePageSkeleton } from '../components/skeletons/HomePageSkeleton';
import { TeamLogo } from '../components/TeamLogo';
import { useUser } from '../context/UserContext';

function LiveScoreCard({ f }: { f: FixtureData }) {
  return (
    <Link
      to={`/match/${f.id}`}
      className="shrink-0 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 min-w-[200px] hover:border-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="text-[10px] text-zinc-500 mb-2 truncate">{f.league}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-medium text-zinc-200 truncate inline-flex items-center gap-1.5"><TeamLogo teamName={f.homeTeam} size={14} />{f.homeTeam}</div>
          <div className="text-xs font-medium text-zinc-200 truncate inline-flex items-center gap-1.5"><TeamLogo teamName={f.awayTeam} size={14} />{f.awayTeam}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-display font-bold text-led text-emerald-400">{f.score || '0 - 0'}</div>
          <div className="text-[10px] text-red-400 font-mono">{f.elapsed}'</div>
        </div>
      </div>
    </Link>
  );
}

function LiveScoreboard({ fixtures, selectedLeague }: { fixtures: FixtureData[]; selectedLeague: string }) {
  const liveFixtures = fixtures.filter(f => f.status === 'live' && (selectedLeague === 'all' || f.league === selectedLeague));
  if (liveFixtures.length === 0) return null;

  // Duplicate items for seamless infinite scroll
  const scrollItems = [...liveFixtures, ...liveFixtures];
  const duration = liveFixtures.length * 4; // ~4s per card

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Now</span>
      </div>
      <div className="overflow-hidden">
        <div
          className="flex gap-3 pb-1 hover:[animation-play-state:paused]"
          style={{
            animation: `marquee ${duration}s linear infinite`,
          }}
        >
          {scrollItems.map((f, i) => (
            <Link
              key={`${f.id}-${i}`}
              to={`/match/${f.id}`}
              className="shrink-0 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 min-w-[200px] hover:border-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="text-[10px] text-zinc-500 mb-2 truncate">{f.league}</div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TeamLogo teamName={f.homeTeam} size={14} />
                    <div className="text-xs font-medium text-zinc-200 truncate">{f.homeTeam}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={f.awayTeam} size={14} />
                    <div className="text-xs font-medium text-zinc-200 truncate">{f.awayTeam}</div>
                  </div>
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
    </div>
  );
}

function AnimatedPremiumAd() {
  const { setShowPricingModal } = useUser();
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full bg-zinc-950 overflow-hidden">
      {/* 3D Spline Background */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isLoaded ? 'opacity-70' : 'opacity-0'}`}>
        {/* <Spline 
          scene="https://prod.spline.design/kZqon7WAhInm8Y8P/scene.splinecode" 
          onLoad={() => setIsLoaded(true)}
        /> */}
      </div>

      {/* Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50">
          <div className="w-8 h-8 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
        </div>
      )}

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
            <button onClick={() => setShowPricingModal(true, 'vip')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-zinc-950 font-bold rounded-xl hover:bg-gold-400 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)] text-sm">
              Go Premium Now <ArrowRight className="w-4 h-4" />
            </button>
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
    const isBrandAd = articles[currentIndex]?.id === 'promo-tambua-ad';
    const isCampaign = String(articles[currentIndex]?.id).startsWith('promo-campaign-');
    const delay = isCampaign ? 15000 : isPremiumAd ? 12000 : isBrandAd ? 10000 : 5000; // 15s campaign video, 12s premium ad, 10s brand ad, 5s others
    
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
              {item.isVideo && item.videoUrl ? (
                <video src={item.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
              )}
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
                    {item.id === 'promo-tambua-ad' ? 'Get Betting Tips' : 'Learn More'} <ArrowRight className="w-4 h-4" />
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

function QuickFixtures({ fixtures, selectedLeague }: { fixtures: FixtureData[]; selectedLeague: string }) {
  // Group by league
  const grouped = useMemo(() => {
    const filtered = selectedLeague === 'all' ? fixtures : fixtures.filter(f => f.league === selectedLeague);
    const map = new Map<string, FixtureData[]>();
    filtered.slice(0, 20).forEach(f => {
      const list = map.get(f.league) || [];
      list.push(f);
      map.set(f.league, list);
    });
    return Array.from(map.entries());
  }, [fixtures, selectedLeague]);

  return (
    <div className="space-y-4">
      {/* Show only first league on mobile if 'all' is selected, show all on desktop */}
      {grouped.map(([league, matches], index) => (
        <div key={league} className={`bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden ${selectedLeague === 'all' && index > 0 ? 'hidden sm:block' : ''}`}>
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{league}</h4>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {matches.slice(0, 5).map(f => (
              <Link key={f.id} to={`/match/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <TeamLogo teamName={f.homeTeam} size={16} />
                    <div className="text-sm text-zinc-200 truncate">{f.homeTeam}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={f.awayTeam} size={16} />
                    <div className="text-sm text-zinc-200 truncate">{f.awayTeam}</div>
                  </div>
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
      
      {/* Mobile View More Button */}
      {selectedLeague === 'all' && grouped.length > 1 && (
        <div className="sm:hidden pt-2">
          <Link to="/fixtures" className="w-full py-3 bg-zinc-800/50 text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-2 text-sm border border-zinc-700/50 hover:bg-zinc-800 transition-colors">
            View All Matches <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function LeagueFilter({ selectedLeague, onSelect }: { selectedLeague: string; onSelect: (league: string) => void }) {
  const leagues = Object.values(LEAGUES);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative group/filter">
      {/* Left scroll arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-500 transition-all opacity-0 group-hover/filter:opacity-100 shadow-lg backdrop-blur-sm"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#061f10] to-transparent z-[5] pointer-events-none opacity-0 group-hover/filter:opacity-100 transition-opacity" />

      {/* Scrollable pills */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1 scroll-smooth">
        <button
          onClick={() => onSelect('all')}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 border ${
            selectedLeague === 'all'
              ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-600'
          }`}
        >
          ⚽ All
        </button>
        {leagues.map(league => (
          <button
            key={league.id}
            onClick={() => onSelect(selectedLeague === league.name ? 'all' : league.name)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold tracking-wide transition-all hover:scale-105 active:scale-95 border ${
              selectedLeague === league.name
                ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { textContent: league.flag, className: 'text-base' })); }} />
            <span>{league.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#061f10] to-transparent z-[5] pointer-events-none" />

      {/* Right scroll arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-500 transition-all opacity-0 group-hover/filter:opacity-100 shadow-lg backdrop-blur-sm"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function HomePage() {
  usePageTitle('Home');
  const { setShowPricingModal } = useUser();
  const [fixtures, setFixtures] = useState<FixtureData[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsItem[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment Successful! Your account has been upgraded.');
      setSearchParams({});
    } else if (paymentStatus === 'cancel') {
      toast.error('Payment was cancelled or failed. Please try again.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Use a reliable league for default data if 'all' is selected
  const activeLeagueId = selectedLeague === 'all' ? LEAGUES.PREMIER_LEAGUE.id : 
    Object.values(LEAGUES).find(l => l.name === selectedLeague)?.id || LEAGUES.PREMIER_LEAGUE.id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fixturesData, newsData, standingsData, activeAds] = await Promise.all([
          fetchTodayFixtures().catch(() => []),
          fetchNews(1).catch(() => ({ articles: [], hasMore: false })),
          fetchStandings(activeLeagueId).catch(() => []),
          fetchActiveAds().catch(() => [])
        ]);
        setFixtures(fixturesData);
        
        let allNews = mixPromoSlides(newsData.articles, activeAds);
        
        // Inject Campaign into NewsCarousel if available
        if (activeCampaign) {
            allNews = [
                {
                    id: `promo-campaign-${activeCampaign.id}`,
                    title: activeCampaign.title,
                    description: activeCampaign.description || '',
                    category: 'Special Campaign',
                    image: activeCampaign.asset_image_url || FALLBACK_IMAGE,
                    link: '/pricing', // Direct to pricing page where they see discounts/extras
                    source: 'TambuaTips',
                    time: 'Now',
                    isVideo: !!activeCampaign.asset_video_url,
                    videoUrl: activeCampaign.asset_video_url || undefined
                },
                ...allNews
            ];
        }
        
        setNewsArticles(allNews);
        setStandings(standingsData || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedLeague, activeLeagueId, activeCampaign]);

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      {/* Top Banner for Campaign */}
      {activeCampaign && activeCampaign.banner_text && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 p-3 rounded-xl mb-6 shadow-lg shadow-emerald-500/20 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-white/10 w-full h-full skew-x-12 -translate-x-full animate-[shimmer_3s_infinite]" />
             <p className="font-bold text-zinc-950 flex items-center justify-center gap-2 text-sm">
                <Crown className="w-5 h-5 fill-zinc-950" /> 
                {activeCampaign.banner_text}
                {activeCampaign.incentive_type === 'discount' && (
                    <span className="bg-zinc-950 text-white text-[10px] uppercase px-2 py-0.5 rounded ml-2 shadow-sm font-black tracking-widest">
                        {activeCampaign.incentive_value}% OFF
                    </span>
                )}
             </p>
          </div>
      )}

      {/* League Filter */}
      <section className="mb-6">
        <LeagueFilter selectedLeague={selectedLeague} onSelect={setSelectedLeague} />
      </section>

      {/* Live Scoreboard */}
      <LiveScoreboard fixtures={fixtures} selectedLeague={selectedLeague} />

      {/* Main Grid: Flex on Mobile (Vertical Order), Grid on Desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-8 gap-6">
        
        {/* 1. HIGH-CONVERTING CTA (Mobile Priority #1, Desktop Top Left) */}
        <section className="order-1 lg:order-1 lg:col-span-2">
          <button onClick={() => setShowPricingModal(true, 'vip')} className="w-full text-left bg-gradient-to-r from-[#061f10] to-zinc-900 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-colors group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-emerald-500/10 p-2 sm:p-3 rounded-lg backdrop-blur-sm border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-wide text-sm sm:text-base">Get Premium Betting Tips</h3>
                <p className="text-emerald-400/80 text-[10px] sm:text-xs tracking-wide">Unlock expert VIP predictions today</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-center bg-emerald-500 text-zinc-950 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm group-hover:bg-emerald-400 transition-colors">
              Access Now <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </section>

        {/* 2. NEWS CAROUSEL (Mobile Priority #2, Desktop Middle Left) */}
        <section className="order-2 lg:order-2 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase">Latest News</h2>
            <Link to="/news" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <NewsCarousel articles={newsArticles} />
        </section>

        {/* 3. TODAY'S MATCHES (Mobile Priority #3, Desktop Bottom Left) */}
        <section className="order-3 lg:order-3 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold uppercase">Today's Matches</h2>
            <Link to="/fixtures" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              All Fixtures <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <QuickFixtures fixtures={fixtures} selectedLeague={selectedLeague} />
        </section>

        {/* 4. RIGHT SIDEBAR (Mobile Priority #4, Desktop Right Sidebar Spanning All Rows) */}
        <div className="order-4 lg:order-2 lg:col-span-1 lg:row-span-3 space-y-6">
          {/* Trending MatchesSnippet */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" /> Hot Matches
              </h3>
            </div>
            <div className="space-y-3">
              {(fixtures.filter(f => f.leagueId && EUROPEAN_LEAGUE_IDS.includes(f.leagueId)).length > 0 
                ? fixtures.filter(f => f.leagueId && EUROPEAN_LEAGUE_IDS.includes(f.leagueId)) 
                : fixtures).slice(0, 3).map(f => (
                <Link key={f.id} to={`/match/${f.id}`} className="block bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 hover:border-orange-500/30 transition-all">
                  <div className="text-xs text-zinc-500 mb-1">{f.league}</div>
                  <div className="flex justify-between items-center text-sm font-medium text-zinc-200">
                    <span className="inline-flex items-center gap-1">
                      <TeamLogo teamName={f.homeTeam} size={14} />
                      {f.homeTeam}
                      <span className="text-zinc-600 mx-0.5">vs</span>
                      <TeamLogo teamName={f.awayTeam} size={14} />
                      {f.awayTeam}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {f.status === 'live' ? <span className="text-emerald-400 animate-pulse">{f.score || 'LIVE'}</span> : new Date(f.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/fixtures" className="mt-4 w-full py-2.5 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
              See All Fixtures <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Standings Snippet */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Top Teams 
                <span className="text-zinc-500 font-normal truncate max-w-[120px]">
                  • {Object.values(LEAGUES).find(l => l.id === activeLeagueId)?.name || 'Premier League'}
                </span>
              </h3>
              <Link to="/standings" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Full Table</Link>
            </div>
            {standings.length > 0 ? (
              <div className="space-y-1">
                {standings.slice(0, 5).map(team => (
                  <div key={team.team.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50 transition-colors text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 text-center font-mono text-xs ${team.rank <= 4 ? 'text-emerald-400' : 'text-zinc-500'}`}>{team.rank}</span>
                      <img src={team.team.logo} alt="" className="w-5 h-5 object-contain" />
                      <span className="font-medium text-zinc-200 truncate max-w-[120px]">{team.team.name}</span>
                    </div>
                    <span className="font-bold text-white">{team.points} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">No standings available.</p>
            )}
            <Link to={`/standings?league=${activeLeagueId}`} className="mt-4 w-full py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
              View Full Standings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Social Proof */}
          <div className="rounded-2xl bg-gradient-to-br from-[#061f10] to-zinc-900 border border-emerald-500/20 p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Star className="w-24 h-24 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
              <Zap className="w-4 h-4 text-emerald-500" /> Join Our Community
            </h3>
            <p className="text-xs text-zinc-400 mb-5 relative z-10 leading-relaxed">
              Join over <strong className="text-emerald-400">15,000+</strong> members getting daily premium predictions, live alerts, and expert analysis.
            </p>
            <div className="space-y-3 relative z-10">
              <a href="https://t.me/tambuatips" target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#2AABEE]/10 text-[#2AABEE] border border-[#2AABEE]/20 font-bold rounded-xl hover:bg-[#2AABEE] hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm group">
                <span className="group-hover:-rotate-12 transition-transform"><FaTelegramPlane size={18} /></span> Join Telegram
              </a>
              <a href="https://whatsapp.com/channel/0029Vb7T8A9DOQIgpMjX7F0f" target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold rounded-xl hover:bg-[#25D366] hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm group">
                <span className="group-hover:scale-110 transition-transform"><FaWhatsapp size={18} /></span> WhatsApp Channel
              </a>
              <a href="https://www.tiktok.com/@tambuatips_.1?_r=1&_t=ZS-95BTHwRMkSL" target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold rounded-xl hover:bg-zinc-700 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm group">
                <span className="group-hover:-translate-y-0.5 transition-transform"><FaTiktok size={18} /></span> Follow on TikTok
              </a>
              <a href="https://www.instagram.com/tambuatips?igsh=MXNkN3d2c2dvaXN2cQ==" target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#E1306C]/10 text-[#E1306C] border border-[#E1306C]/20 font-bold rounded-xl hover:bg-[#E1306C] hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm group">
                <span className="group-hover:scale-110 transition-transform"><FaInstagram size={18} /></span> Follow on Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
