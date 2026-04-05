import React from 'react';
import { SEO } from '../../components/SEO';

export function RefundPolicy() {
  <SEO title={'Refund Policy'} />

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl font-sans text-zinc-300">
      <h1 className="text-3xl font-display font-bold text-white mb-6">Refund & Cancellation Policy</h1>
      <p className="mb-4 text-sm text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Digital Goods and Services</h2>
          <p>
            TambuaTips is a provider of digital intelligence services, specifically premium sports predictions and related analytical data. Due to the immediate and intangible nature of these digital goods, all sales are considered final. Once our premium tips or jackpots have been accessed or delivered, the transaction cannot be undone.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. Strictly NO Refunds</h2>
          <p>
            We adhere to a strict <strong className="text-white">NO REFUND</strong> policy on all subscriptions and individual jackpot purchases. TambuaTips provides expert intelligence but we do not guarantee exact outcomes of sporting events. Financial losses resulting from utilizing our platform's insights do not entitle users to a refund of their subscription fees.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. Billing & Expirations</h2>
          <p>
            All TambuaTips subscription plans are strictly one-time prepaid accesses. We do not engage in any auto-renewal matrices. Once your prepaid duration lapses, access is automatically gracefully revoked until a manual renewal happens. Since we do not auto-renew, the concept of "subscription cancellation" does not apply.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Fraudulent Transactions</h2>
          <p>
            In instances of clear fraudulent transactions processed without the account owner's authorization, please immediately contact your pertinent payment provider and then our support team at <a href="mailto:tambuatips@gmail.com" className="text-emerald-400 hover:text-emerald-300">tambuatips@gmail.com</a> for an immediate account lockdown investigation.
          </p>
        </section>
      </div>
    </div>
  );
}
