import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <motion.div
        className="w-full max-w-md px-6 flex items-center justify-center"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <img
          src="/brand-ad.jpeg"
          alt="Tambua Tips"
          className="w-full h-auto object-contain rounded-2xl drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]"
        />
      </motion.div>
    </motion.div>
  );
}
