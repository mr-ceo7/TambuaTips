import React from 'react';
import { Star, MessageSquareQuote, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

const TESTIMONIALS = [
  {
    name: "David K.",
    role: "Pro Bettor",
    content: "The AI predictions are insanely accurate. Hit a 5-leg parlay yesterday using the VIP tips.",
    rating: 5,
    verified: true
  },
  {
    name: "Sarah M.",
    role: "Casual Punter",
    content: "Love the live odds comparison. Saves me so much time checking different bookies.",
    rating: 5,
    verified: true
  },
  {
    name: "James O.",
    role: "VIP Member",
    content: "The real-time alerts for live matches have completely changed how I bet in-play.",
    rating: 5,
    verified: true
  }
];

export function Testimonials() {
  return (
    <section className="py-12 sm:py-16 border-t border-zinc-800/50">
      <div className="flex flex-col items-center gap-2 sm:gap-3 mb-8 sm:mb-10 justify-center px-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <MessageSquareQuote className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white uppercase tracking-wider text-center">
          Winning Community
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 text-center max-w-md">Join thousands of bettors who are already using AI to beat the bookies.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
        {TESTIMONIALS.map((t, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 sm:p-6 relative hover:bg-zinc-800/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all flex flex-col"
          >
            <div className="flex items-center gap-1 mb-3 sm:mb-4">
              {[...Array(t.rating)].map((_, j) => (
                <Star key={j} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-gold-500 text-gold-500" />
              ))}
            </div>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6 italic flex-1">"{t.content}"</p>
            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-zinc-800/50">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs sm:text-sm font-bold text-zinc-400 border border-zinc-700 shrink-0">
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  {t.name}
                  {t.verified && <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />}
                </div>
                <div className="text-[9px] sm:text-[10px] text-emerald-500 uppercase tracking-wider font-bold">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
