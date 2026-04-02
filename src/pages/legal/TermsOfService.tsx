import React from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

export function TermsOfService() {
  usePageTitle('Terms of Service');

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl font-sans text-zinc-300">
      <h1 className="text-3xl font-display font-bold text-white mb-6">Terms of Service</h1>
      <p className="mb-4 text-sm text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing or using TambuaTips, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access our service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. Service Description</h2>
          <p>
            TambuaTips is a unified sports intelligence, live scoring, and expert premium predictions platform. We provide data-driven insights which are for informational and entertainment purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. No Guaranteed Results</h2>
          <p>
            While our predictions are backed by intricate data analytics, sports outcomes are inherently unpredictable. TambuaTips makes no guarantees regarding the accuracy of predictions, and we are not liable for any financial losses incurred based on our tips. Betting should be done responsibly based on your own discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Intellectual Property</h2>
          <p>
            The service and its original content, features, functionalities, and premium prediction models are and will remain the exclusive property of TambuaTips. You are explicitly forbidden from reselling, redistributing, or scraping our premium predictions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Accounts & Subscriptions</h2>
          <p>
            To engage with our premium tips, an authentic Google Account is required. We reserve the right to ban or suspend access without prior notice or liability for any breach of these Terms, including suspected automation or unauthorized distribution of assets.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with standard international law distributions, without regard to its conflict of law provisions.
          </p>
        </section>
      </div>
    </div>
  );
}
