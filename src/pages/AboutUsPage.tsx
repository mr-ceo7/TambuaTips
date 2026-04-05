import React from 'react';
import { SEO } from '../components/SEO';
import { Trophy, Target, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export function AboutUsPage() {
  <SEO title={'About Us'} />

  return (
    <div className="container mx-auto px-4 py-8 sm:py-16 max-w-4xl font-sans text-zinc-300">
      
      {/* Hero Section */}
      <div className="text-center mb-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Trophy className="h-10 w-10" />
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-6 tracking-tight">
          Stop Guessing. <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-emerald-600">Start Winning.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          TambuaTips is Africa's premier sports intelligence agency. We blend raw statistical algorithms with human expert intuition to deliver the highest-probability betting insights on the market.
        </p>
      </div>

      {/* Core Values Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Unmatched Accuracy</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Every premium tip we dispatch undergoes rigorous filtering. We track thousands of historical data points, injuries, and shifting momentum before a match begins.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <Zap className="w-8 h-8 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Instant Execution</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Live scores update at the exact millisecond the whistle blows. Whether it's our Telegram alerts or your live web dashboard, you get the absolute fastest sports data available.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <Target className="w-8 h-8 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Transparency First</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We don't guarantee wildly impossible results or fixed matches. We provide mathematical edges and transparent tip history, trusting our proven track record to do the talking.
          </p>
        </div>
      </div>

      {/* Origin Story */}
      <div className="bg-pitch-dark border border-emerald-500/20 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy className="w-64 h-64 text-emerald-500" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-6">Our Mission</h2>
          <div className="space-y-4 text-zinc-300 leading-relaxed max-w-2xl text-sm sm:text-base">
            <p>
              TambuaTips was born out of frustration with predatory sports prediction sites that promised the world and delivered nothing but manipulated Excel sheets. 
            </p>
            <p>
              Our team consists of veteran sports analysts and data engineers who decided to automate and standardize pure statistical advantages. By leveraging real-time API aggregation and identifying outlier odds across sportsbooks, we essentially created the holy grail of sports intelligence dashboards.
            </p>
            <p>
              Today, thousands of users rely on TambuaTips daily to inform their wagers and securely navigate the sports betting landscape. Our commitment is entirely to you—our premium subscriber.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
