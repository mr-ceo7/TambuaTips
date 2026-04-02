import React, { useState } from 'react';
import { X, Gift, Copy, CheckCircle2, Users, Share2, MessageCircle, Send, ExternalLink } from 'lucide-react';
import { useUser } from '../context/UserContext';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const { user } = useUser();

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

  // Milestone progress
  const milestones = [1, 3, 5, 10];
  const currentMilestone = milestones.find(m => referralsCount < m) || milestones[milestones.length - 1];
  const prevMilestone = milestones[milestones.indexOf(currentMilestone) - 1] || 0;
  const progressPct = currentMilestone > prevMilestone 
    ? Math.min(((referralsCount - prevMilestone) / (currentMilestone - prevMilestone)) * 100, 100) 
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden"
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

          {/* Stats & Milestone */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">
                  <span className="font-bold text-white">{referralsCount}</span> friend{referralsCount !== 1 ? 's' : ''} invited
                </span>
              </div>
              <span className="text-sm font-bold text-emerald-400">
                {referralsCount * 7}d earned
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-600">{referralsCount} referral{referralsCount !== 1 ? 's' : ''}</span>
              <span className="text-emerald-500/80 font-bold">Next milestone: {currentMilestone} 🎯</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
