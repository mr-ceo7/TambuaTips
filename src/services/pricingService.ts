import type { TipCategory } from './tipsService';
import apiClient from './apiClient';
import { toast } from 'sonner';

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price2wk: number;
  price4wk: number;
  categories: TipCategory[];
  popular: boolean;
  currency?: string;
  currency_symbol?: string;
  regional_prices?: Record<string, any>;
  originalPrice2wk?: number;
  originalPrice4wk?: number;
}

const DEFAULT_TIERS: TierConfig[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for casual bettors who want solid low-odds tips.',
    price2wk: 550,
    price4wk: 860,
    categories: ['free', '2+'],
    popular: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'All Basic tips plus 4+ Odds and GG picks for consistent wins.',
    price2wk: 1250,
    price4wk: 2000,
    categories: ['free', '2+', '4+', 'gg'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'The ultimate package — everything including VIP specials and high-odds tips.',
    price2wk: 2500,
    price4wk: 4500,
    categories: ['free', '2+', '4+', 'gg', '10+', 'vip'],
    popular: false,
  },
];

export const CATEGORY_LABELS: Record<TipCategory, { label: string; minTier: SubscriptionTier }> = {
  'free': { label: 'Free Tips', minTier: 'free' },
  '2+': { label: '2+ Odds', minTier: 'basic' },
  '4+': { label: '4+ Odds', minTier: 'standard' },
  'gg': { label: 'GG (BTTS)', minTier: 'standard' },
  '10+': { label: '10+ Odds', minTier: 'premium' },
    'vip': { label: 'VIP Special (80+)', minTier: 'premium' },
};

let cachedTiers: TierConfig[] = [...DEFAULT_TIERS];

export function hasAccessToCategory(userTier: SubscriptionTier, category: TipCategory): boolean {
    if (category === 'free') return true;
    if (userTier === 'premium') return true;
    
    // Check if the current tier explicitly contains the category
    const tierConfig = cachedTiers.find(t => t.id === userTier);
    if (tierConfig && tierConfig.categories.includes(category)) {
        return true;
    }
    
    // Fallback logic for legacy users
    const TIER_RANK: Record<string, number> = { free: 0, basic: 1, standard: 2, premium: 3 };
    const requiredTier = CATEGORY_LABELS[category]?.minTier || 'premium';
    return (TIER_RANK[userTier] || 0) >= (TIER_RANK[requiredTier] || 3);
}

import { detectUserCountry } from './geoService';

export async function getPricingTiers(): Promise<TierConfig[]> {
  try {
    const country = await detectUserCountry();
    const query = country ? `?country=${country}` : '';
    const response = await apiClient.get(`/subscriptions/tiers${query}`);
    if (response.data && response.data.length > 0) {
      return response.data.map((t: any) => ({
        id: t.tier_id,
        name: t.name,
        description: t.description,
        price2wk: t.price_2wk,
        price4wk: t.price_4wk,
        categories: Array.isArray(t.categories) ? t.categories : JSON.parse(t.categories || '[]'),
        popular: t.popular,
        currency: t.currency || 'KES',
        currency_symbol: t.currency_symbol || 'KES',
        regional_prices: t.regional_prices || {},
        originalPrice2wk: t.original_price_2wk,
        originalPrice4wk: t.original_price_4wk,
      }));
      cachedTiers = [...mappedTiers];
      return mappedTiers;
    }
    return cachedTiers;
  } catch (error) {
    console.error('Failed to fetch pricing tiers, falling back to default', error);
    return cachedTiers;
  }
}

export async function updatePricingTier(tierId: string, updates: Partial<TierConfig>): Promise<TierConfig | null> {
  try {
    const payload = {
      name: updates.name,
      description: updates.description,
      price_2wk: updates.price2wk,
      price_4wk: updates.price4wk,
      categories: updates.categories,
      popular: updates.popular,
      regional_prices: updates.regional_prices,
    };
    const response = await apiClient.put(`/subscriptions/tiers/${tierId}`, payload);
    const t = response.data;
    return {
      id: t.tier_id,
      name: t.name,
      description: t.description,
      price2wk: t.price_2wk,
      price4wk: t.price_4wk,
      categories: Array.isArray(t.categories) ? t.categories : JSON.parse(t.categories || '[]'),
      popular: t.popular,
    };
  } catch (error) {
    console.error('Failed to update tier', error);
    toast.error('Failed to update pricing tier');
    return null;
  }
}

export async function addPricingTier(tierData: Omit<TierConfig, 'id'> & { tier_id: string }): Promise<TierConfig | null> {
  try {
    const payload = {
      tier_id: tierData.tier_id,
      name: tierData.name,
      description: tierData.description,
      price_2wk: tierData.price2wk,
      price_4wk: tierData.price4wk,
      categories: tierData.categories,
      popular: tierData.popular || false,
    };
    const response = await apiClient.post('/subscriptions/tiers', payload);
    const t = response.data;
    return {
      id: t.tier_id,
      name: t.name,
      description: t.description,
      price2wk: t.price_2wk,
      price4wk: t.price_4wk,
      categories: t.categories,
      popular: t.popular,
    };
  } catch (error) {
    console.error('Failed to add tier', error);
    toast.error('Failed to create new tier');
    return null;
  }
}

export async function deletePricingTier(tierId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/subscriptions/tiers/${tierId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete tier', error);
    toast.error('Failed to delete tier');
    return false;
  }
}
