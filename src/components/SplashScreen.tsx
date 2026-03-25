import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Hide splash screen after 3.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          
          {/* Ball & Flame */}
          <div className="relative flex items-center justify-center">
            {/* Flame Trail */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0, x: -50 }}
              animate={{ scaleX: 1, opacity: 1, x: -20 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="absolute right-1/2 w-32 md:w-48 h-16 md:h-24 bg-gradient-to-r from-transparent via-yellow-500/50 to-emerald-500/80 blur-xl rounded-full origin-right"
            />
            
            {/* Soccer Ball */}
            <motion.div
              initial={{ x: -200, rotate: -360, scale: 0.5, opacity: 0 }}
              animate={{ x: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 100, duration: 1 }}
              className="relative z-10 flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_0_40px_rgba(16,185,129,0.6)] border-2 border-emerald-200"
            >
              <svg viewBox="0 0 512 512" fill="currentColor" className="w-12 h-12 md:w-16 md:h-16 text-emerald-950">
                <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm14.4 82.2c16.1 3.2 31.6 8.7 46.1 16.1L274 167.9l-68.2-22.1 64.6-63.6zM151.6 130.5l49.8 48.9-22.5 69.4-71.1 23.1-43.4-60.1c21.8-33.8 51.5-61.9 87.2-81.3zm-49.1 251l71.1-23.1 22.5 69.4-49.8 48.9c-35.7-19.4-65.4-47.5-87.2-81.3l43.4-60.1zm205.9 48.9l-49.8-48.9 22.5-69.4 71.1-23.1 43.4 60.1c-21.8 33.8-51.5 61.9-87.2 81.3zm49.1-251l-71.1 23.1-22.5-69.4 49.8-48.9c35.7 19.4 65.4 47.5 87.2 81.3l-43.4 60.1zM256 363.8l-68.2-22.1 26-80 84.4 0 26 80-68.2 22.1z"/>
              </svg>
            </motion.div>
          </div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col items-start justify-center"
          >
            <span className="text-4xl md:text-6xl font-display font-black tracking-tighter text-white leading-none">
              TAMBUA
            </span>
            <span className="text-3xl md:text-5xl font-serif italic font-bold text-red-500 leading-none -mt-1 drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
              tips
            </span>
          </motion.div>
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="mt-8"
        >
          <p className="text-sm md:text-base text-zinc-400 tracking-[0.3em] uppercase font-bold">
            Keep Your Tips Up
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
