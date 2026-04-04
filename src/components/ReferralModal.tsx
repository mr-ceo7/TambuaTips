import React, { useState, useEffect } from 'react';
import { X, Gift, Copy, CheckCircle2, Users, Share2, MessageCircle, Send, ExternalLink, Loader2, Crown, Percent } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { rewardsService, type RewardsConfig } from '../services/rewardsService';
import { toast } from 'sonner';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipId?: number; // Optional tip ID if they opened it from a specific locked tip
}

export function ReferralModal({ isOpen, onClose, tipId }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<RewardsConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const { user, refreshUser } = useUser();

  useEffect(() => {
    if (isOpen && user) {
      setLoadingConfig(true);
      rewardsService.getConfig().then(setConfig).catch(e => {
        console.error("Failed to load rewards config", e);
      }).finally(() => setLoadingConfig(false));
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tambuatips.com';
  const referralLink = user.referral_code ? `${baseUrl}/?ref=${user.referral_code}` : baseUrl;
  const referralsCount = user.referrals_count || 0;

  const shareMessage = `🔥 Get expert football tips on TambuaTips! Join using my link and we both win: ${referralLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🔥 Get expert football tips on TambuaTips!')}`, '_blank');
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const handleRedeem = async (action: 'unlock_tip' | 'get_discount' | 'get_premium') => {
    setRedeeming(true);
    try {
      const res = await rewardsService.redeem(action, tipId);
      toast.success(res.message);
      await refreshUser(); // Update balance
      if (action === 'unlock_tip') {
        onClose(); // Close modal on tip unlock so they can see the tip
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-2rem)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
              <Gift className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">
              Unlock Tips for Free
            </h2>
            <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest mt-1">
              Invite Friends · Earn Rewards
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-3 mb-6">
            {[
              { step: '1', text: 'Share your unique referral link with friends' },
              { step: '2', text: 'They sign up on TambuaTips using your link' },
              { step: '3', text: 'You get premium tips access for free!' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Referral Link */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 mb-4">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5 block">
              Your Referral Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 min-w-0">
                <span className="text-[11px] font-mono text-zinc-400 truncate block select-all">{referralLink}</span>
              </div>
              <button
                onClick={handleCopy}
                className={`p-2.5 rounded-lg transition-all shrink-0 ${
                  copied 
                    ? 'bg-emerald-500 text-zinc-950' 
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:scale-105 active:scale-95'
                }`}
                title={copied ? 'Copied!' : 'Copy Link'}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all text-xs font-bold"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              onClick={shareTelegram}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition-all text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5" />
              Telegram
            </button>
            <button
              onClick={shareTwitter}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all text-xs font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              X / Twitter
            </button>
          </div>

          {/* Rewards Hub */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">Rewards Hub</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Unspent Points</div>
                <div className="text-xl font-bold text-emerald-400">{user.referral_points || 0}</div>
              </div>
            </div>

            {loadingConfig ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
            ) : config ? (
              <div className="space-y-3">
                {/* Unlock Tip */}
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-emerald-500" /> Unlock Single Tip</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Reveal one premium locked tip</div>
                  </div>
                  <button 
                    onClick={() => handleRedeem('unlock_tip')}
                    disabled={redeeming || (user.referral_points || 0) < config.points_per_tip || !tipId}
                    className="shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!tipId ? 'Select Tip First' : `${config.points_per_tip} Points`}
                  </button>
                </div>
                
                {/* Get Discount */}
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-blue-500" /> {config.discount_percentage}% M-Pesa Discount</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Applies heavily to your next purchase</div>
                  </div>
                  <button 
                    onClick={() => handleRedeem('get_discount')}
                    disabled={redeeming || (user.referral_points || 0) < config.points_per_discount}
                    className="shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {config.points_per_discount} Points
                  </button>
                </div>

                {/* Get Premium */}
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold-400" />
                  <div className="pl-2">
                    <div className="text-sm font-bold text-white flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-gold-400" /> {config.premium_days_reward} Days Premium VIP</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Full access to all premium features</div>
                  </div>
                  <button 
                    onClick={() => handleRedeem('get_premium')}
                    disabled={redeeming || (user.referral_points || 0) < config.points_per_premium}
                    className="shrink-0 bg-gold-500/10 text-gold-400 border border-gold-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gold-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {config.points_per_premium} Points
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
