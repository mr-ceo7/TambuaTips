import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't explicitly dismissed it before.
    const consent = localStorage.getItem('tambuatips_cookie_consent');
    if (!consent) {
      // Delay it slightly so it doesn't aggressively pop up instantly on initial cold load
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('tambuatips_cookie_consent', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 z-100 sm:max-w-sm"
        >
          <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <Cookie className="w-16 h-16 text-emerald-500" />
            </div>
            
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-900 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 items-start relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="pr-4">
                <h4 className="text-sm font-bold text-white mb-1">Cookie Notice</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  We use cookies strictly necessary for authenticating your sessions securely and retaining your preferences. By continuing, you agree to our <Link to="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-2 bg-emerald-500 text-zinc-950 text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors"
                  >
                    Accept & Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
