import type { TipCategory } from './tipsService';
import apiClient from './apiClient';

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price2wk: number;
  price4wk: number;
  categories: TipCategory[];
  popular: boolean;
}

const DEFAULT_TIERS: TierConfig[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for casual bettors who want solid mid-range tips.',
    price2wk: 550,
    price4wk: 860,
    categories: ['free', '4+'],
    popular: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'All Basic tips plus low-odds and GG picks for consistent wins.',
    price2wk: 1250,
    price4wk: 2000,
    categories: ['free', '4+', '2+', 'gg'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'The ultimate package — everything including VIP specials and high-odds tips.',
    price2wk: 2500,
    price4wk: 4500,
    categories: ['free', '4+', '2+', 'gg', '10+', 'vip'],
    popular: false,
  },
];

export const CATEGORY_LABELS: Record<TipCategory, { label: string; minTier: SubscriptionTier }> = {
  'free': { label: 'Free Tips', minTier: 'free' },
  '2+': { label: '2+ Odds', minTier: 'standard' },
  '4+': { label: '4+ Odds', minTier: 'basic' },
  'gg': { label: 'GG (BTTS)', minTier: 'standard' },
  '10+': { label: '10+ Odds', minTier: 'premium' },
  'vip': { label: 'VIP Special (80+)', minTier: 'premium' },
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  standard: 2,
  premium: 3,
};

export function hasAccessToCategory(userTier: SubscriptionTier, category: TipCategory): boolean {
  const requiredTier = CATEGORY_LABELS[category]?.minTier || 'premium';
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export async function getPricingTiers(): Promise<TierConfig[]> {
  try {
    const response = await apiClient.get('/subscriptions/tiers');
    if (response.data && response.data.length > 0) {
      return response.data.map((t: any) => ({
        id: t.tier_id,
        name: t.name,
        description: t.description,
        price2wk: t.price_2wk,
        price4wk: t.price_4wk,
        categories: Array.isArray(t.features) ? t.features : JSON.parse(t.features || '[]'),
        popular: t.is_popular,
      }));
    }
    return DEFAULT_TIERS;
  } catch (error) {
    console.error('Failed to fetch pricing tiers, falling back to default', error);
    return DEFAULT_TIERS;
  }
}

export async function updatePricingTier(tierId: SubscriptionTier, updates: Partial<TierConfig>): Promise<TierConfig | null> {
  console.warn("Pricing updates are not yet supported in the FastAPI backend.");
  return null;
}
