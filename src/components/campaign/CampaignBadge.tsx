import React from 'react';
import { motion } from 'motion/react';
import { Gift, ArrowRight } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { useUser } from '../../context/UserContext';

/**
 * CampaignBadge
 * 
 * A persistent floating badge pinned to the bottom-right corner of the screen.
 * Only renders when an active campaign has `use_floating_badge` enabled.
 * Clicking it opens the Pricing Modal.
 */
export function CampaignBadge() {
  const { activeCampaign } = useCampaign();
  const { setShowPricingModal, setShowAuthModal, user } = useUser();

  if (!activeCampaign?.use_floating_badge) return null;

  const handleClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setShowPricingModal(true);
    }
  };

  const badgeColor = activeCampaign.theme_color_hex || '#10b981';
  const isDiscount = activeCampaign.incentive_type === 'discount';
  const label = isDiscount
    ? `${activeCampaign.incentive_value}% OFF`
    : `+${activeCampaign.incentive_value} Days Free`;

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-24 md:bottom-8 right-4 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white font-bold text-sm shadow-2xl backdrop-blur-md border border-white/10 cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}CC)`,
        boxShadow: `0 8px 32px ${badgeColor}40`,
      }}
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1.5 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        <Gift className="w-5 h-5" />
      </motion.div>
      <span>{label}</span>
      <ArrowRight className="w-4 h-4 opacity-60" />
    </motion.button>
  );
}
