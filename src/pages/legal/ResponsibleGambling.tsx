import React from 'react';
import { SEO } from '../../components/SEO';

export function ResponsibleGambling() {
  <SEO title={'Responsible Gambling'} />

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl font-sans text-zinc-300">
      <h1 className="text-3xl font-display font-bold text-white mb-6">Responsible Gambling</h1>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8 text-center text-red-400 font-medium">
          TambuaTips promotes strictly 18+ betting exclusively. Gambling can be highly addictive. Please play responsibly.
        </div>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Our Commitment</h2>
          <p>
            At TambuaTips, we are dedicated to providing sports intelligence while emphasizing that sports betting is a leisure activity. We encourage all our users to remain analytical, unemotional, and to never wager more than they can afford to lose.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Recognize The Signs</h2>
          <p>
            It is crucial to recognize the potential pitfalls of gambling. Please ask yourself if:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
            <li>You treat betting as a source of income rather than entertainment.</li>
            <li>You chase losses immediately with larger bets.</li>
            <li>You have jeopardized relationships, jobs, or education because of betting.</li>
            <li>You borrow money or sell assets to finance your betting activities.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Tips for Staying in Control</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
            <li>Always establish a fixed, expendable bankroll before placing any bets.</li>
            <li>Respect the boundaries of your predefined bankroll strictly.</li>
            <li>Take regular breaks from tracking fixtures and scores.</li>
            <li>Do not bet while under the influence of strong emotions or alcohol.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Getting Help</h2>
          <p>
            If you or someone you know exhibits problematic gambling behaviors, we urge you to seek professional assistance. Numerous global and localized foundations (e.g., Gamblers Anonymous, BeGambleAware) provide anonymous, free counseling and guidance. Protect your legacy.
          </p>
        </section>
      </div>
    </div>
  );
}
