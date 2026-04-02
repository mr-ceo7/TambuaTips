import React, { useState } from 'react';
import { Gift, Copy, CheckCircle2, Users, MessageCircle, Send, ExternalLink } from 'lucide-react';
import { useUser } from '../context/UserContext';

export function ReferralWidget() {
  const [copied, setCopied] = useState(false);
  const { user } = useUser();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tambuatips.com';
  const referralLink = user?.referral_code ? `${baseUrl}/?ref=${user.referral_code}` : `${baseUrl}/`;

  const shareMessage = `🔥 Get expert football tips on TambuaTips! Join using my link and we both win: ${referralLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!user) return null;

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden group">
      {/* Glow Effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-display font-bold text-white uppercase tracking-wider">Invite & Earn</h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Earn Free Premium Access</p>
          </div>
        </div>
        
        <p className="text-xs sm:text-sm text-zinc-300 mb-4 sm:mb-5 leading-relaxed">
          Share your unique link with friends. When they sign up, you earn <span className="text-white font-bold">free premium access</span>!
        </p>
        
        {/* Copy Link */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-xs font-mono text-zinc-400 truncate select-all">{referralLink}</span>
          </div>
          <button 
            onClick={handleCopy}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2 sm:p-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center min-w-[36px] sm:min-w-[40px] shrink-0"
            title="Copy Link"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-3 sm:mb-4">
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all text-[10px] sm:text-xs font-bold"
          >
            <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={shareTelegram}
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition-all text-[10px] sm:text-xs font-bold"
          >
            <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Telegram
          </button>
          <button
            onClick={shareTwitter}
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all text-[10px] sm:text-xs font-bold"
          >
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            X
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-500 border-t border-zinc-800/50 pt-3 sm:pt-4 mt-1 sm:mt-2">
          <span className="flex items-center gap-1 sm:gap-1.5">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {user.referrals_count || 0} Friends Invited
          </span>
          <span className="font-bold text-emerald-500">{(user.referrals_count || 0) * 7} Days Earned</span>
        </div>
      </div>
    </div>
  );
}
