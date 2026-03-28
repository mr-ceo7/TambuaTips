import apiClient from './apiClient';

export interface NewsItem {
  id: number | string;
  title: string;
  source: string;
  time: string;
  image: string;
  category: string;
  link: string;
}

const PLAYER_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/800px-Cristiano_Ronaldo_2018.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/800px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Bukayo_Saka_2021.jpg/800px-Bukayo_Saka_2021.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Erling_Haaland_2023_%28cropped%29.jpg/800px-Erling_Haaland_2023_%28cropped%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/2022_FIFA_World_Cup_France_4%E2%80%931_Australia_-_%287%29_%28cropped%29.jpg/800px-2022_FIFA_World_Cup_France_4%E2%80%931_Australia_-_%287%29_%28cropped%29.jpg",
];

export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop";

export const BRAND_AD_ARTICLE: NewsItem = {
  id: 'promo-tambua-ad',
  title: "TAMBUA TIPS - KEEP YOUR TIPS UP",
  source: "TambuaTips",
  time: "Sponsored",
  image: "/brand-ad.jpeg",
  category: "Promo",
  link: "/tips"
};

export const PROMO_SLIDES: NewsItem[] = [
  BRAND_AD_ARTICLE,
  {
    id: 'promo-referral',
    title: '🎁 Invite Friends & Get Free Daily Tips! Share your referral link and unlock exclusive predictions.',
    source: 'TambuaTips',
    time: '',
    image: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800&auto=format&fit=crop',
    category: 'Promo',
    link: '/tips',
  },
  {
    id: 'promo-premium',
    title: '🏆 Go Premium — Get Exclusive Expert Tips with 75%+ Win Rate. Join the winning team today!',
    source: 'TambuaTips',
    time: '',
    image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop',
    category: 'Promo',
    link: '/tips',
  },
  {
    id: 'promo-subscribe',
    title: '🔔 Never Miss a Winning Tip! Subscribe for daily free picks and premium alerts delivered straight to you.',
    source: 'TambuaTips',
    time: '',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop',
    category: 'Promo',
    link: '/tips',
  },
];

export async function fetchNews(page: number = 1): Promise<{ articles: NewsItem[]; hasMore: boolean }> {
  try {
    const response = await apiClient.get(`/news?page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return {
      articles: [BRAND_AD_ARTICLE],
      hasMore: false,
    };
  }
}

export function mixPromoSlides(articles: NewsItem[]): NewsItem[] {
  const result: NewsItem[] = [];
  let promoIndex = 0;
  
  for (let i = 0; i < articles.length; i++) {
    result.push(articles[i]);
    if ((i + 1) % 3 === 0 && promoIndex < PROMO_SLIDES.length) {
      result.push(PROMO_SLIDES[promoIndex]);
      promoIndex++;
    }
  }
  
  return result;
}
