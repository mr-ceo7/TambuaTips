import React from 'react';
import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    price: 'KES 0',
    period: 'forever',
    description: 'Perfect for casual bettors getting started.',
    features: ['2-3 free tips daily', 'Basic match stats', 'Community access'],
    buttonText: 'Start Free',
    popular: false,
  },
  {
    name: 'Premium Daily',
    price: 'KES 50',
    period: 'per day',
    description: 'Full access to all tips for 24 hours.',
    features: ['All VIP tips', 'Odds comparison', 'Live match tracking', 'Expert analysis'],
    buttonText: 'Pay via M-Pesa',
    popular: true,
  },
  {
    name: 'VIP Monthly',
    price: 'KES 500',
    period: 'per month',
    description: 'The ultimate betting intelligence package.',
    features: ['Everything in Daily', 'Priority push notifications', 'Personal win rate tracker', 'Cancel anytime'],
    buttonText: 'Subscribe Now',
    popular: false,
  },
];

export function Pricing() {
  return (
    <div className="py-8 sm:py-12">
      <div className="text-center mb-8 sm:mb-10 px-4">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3 sm:mb-4">Choose Your Tier</h2>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
          Stop guessing. Start investing. Get access to our premium betting intelligence hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 max-w-5xl mx-auto px-4 sm:px-0">
        {tiers.map((tier) => (
          <div 
            key={tier.name}
            className={`relative rounded-2xl border ${tier.popular ? 'border-emerald-500 bg-zinc-900/80 shadow-xl shadow-emerald-500/10' : 'border-zinc-800 bg-zinc-950/50'} p-5 sm:p-6 flex flex-col backdrop-blur-sm`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap">
                Most Popular
              </div>
            )}
            
            <div className="mb-5 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2">{tier.name}</h3>
              <p className="text-xs sm:text-sm text-zinc-400 h-10">{tier.description}</p>
            </div>
            
            <div className="mb-5 sm:mb-6 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-display font-bold text-white">{tier.price}</span>
              <span className="text-xs sm:text-sm text-zinc-500">/{tier.period}</span>
            </div>
            
            <ul className="mb-6 sm:mb-8 flex-1 space-y-2.5 sm:space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-zinc-300">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-sm sm:text-base font-bold transition-all hover:scale-105 active:scale-95 ${tier.popular ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
              {tier.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
