/**
 * Pricing Service — Admin-configurable subscription tiers stored in localStorage.
 */

import type { TipCategory } from './tipsService';

const PRICING_KEY = 'tambuatips_pricing';

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price2wk: number; // KES
  price4wk: number; // KES
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

/**
 * Map of which tier is required for each category.
 */
export const CATEGORY_LABELS: Record<TipCategory, { label: string; minTier: SubscriptionTier }> = {
  'free': { label: 'Free Tips', minTier: 'free' },
  '2+': { label: '2+ Odds', minTier: 'standard' },
  '4+': { label: '4+ Odds', minTier: 'basic' },
  'gg': { label: 'GG (BTTS)', minTier: 'standard' },
  '10+': { label: '10+ Odds', minTier: 'premium' },
  'vip': { label: 'VIP Special (80+)', minTier: 'premium' },
};

/**
 * Tier hierarchy for access checks.
 */
const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  standard: 2,
  premium: 3,
};

export function hasAccessToCategory(userTier: SubscriptionTier, category: TipCategory): boolean {
  const requiredTier = CATEGORY_LABELS[category].minTier;
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

// ─── CRUD ────────────────────────────────────────────────────

function loadPricing(): TierConfig[] {
  try {
    const raw = localStorage.getItem(PRICING_KEY);
    if (!raw) return DEFAULT_TIERS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TIERS;
  }
}

function savePricing(tiers: TierConfig[]): void {
  localStorage.setItem(PRICING_KEY, JSON.stringify(tiers));
}

export function getPricingTiers(): TierConfig[] {
  return loadPricing();
}

export function updatePricingTier(tierId: SubscriptionTier, updates: Partial<Pick<TierConfig, 'price2wk' | 'price4wk' | 'description' | 'name'>>): TierConfig | null {
  const tiers = loadPricing();
  const index = tiers.findIndex(t => t.id === tierId);
  if (index === -1) return null;

  tiers[index] = { ...tiers[index], ...updates };
  savePricing(tiers);
  return tiers[index];
}

export function resetPricing(): void {
  savePricing(DEFAULT_TIERS);
}
