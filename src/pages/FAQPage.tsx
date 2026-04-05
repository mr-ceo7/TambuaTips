import React, { useState } from 'react';
import { SEO } from '../components/SEO';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FAQS = [
  {
    category: "General",
    questions: [
      { q: "What is TambuaTips?", a: "TambuaTips is an elite sports intelligence platform prioritizing high-accuracy predictions, match analysis, and live score tracking." },
      { q: "How accurate are your predictions?", a: "Our premium prediction models average an exceptionally high success rate, combining expert analysis and algorithmic scaling. However, no sports prediction can be 100% guaranteed. Play responsibly." },
      { q: "Are there free tips available?", a: "Yes, we release a curated selection of free tips daily. However, our highest confidence multiplier predictions are reserved for Premium subscribers." }
    ]
  },
  {
    category: "Billing & Subscriptions",
    questions: [
      { q: "How do I pay?", a: "We support fast and secure payments like M-Pesa natively from the site. Additionally, we accept PayPal and Skrill for international users." },
      { q: "Do subscriptions auto-renew?", a: "No. All TambuaTips subscriptions are strictly one-time payments. When your premium time expires, your access will be restricted until you manually initiate another payment." },
      { q: "Do you offer refunds?", a: "Due to the digital and timely nature of our insights, all transactions are final. Please review our Refund Policy for exact details." }
    ]
  }
];

export function FAQPage() {
  <SEO title={'FAQ'} />
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl font-sans text-zinc-300">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Frequently Asked Questions</h1>
        <p className="text-zinc-400">Everything you need to know about navigating TambuaTips seamlessly.</p>
      </div>
      
      <div className="space-y-8">
        {FAQS.map((section, sIndex) => (
          <div key={sIndex} className="mb-8">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">{section.category}</h2>
            <div className="space-y-3">
              {section.questions.map((faq, qIndex) => {
                const id = `${sIndex}-${qIndex}`;
                const isOpen = openIndex === id;
                return (
                  <div key={id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
                    <button
                      onClick={() => toggle(id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="font-bold text-white text-sm sm:text-base">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-6 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50 pt-3">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
