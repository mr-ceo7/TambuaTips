import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Hide splash screen after 4 seconds (video duration is ~3.6s)
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <div className="w-full max-w-lg px-6 flex items-center justify-center">
        <video 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-auto mix-blend-screen invert hue-rotate-180 brightness-110 object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        >
          <source src="/tambua-brand.mp4" type="video/mp4" />
        </video>
      </div>
    </motion.div>
  );
}
