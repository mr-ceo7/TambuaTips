import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useCampaign } from '../context/CampaignContext';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { activeCampaign, isLoading } = useCampaign();

  useEffect(() => {
    // Wait a bit for campaign data to load, then show splash for 2.5s
    const timer = setTimeout(() => {
      onComplete();
    }, isLoading ? 3000 : 2500);
    return () => clearTimeout(timer);
  }, [onComplete, isLoading]);

  const showCampaignSplash = activeCampaign?.use_splash_screen && activeCampaign?.asset_image_url;
  const campaignColor = activeCampaign?.theme_color_hex;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      {/* Subtle radial glow behind the image */}
      {showCampaignSplash && campaignColor && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${campaignColor}40 0%, transparent 70%)`
          }}
        />
      )}

      <motion.div
        className="w-full max-w-md px-6 flex flex-col items-center justify-center gap-4"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <img
          src={showCampaignSplash ? activeCampaign.asset_image_url! : '/brand-ad.jpeg'}
          alt={showCampaignSplash ? activeCampaign.title : 'Tambua Tips'}
          className="w-full h-auto object-contain rounded-2xl"
          style={{
            filter: showCampaignSplash && campaignColor
              ? `drop-shadow(0 0 40px ${campaignColor}50)`
              : 'drop-shadow(0 0 40px rgba(16,185,129,0.3))'
          }}
        />
        {showCampaignSplash && activeCampaign.banner_text && (
          <motion.p
            className="text-center text-sm font-bold text-zinc-300 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {activeCampaign.banner_text}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
