import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Shield, Zap, Star, Crown, Smartphone, CreditCard, Wallet, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getPricingTiers, CATEGORY_LABELS, hasAccessToCategory, type TierConfig, type SubscriptionTier } from '../services/pricingService';
import { paymentService } from '../services/paymentService';
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
  const { user, refreshUser, setShowAuthModal, targetCategory } = useUser();
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
  const [duration, setDuration] = useState<2 | 4>(2);
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | 'paystack' | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [paymentView, setPaymentView] = useState<'selection' | 'waiting' | 'success'>('selection');
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);

  useEffect(() => {
    getPricingTiers().then(data => {
      setTiers(data);
      if (targetCategory && data.length > 0) {
        const requiredTierId = CATEGORY_LABELS[targetCategory]?.minTier;
        const autoTier = data.find(t => t.id === requiredTierId) || data[0];
        setSelectedTier(autoTier);
      }
    });

    if (!isOpen) {
      setPaymentView('selection');
      setCurrentPaymentId(null);
      return;
    }
    
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
    
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => { setGeoData(data); setLoadingGeo(false); })
      .catch(() => { setGeoData({ country_code: 'KE', currency: 'KES' }); setLoadingGeo(false); });
  }, [isOpen, targetCategory]);

  // Polling for payment status
  useEffect(() => {
    if (paymentView !== 'waiting' || !currentPaymentId) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const statusResponse = await paymentService.checkStatus(currentPaymentId);
        if (statusResponse.status === 'completed') {
          clearInterval(interval);
          await refreshUser();
          setPaymentView('success');
        } else if (statusResponse.status === 'failed') {
          clearInterval(interval);
          setPaymentView('selection');
          toast.error('Payment failed or was cancelled.');
        }
        
        if (pollCount > 60) { // 2.5 minutes timeout
          clearInterval(interval);
          toast.error('Verification timed out. Please refresh if you have paid.');
          setPaymentView('selection');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [paymentView, currentPaymentId, refreshUser]);

  const isKenya = geoData?.country_code === 'KE';

  const handleCheckout = async () => {
    if (!user) {
      onClose();
      setShowAuthModal(true);
      toast.error('Please sign in first');
      return;
    }
    if (!selectedTier) { toast.error('Please select a plan'); return; }
    if (!selectedMethod) { toast.error('Please select a payment method'); return; }
    if (selectedMethod === 'mpesa' && (!phone || phone.length < 9)) { toast.error('Enter a valid phone number'); return; }

    setProcessing(true);
    try {
      const payload = {
        item_type: 'subscription' as const,
        item_id: selectedTier.id,
        duration_weeks: duration,
        phone: selectedMethod === 'mpesa' ? `254${phone.replace(/^0/, '')}` : undefined,
      };

      let response;
      if (selectedMethod === 'mpesa') response = await paymentService.payMpesa(payload);
      else if (selectedMethod === 'paypal') response = await paymentService.payPaypal(payload);
      else if (selectedMethod === 'skrill') response = await paymentService.paySkrill(payload);
      else response = await paymentService.payPaystack(payload);

      if (selectedMethod === 'paystack' && response.access_code) {
        // Launch Paystack Inline
        const paystack = new (window as any).PaystackPop();
        paystack.newTransaction({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          accessCode: response.access_code,
          onSuccess: (transaction: any) => {
            setCurrentPaymentId(response.id);
            setPaymentView('waiting');
          },
          onCancel: () => {
            toast.error('Payment cancelled');
            setProcessing(false);
          }
        });
        return; // Keep modal in selection view until success
      }

      if (response.status === 'completed') {
        await refreshUser();
        setPaymentView('success');
      } else {
        setCurrentPaymentId(response.id);
        setPaymentView('waiting');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-pitch/90 backdrop-blur-sm" />
          
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
              <p className="text-emerald-100 text-center text-sm">Join thousands of winning members today.</p>
            </div>

            <div className="p-6 overflow-y-auto min-h-[400px]">
              <AnimatePresence mode="wait">
                {paymentView === 'selection' && (
                  <motion.div key="selection" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <div className="flex bg-zinc-800 rounded-xl p-1 mb-5">
                      <button onClick={() => setDuration(2)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${duration === 2 ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'}`}>2 Weeks</button>
                      <button onClick={() => setDuration(4)} className={`relative flex-1 py-2 rounded-lg text-sm font-bold transition-all ${duration === 4 ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'}`}>
                        4 Weeks
                        <span className="absolute -top-2.5 -right-2 bg-emerald-400 text-emerald-950 text-[10px] px-2 py-0.5 rounded-full shadow border border-emerald-300">Save 22%</span>
                      </button>
                    </div>

                    <div className="space-y-3 mb-5">
                      {tiers.map(tier => {
                        const Icon = TIER_ICONS[tier.id] || Zap;
                        const dprice = duration === 2 ? tier.price2wk : tier.price4wk;
                        const isSelected = selectedTier?.id === tier.id;
                        return (
                          <button
                            key={tier.id}
                            onClick={() => setSelectedTier(tier)}
                            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-white text-sm">{tier.name}</span>
                                {tier.popular && (
                                  <span className="bg-emerald-500 text-emerald-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Popular</span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                                {tier.categories
                                  .filter(c => c !== 'free')
                                  .map(c => CATEGORY_LABELS[c]?.label || c)
                                  .join(', ')}
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <div className="text-[10px] text-zinc-500 line-through">KES {(dprice * 1.5).toLocaleString()}</div>
                              <div className="font-bold text-white text-sm">KES {dprice.toLocaleString()}</div>
                              <div className="text-[9px] text-emerald-500 font-bold uppercase">{duration} Weeks</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {targetCategory && selectedTier && !hasAccessToCategory(selectedTier.id as SubscriptionTier, targetCategory) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[11px] text-amber-100/70">
                            The <span className="text-white font-bold">{CATEGORY_LABELS[targetCategory].label}</span> tip requires a higher plan.
                          </p>
                          <button onClick={() => setSelectedTier(tiers.find(t => t.id === CATEGORY_LABELS[targetCategory].minTier) || selectedTier)} className="text-[10px] font-bold text-amber-400 uppercase mt-1 flex items-center gap-1">Upgrade Plan <ArrowRight className="w-3 h-3"/></button>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pay With</h3>
                        {selectedMethod && <button onClick={() => setSelectedMethod(null)} className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Change</button>}
                      </div>
                      <div className="space-y-3">
                        {(!selectedMethod || selectedMethod === 'mpesa') && isKenya && (
                          <button onClick={() => setSelectedMethod('mpesa')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'mpesa' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/mpesa.svg" alt="M-Pesa" className="h-9 object-contain" />
                            {selectedMethod === 'mpesa' && <Check className="absolute right-4 w-5 h-5 text-emerald-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paystack') && (
                          <button onClick={() => setSelectedMethod('paystack')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'paystack' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-emerald-500" />
                              <span className="font-bold text-white">Pay with Card</span>
                              <span className="text-zinc-500 text-sm">via</span>
                              <img src="/paystack.svg" alt="Paystack" className="h-4 object-contain brightness-0 invert" />
                            </div>
                            {selectedMethod === 'paystack' && <Check className="absolute right-4 w-5 h-5 text-emerald-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paypal') && (
                          <button onClick={() => setSelectedMethod('paypal')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'paypal' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/paypal.svg" alt="PayPal" className="h-7 object-contain" />
                            {selectedMethod === 'paypal' && <Check className="absolute right-4 w-5 h-5 text-blue-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'skrill') && (
                          <button onClick={() => setSelectedMethod('skrill')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'skrill' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/skrill.svg" alt="Skrill" className="h-9 object-contain" />
                            {selectedMethod === 'skrill' && <Check className="absolute right-4 w-5 h-5 text-purple-500" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedMethod === 'mpesa' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Safaricom Number</label>
                          <div className="flex bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                            <div className="px-4 py-3 bg-zinc-900 border-r border-zinc-700 text-sm text-zinc-400 flex items-center gap-2">
                              <span>🇰🇪</span>
                              <span>+254</span>
                            </div>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="712345678" className="w-full bg-transparent px-4 py-3 text-white focus:outline-hidden font-mono" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleCheckout}
                      disabled={processing || !selectedTier || !selectedMethod || loadingGeo}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : `Get ${selectedTier?.name || 'Started'}`}
                    </button>
                    <p className="text-center text-[10px] text-zinc-500 mt-4 uppercase tracking-widest">Instant access granted after payment</p>
                  </motion.div>
                )}

                {paymentView === 'waiting' && (
                  <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-10">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2 text-center">Waiting for Payment...</h3>
                    <p className="text-zinc-400 text-center text-sm max-w-xs mb-8">Please check your phone for the M-Pesa PIN prompt to complete your order.</p>
                  </motion.div>
                )}

                {paymentView === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/40">
                      <Check className="w-10 h-10 text-zinc-950" strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">System Unlocked!</h3>
                    <p className="text-zinc-400 text-sm max-w-xs mb-8">Payment confirmed. Your premium access has been activated instantly.</p>
                    <button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">Start Winning <ArrowRight className="w-5 h-5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
