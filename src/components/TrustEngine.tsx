import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Target, Flame, ChevronLeft, ChevronRight, ExternalLink, Loader2, Search, ArrowLeft, Facebook, Twitter, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NewsCardSkeleton } from './skeletons/NewsCardSkeleton';

const PLAYER_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/800px-Cristiano_Ronaldo_2018.jpg", // Ronaldo
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/800px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg", // Messi
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Bukayo_Saka_2021.jpg/800px-Bukayo_Saka_2021.jpg", // Saka
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Erling_Haaland_2023_%28cropped%29.jpg/800px-Erling_Haaland_2023_%28cropped%29.jpg", // Haaland
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/2022_FIFA_World_Cup_France_4%E2%80%931_Australia_-_%287%29_%28cropped%29.jpg/800px-2022_FIFA_World_Cup_France_4%E2%80%931_Australia_-_%287%29_%28cropped%29.jpg" // Mbappe
];

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop";

interface NewsItem {
  id: number | string;
  title: string;
  source: string;
  time: string;
  image: string;
  category: string;
  link: string;
}

const BRAND_AD_ARTICLE: NewsItem = {
  id: 'promo-tambua-ad',
  title: "TAMBUA TIPS - KEEP YOUR TIPS UP",
  source: "TambuaTips",
  time: "Sponsored",
  image: "/brand-ad.jpeg",
  category: "Promo",
  link: "/tips"
};

