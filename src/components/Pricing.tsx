import React, { useState, useEffect } from 'react';
import { Check, Zap, Star, Crown } from 'lucide-react';
import { getPricingTiers, type TierConfig, CATEGORY_LABELS } from '../services/pricingService';
import { useUser } from '../context/UserContext';

const TIER_ICONS: Record<string, React.ElementType> = {
  basic: Zap,
  standard: Star,
  premium: Crown,
};

const TIER_COLORS: Record<string, { border: string; glow: string; button: string; badge: string }> = {
  basic: {
    border: 'border-zinc-700',
    glow: '',
    button: 'bg-zinc-700 text-white hover:bg-zinc-600',
    badge: '',
  },
  standard: {
    border: 'border-emerald-500',
    glow: 'shadow-xl shadow-emerald-500/10',
    button: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20',
    badge: 'bg-emerald-500 text-zinc-950',
  },
  premium: {
    border: 'border-gold-500/50',
    glow: 'shadow-xl shadow-gold-500/10',
    button: 'bg-gold-500 text-zinc-950 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/20',
    badge: '',
  },
};

export function Pricing() {
  const [duration, setDuration] = useState<'2wk' | '4wk'>('2wk');
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const { user, setShowAuthModal, setShowPricingModal } = useUser();

  useEffect(() => {
    getPricingTiers().then(setTiers);
  }, []);

  const handleSelect = () => {
    if (!user) setShowAuthModal(true);
    else setShowPricingModal(true);
  };

  return (
    <div className="py-8 sm:py-12">
      <div className="text-center mb-8 sm:mb-10 px-4">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3 sm:mb-4">Choose Your Plan</h2>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mb-6">
          Stop guessing. Start winning. Get access to our expert predictions.
        </p>

        {/* Duration Toggle */}
        <div className="inline-flex items-center bg-zinc-900 rounded-xl border border-zinc-800 p-1">
          <button
            onClick={() => setDuration('2wk')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              duration === '2wk'
                ? 'bg-emerald-500 text-zinc-950 shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            2 Weeks
          </button>
          <button
            onClick={() => setDuration('4wk')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all relative ${
              duration === '4wk'
                ? 'bg-emerald-500 text-zinc-950 shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            4 Weeks
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">SAVE</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 max-w-5xl mx-auto px-4 sm:px-0">
        {tiers.map((tier) => {
          const colors = TIER_COLORS[tier.id] || TIER_COLORS.basic;
          const Icon = TIER_ICONS[tier.id] || Zap;
          const price = duration === '2wk' ? tier.price2wk : tier.price4wk;

          return (
            <div 
              key={tier.id}
              className={`relative rounded-2xl border ${colors.border} ${tier.popular ? colors.glow : ''} bg-zinc-950/50 p-5 sm:p-6 flex flex-col backdrop-blur-sm`}
            >
              {tier.popular && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${colors.badge} text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap`}>
                  Most Popular
                </div>
              )}
              
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${tier.id === 'premium' ? 'bg-gold-500/20 text-gold-400' : tier.id === 'standard' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{tier.name}</h3>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 h-10">{tier.description}</p>
              </div>
              
              <div className="mb-5 sm:mb-6 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-display font-bold text-white">{tier.currency_symbol || 'KES'} {price.toLocaleString(undefined, {minimumFractionDigits: price % 1 !== 0 ? 2 : 0})}</span>
                <span className="text-xs sm:text-sm text-zinc-500">/{duration === '2wk' ? '2 weeks' : '4 weeks'}</span>
              </div>
              
              {/* Included categories */}
              <ul className="mb-6 sm:mb-8 flex-1 space-y-2.5 sm:space-y-3">
                {tier.categories.filter(c => c !== 'free').map((cat) => (
                  <li key={cat} className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-zinc-300">
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{CATEGORY_LABELS[cat]?.label || cat}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-zinc-300">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Free daily tips included</span>
                </li>
                {tier.id === 'premium' && (
                  <li className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-zinc-300">
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Priority support & alerts</span>
                  </li>
                )}
              </ul>
              
              <button 
                onClick={handleSelect}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-sm sm:text-base font-bold transition-all hover:scale-105 active:scale-95 ${colors.button}`}
              >
                Get {tier.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
