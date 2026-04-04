import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Loader2, Search, ExternalLink, ArrowLeft, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { fetchNews, FALLBACK_IMAGE, type NewsItem } from '../services/newsService';
import { usePageTitle } from '../hooks/usePageTitle';

const BRAND_AD_ARTICLE: NewsItem = {
  id: 'promo-tambua-ad',
  title: "TAMBUA TIPS - KEEP YOUR TIPS UP",
  source: "TambuaTips",
  time: "Sponsored",
  image: "/brand-ad.jpeg",
  category: "Promo",
  link: "/tips"
};

export function NewsPage() {
  usePageTitle('Football News');
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastArticleElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore || loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, { rootMargin: '200px' }); // Load a bit early
    
    if (node) observer.current.observe(node);
  }, [loadingMore, loading, hasMore]);

  useEffect(() => {
    const load = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await fetchNews(page);
        setArticles(prev => {
          const combined = page === 1 ? data.articles : [...prev, ...data.articles];
          const uniqueMap = new Map<string | number, NewsItem>();
          combined.forEach(item => { if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item); });
          return Array.from(uniqueMap.values());
        });
        if (data.articles.length === 0 && page === 1) {
          setArticles([BRAND_AD_ARTICLE]);
        }
        setHasMore(data.hasMore);
      } catch (err) {
        console.error('Failed to load news:', err);
        if (page === 1) {
          setArticles([BRAND_AD_ARTICLE]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    load();
  }, [page]);

  const categories = useMemo(() => Array.from(new Set(articles.map(a => a.category))), [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory && a.category !== selectedCategory) return false;
      return true;
    });
  }, [articles, searchQuery, selectedCategory]);

  if (selectedArticle) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-3xl">
        <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to News
        </button>
        <div className="rounded-2xl overflow-hidden mb-6">
          <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-48 sm:h-72 object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
        </div>
        <span className="inline-block px-2.5 py-1 bg-emerald-500/90 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded mb-3">
          {selectedArticle.category}
        </span>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight mb-4">{selectedArticle.title}</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-400 mb-6">
          <span className="font-medium text-emerald-400">{selectedArticle.source}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          <span>{selectedArticle.time}</span>
        </div>
        <div className="flex items-center gap-2 mb-8">
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(selectedArticle.link)}&text=${encodeURIComponent(selectedArticle.title)}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-all hover:scale-110">
            <Twitter className="w-4 h-4" />
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(selectedArticle.link)}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#4267B2]/10 text-[#4267B2] hover:bg-[#4267B2]/20 transition-all hover:scale-110">
            <Facebook className="w-4 h-4" />
          </a>
          <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(selectedArticle.title + ' ' + selectedArticle.link)}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all hover:scale-110">
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
        <a href={selectedArticle.link} target="_blank" rel="noreferrer" className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
          Read Full Article <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase mb-2">Football News</h1>
        <p className="text-sm text-zinc-400">Trending stories across the globe</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${!selectedCategory ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${cat === selectedCategory ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="h-44 bg-zinc-800 w-full" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-zinc-800 rounded w-full" />
                <div className="h-4 bg-zinc-800 rounded w-2/3" />
                <div className="flex gap-2 pt-2">
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <p className="text-zinc-400">No articles found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredArticles.map((article, index) => {
              const isLast = index === filteredArticles.length - 1;
              return (
                <div
                  key={article.id}
                  ref={isLast ? lastArticleElementRef : null}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer group hover:border-emerald-500/30 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-emerald-500/90 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded">{article.category}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-zinc-200 leading-snug mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">{article.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-medium text-emerald-400/70">{article.source}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{article.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && loadingMore && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={`more-${i}`} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="h-44 bg-zinc-800 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-full" />
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-3 w-16 bg-zinc-800 rounded" />
                      <div className="h-3 w-16 bg-zinc-800 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