export function TrustEngine() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  const fetchNews = async (pageNum: number) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsFetchingMore(true);

      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=5&page=${pageNum}`);
      const data = await res.json();
      
      if (data && data.articles && data.articles.length > 0) {
        const newArticles = data.articles.map((article: any, index: number) => ({
          id: article.id || `${pageNum}-${index}`,
          title: article.headline,
          source: article.source || "ESPN FC",
          time: new Date(article.published).toLocaleDateString(),
          image: PLAYER_IMAGES[(newsItems.length + index) % PLAYER_IMAGES.length],
          category: article.categories?.[0]?.description || "Premier League",
          link: article.links?.web?.href || "#"
        }));
        
        setNewsItems(prev => {
          const combined = pageNum === 1 ? newArticles : [...prev, ...newArticles];
          const uniqueMap = new Map();
          combined.forEach(item => {
            if (!uniqueMap.has(item.id)) {
              uniqueMap.set(item.id, item);
            }
          });
          return Array.from(uniqueMap.values());
        });
        setHasMore(data.articles.length === 5);
      } else {
        if (pageNum === 1) {
          setNewsItems([BRAND_AD_ARTICLE]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to fetch news", error);
      if (pageNum === 1) {
        setNewsItems([BRAND_AD_ARTICLE]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchNews(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filteredNewsItems = useMemo(() => {
    return newsItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      return matchesSearch && matchesCategory;
    });
  }, [newsItems, searchQuery, selectedCategories]);

  const categories = useMemo(() => {
    const cats = new Set(newsItems.map(item => item.category));
    return Array.from(cats);
  }, [newsItems]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  // Reset index when filters change
  useEffect(() => {
    setCurrentNewsIndex(0);
  }, [searchQuery, selectedCategories]);

  const nextNews = () => {
    if (filteredNewsItems.length === 0) return;
    
    if (currentNewsIndex >= filteredNewsItems.length - 1) {
      // If we are at the end, and no filters are applied, and there's more to fetch
      if (hasMore && searchQuery === '' && selectedCategories.length === 0 && !isFetchingMore) {
        setPage(p => p + 1);
      } else {
        setCurrentNewsIndex(0);
      }
    } else {
      setCurrentNewsIndex(prev => prev + 1);
    }
  };

  const prevNews = () => {
    if (filteredNewsItems.length === 0) return;
    setCurrentNewsIndex((prev) => (prev - 1 + filteredNewsItems.length) % filteredNewsItems.length);
  };

  // Auto-rotate
  const nextNewsRef = useRef(nextNews);
  useEffect(() => {
    nextNewsRef.current = nextNews;
  }, [nextNews]);

  useEffect(() => {
    if (filteredNewsItems.length === 0 || selectedArticle) return;
    const timer = setInterval(() => {
      nextNewsRef.current();
    }, 5000);
    return () => clearInterval(timer);
  }, [filteredNewsItems.length, selectedArticle]);

  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return newsItems
      .filter(item => item.category === selectedArticle.category && item.id !== selectedArticle.id)
      .slice(0, 3);
  }, [selectedArticle, newsItems]);

  const safeIndex = Math.min(currentNewsIndex, Math.max(0, filteredNewsItems.length - 1));

  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-3 mb-8 sm:mb-12">
      <div className="md:col-span-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-6 backdrop-blur-sm flex flex-col relative overflow-hidden group">
        
        {loading && filteredNewsItems.length === 0 ? (
          <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <NewsCardSkeleton />
          </div>
        ) : selectedArticle ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-full"
          >
            <button 
              onClick={() => setSelectedArticle(null)} 
              className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 w-fit transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Back to News
            </button>
            <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden mb-6 shrink-0">
               <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
               <div className="absolute inset-0 bg-linear-to-t from-zinc-950 to-transparent" />
               <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block px-2.5 py-1 bg-emerald-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded mb-2">{selectedArticle.category}</span>
                  <h3 className="text-xl sm:text-3xl font-display font-bold text-white leading-tight">{selectedArticle.title}</h3>
               </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
               <div className="flex items-center gap-3 text-sm text-zinc-400">
                 <span className="font-medium text-emerald-400">{selectedArticle.source}</span>
                 <span className="w-1 h-1 rounded-full bg-zinc-600" />
                 <span>{selectedArticle.time}</span>
               </div>
               <div className="flex items-center gap-2">
                 <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(selectedArticle.link)}&text=${encodeURIComponent(selectedArticle.title)}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-all hover:scale-110 active:scale-95" title="Share on Twitter"><Twitter className="w-4 h-4" /></a>
                 <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(selectedArticle.link)}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#4267B2]/10 text-[#4267B2] hover:bg-[#4267B2]/20 transition-all hover:scale-110 active:scale-95" title="Share on Facebook"><Facebook className="w-4 h-4" /></a>
                 <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(selectedArticle.title + ' ' + selectedArticle.link)}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all hover:scale-110 active:scale-95" title="Share on WhatsApp"><MessageCircle className="w-4 h-4" /></a>
               </div>
            </div>
            <a href={selectedArticle.link} target="_blank" rel="noreferrer" className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 mb-8">
              Read Full Article on {selectedArticle.source} <ExternalLink className="w-4 h-4" />
            </a>

            {relatedArticles.length > 0 && (
              <div className="mt-auto">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Related News</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedArticles.map(rel => (
                    <div key={rel.id} onClick={() => setSelectedArticle(rel)} className="cursor-pointer group flex flex-col gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-2 hover:border-emerald-500/50 transition-colors">
                      <img src={rel.image} alt={rel.title} className="w-full h-24 rounded object-cover shrink-0" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                      <div className="flex flex-col flex-1">
                        <h5 className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors line-clamp-2">{rel.title}</h5>
                        <span className="text-[10px] text-zinc-500 mt-auto pt-1">{rel.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4 z-10 relative">
              <div>
                <h2 className="text-lg sm:text-xl font-display font-bold text-white">Latest Football News</h2>
                <p className="text-xs sm:text-sm text-zinc-400">Trending stories across the globe</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevNews}
                  disabled={loading || filteredNewsItems.length === 0}
                  className="h-8 w-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={nextNews}
                  disabled={loading || filteredNewsItems.length === 0}
                  className="h-8 w-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4 z-10 relative">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search news..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all hover:scale-105 active:scale-95 ${selectedCategories.includes(cat) ? 'bg-emerald-500 text-zinc-950 border-emerald-500 font-bold' : 'bg-zinc-950/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
                  >
                    {cat}
                  </button>
                ))}
                {(selectedCategories.length > 0 || searchQuery) && (
                  <button 
                    onClick={clearFilters} 
                    className="px-3 py-1 text-xs rounded-full border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 relative w-full min-h-[200px] sm:min-h-[240px] rounded-xl overflow-hidden z-10 bg-zinc-950/50">
              {loading && filteredNewsItems.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Loading News...</span>
                </div>
              ) : filteredNewsItems.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={filteredNewsItems[safeIndex].id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => setSelectedArticle(filteredNewsItems[safeIndex])}
                  >
                    <img 
                      src={filteredNewsItems[safeIndex].image} 
                      alt={filteredNewsItems[safeIndex].title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                      <span className="inline-block px-2.5 py-1 bg-emerald-500/90 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded mb-3">
                        {filteredNewsItems[safeIndex].category}
                      </span>
                      <h3 className="text-lg sm:text-2xl font-display font-bold text-white leading-tight mb-2 group-hover:text-emerald-400 transition-colors">
                        {filteredNewsItems[safeIndex].title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-300">
                        <span className="font-medium text-emerald-400">{filteredNewsItems[safeIndex].source}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-600" />
                        <span>{filteredNewsItems[safeIndex].time}</span>
                        <span className="ml-auto flex items-center gap-1 text-zinc-400 group-hover:text-white transition-colors">
                          View Details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm text-zinc-500">No news found matching your criteria.</span>
                </div>
              )}
              
              {isFetchingMore && (
                <div className="absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2 border border-zinc-700">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                  <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-bold">Loading more...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 backdrop-blur-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <Target className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-400">March Win Rate</p>
            <p className="text-xl sm:text-2xl font-display font-bold text-white">72.4%</p>
          </div>
        </div>
        
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 backdrop-blur-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-400">Current Streak</p>
            <p className="text-xl sm:text-2xl font-display font-bold text-white">5 Wins 🔥</p>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 backdrop-blur-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-400">Avg. Odds</p>
            <p className="text-xl sm:text-2xl font-display font-bold text-white">1.95</p>
          </div>
        </div>
      </div>
    </div>
  );
}
