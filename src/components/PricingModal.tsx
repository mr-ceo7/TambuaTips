import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Shield, Zap, Star, Crown, Smartphone, CreditCard, Wallet, Lock } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getPricingTiers, CATEGORY_LABELS, type TierConfig, type SubscriptionTier } from '../services/pricingService';
import { toast } from 'sonner';

interface GeoData {
  country_code: string;
  currency: string;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_ICONS: Record<string, React.ElementType> = { basic: Zap, standard: Star, premium: Crown };

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { user, subscribeTo, setShowAuthModal } = useUser();
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
  const [duration, setDuration] = useState<2 | 4>(2);
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tiers, setTiers] = useState<TierConfig[]>([]);

  useEffect(() => {
    getPricingTiers().then(setTiers);
    if (!isOpen) return;
    
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => { setGeoData(data); setLoadingGeo(false); })
      .catch(() => { setGeoData({ country_code: 'KE', currency: 'KES' }); setLoadingGeo(false); });
  }, [isOpen]);

  const isKenya = geoData?.country_code === 'KE';
  const price = selectedTier ? (duration === 2 ? selectedTier.price2wk : selectedTier.price4wk) : 0;

  const handleCheckout = () => {
    if (!user) {
      onClose();
      setShowAuthModal(true);
      toast.error('Please sign in first to purchase a plan');
      return;
    }
    if (!selectedTier) { toast.error('Please select a plan'); return; }
    if (!selectedMethod) { toast.error('Please select a payment method'); return; }
    if (selectedMethod === 'mpesa' && phone.length < 9) { toast.error('Please enter a valid Safaricom number'); return; }

    setProcessing(true);
    
    setTimeout(() => {
      setProcessing(false);
      subscribeTo(selectedTier.id as SubscriptionTier, duration);
      toast.success(`${selectedTier.name} plan activated! Enjoy your tips.`, {
        style: { background: '#10b981', color: '#fff', border: 'none' }
      });
      onClose();
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-pitch/90 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-emerald-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-emerald-600 to-emerald-800 p-6 relative">
              <button onClick={onClose} className="absolute top-4 right-4 text-emerald-100 hover:text-white transition-colors" disabled={processing}>
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center mb-2">
                <Shield className="w-10 h-10 text-emerald-100" />
              </div>
              <h2 className="text-2xl font-display font-bold text-center text-white mb-1">Get Premium Tips</h2>
              <p className="text-emerald-100 text-center text-sm">Choose your plan and start winning.</p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              {/* Duration Toggle */}
              <div className="flex bg-zinc-800 rounded-xl p-1 mb-5">
                <button onClick={() => setDuration(2)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${duration === 2 ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'}`}>2 Weeks</button>
                <button onClick={() => setDuration(4)} className={`relative flex-1 py-2 rounded-lg text-sm font-bold transition-all ${duration === 4 ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'}`}>
                  4 Weeks
                  <span className="absolute -top-2.5 -right-2 bg-emerald-400 text-emerald-950 text-[10px] px-2 py-0.5 rounded-full shadow border border-emerald-300 animate-pulse">Save up to 22%</span>
                </button>
              </div>

              {/* Tier Selection */}
              <div className="space-y-3 mb-5">
                {tiers.map(tier => {
                  const Icon = TIER_ICONS[tier.id] || Zap;
                  const dprice = duration === 2 ? tier.price2wk : tier.price4wk;
                  const isSelected = selectedTier?.id === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{tier.name}</span>
                          {tier.popular && <span className="text-[9px] bg-emerald-500 text-zinc-950 px-1.5 py-0.5 rounded-full font-bold uppercase">Popular</span>}
                        </div>
                        <span className="text-xs text-zinc-500">{tier.categories.filter(c => c !== 'free').map(c => CATEGORY_LABELS[c]?.label).join(', ')}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">KES {dprice.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500">{duration === 2 ? '2 weeks' : '4 weeks'}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Payment Methods */}
              {selectedTier && !loadingGeo && (
                <div className="space-y-3 mb-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Payment Method</p>
                  
                  {(isKenya || true) && (
                    <button onClick={() => setSelectedMethod('mpesa')} className={`relative w-full flex items-center justify-center p-3 rounded-xl border transition-all ${selectedMethod === 'mpesa' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-zinc-500'}`}>
                      <img src="/mpesa.svg" alt="M-Pesa" className="h-7 object-contain" />
                      {selectedMethod === 'mpesa' && <Check className="absolute right-4 w-5 h-5 text-emerald-500" />}
                    </button>
                  )}
                  <button onClick={() => setSelectedMethod('paypal')} className={`relative w-full flex items-center justify-center p-3 rounded-xl border transition-all ${selectedMethod === 'paypal' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500'}`}>
                    <img src="/paypal.svg" alt="PayPal" className="h-5 object-contain" />
                    {selectedMethod === 'paypal' && <Check className="absolute right-4 w-5 h-5 text-blue-500" />}
                  </button>
                  <button onClick={() => setSelectedMethod('skrill')} className={`relative w-full flex items-center justify-center p-3 rounded-xl border transition-all ${selectedMethod === 'skrill' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-500'}`}>
                    <img src="/skrill.svg" alt="Skrill" className="h-6 object-contain" />
                    {selectedMethod === 'skrill' && <Check className="absolute right-4 w-5 h-5 text-purple-500" />}
                  </button>
                </div>
              )}

              {/* M-Pesa Phone Input */}
              <AnimatePresence>
                {selectedMethod === 'mpesa' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Safaricom Phone Number</label>
                    <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                      <div className="flex items-center justify-center bg-zinc-900 border-r border-zinc-700 px-3 text-sm text-zinc-300 font-mono">
                        🇰🇪 +254
                      </div>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="712345678" className="w-full bg-transparent px-3 py-3 text-white focus:outline-hidden font-mono" />
                    </div>
                    <p className="text-xs text-emerald-400/80 mt-2">You will receive an STK push prompt on your phone.</p>
                  </motion.div>
                )}
                {(selectedMethod === 'paypal' || selectedMethod === 'skrill') && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                    <p className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-lg">
                      You will be redirected to the secure {selectedMethod === 'paypal' ? 'PayPal' : 'Skrill'} checkout portal.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Checkout CTA */}
              <button onClick={handleCheckout} disabled={processing || !selectedTier || !selectedMethod || loadingGeo} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Securely Pay KES {price.toLocaleString()}
                  </span>
                )}
              </button>
              
              <p className="text-center text-[10px] text-zinc-500 mt-4 uppercase tracking-widest">
                Secure 256-bit Encrypted Checkout
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
