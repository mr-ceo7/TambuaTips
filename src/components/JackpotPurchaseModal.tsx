import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Smartphone, CreditCard, Check, Shield, Lock, ArrowRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { paymentService } from '../services/paymentService';
import { toast } from 'sonner';
import type { JackpotPrediction } from '../services/tipsService';

interface JackpotPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  jackpot: JackpotPrediction | null;
}

export function JackpotPurchaseModal({ isOpen, onClose, jackpot }: JackpotPurchaseModalProps) {
  const { user, refreshUser, setShowAuthModal } = useUser();
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | 'paystack' | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentView, setPaymentView] = useState<'selection' | 'waiting' | 'success'>('selection');
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPaymentView('selection');
      setCurrentPaymentId(null);
      return;
    }
    
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen]);

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

  if (!jackpot) return null;

  const handleCheckout = async () => {
    if (!user) {
      onClose();
      setShowAuthModal(true);
      toast.error('Please sign in first to purchase');
      return;
    }

    if (selectedMethod === 'mpesa' && (!phone || phone.length < 9)) {
      toast.error('Please enter a valid Safaricom number');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        item_type: 'jackpot' as const,
        item_id: jackpot.id,
        phone: selectedMethod === 'mpesa' ? `254${phone.replace(/^0/, '')}` : undefined,
      };

      let response;
      if (selectedMethod === 'mpesa') {
        response = await paymentService.payMpesa(payload);
      } else if (selectedMethod === 'paypal') {
        response = await paymentService.payPaypal(payload);
      } else if (selectedMethod === 'skrill') {
        response = await paymentService.paySkrill(payload);
      } else {
        response = await paymentService.payPaystack(payload);
      }

      if (selectedMethod === 'paystack' && response.access_code) {
        const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        if (!paystackKey) {
          toast.error("Paystack configuration missing. Restart your development wrapper.");
          setProcessing(false);
          return;
        }

        const paystack = new (window as any).PaystackPop();
        paystack.newTransaction({
          key: paystackKey,
          email: user?.email,
          accessCode: response.access_code,
          channels: ['card'],
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

      if (response.auth_url && (selectedMethod === 'paypal' || selectedMethod === 'skrill')) {
        window.location.href = response.auth_url;
        return;
      }

      if (response.status === 'completed') {
        await refreshUser();
        setPaymentView('success');
      } else {
        setCurrentPaymentId(response.id);
        setPaymentView('waiting');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
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
            className="relative w-full max-w-md bg-zinc-900 border border-gold-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-gold-600 to-amber-700 p-6 relative text-white">
              <button onClick={onClose} className="absolute top-4 right-4 text-amber-100 hover:text-white transition-colors" disabled={processing}>
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-10 h-10 text-amber-100 shadow-lg" />
              </div>
              <h2 className="text-2xl font-display font-bold text-center mb-1">Unlock Jackpot</h2>
              <p className="text-amber-100 text-center text-sm">Full match predictions for {jackpot.matches.length} matches.</p>
            </div>

            <div className="p-6 min-h-[350px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {paymentView === 'selection' && (
                  <motion.div key="selection" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                     <div className="bg-zinc-800/50 rounded-xl p-4 mb-5 flex items-center justify-between border border-zinc-700">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Selected Item</p>
                        <p className="font-bold text-white capitalize">{jackpot.type} Tips</p>
                      </div>
                      <div className="text-right flex flex-col items-end leading-none">
                        <p className="text-[10px] text-zinc-500 line-through mb-1">KES {(jackpot.price * 1.5).toLocaleString()}</p>
                        <p className="font-black text-gold-400 text-xl">KES {jackpot.price.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pay With</h3>
                         {selectedMethod && <button onClick={() => setSelectedMethod(null)} className="text-[10px] text-gold-400 font-bold uppercase transition-colors">Change</button>}
                      </div>
                      <div className="space-y-3">
                        {(!selectedMethod || selectedMethod === 'mpesa') && (
                          <button onClick={() => setSelectedMethod('mpesa')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'mpesa' ? 'border-gold-500 bg-gold-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/mpesa.svg" alt="M-Pesa" className="h-9 object-contain" />
                            {selectedMethod === 'mpesa' && <Check className="absolute right-4 w-5 h-5 text-gold-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paystack') && (
                          <button onClick={() => setSelectedMethod('paystack')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'paystack' ? 'border-gold-500 bg-gold-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-2">
                                <div className="bg-linear-to-r from-blue-700 to-blue-900 rounded-[4px] px-2 py-0.5 shadow-xs border border-blue-600 flex items-center justify-center">
                                  <span className="text-[10px] font-black italic text-white tracking-widest leading-none">VISA</span>
                                </div>
                                <div className="bg-zinc-100 rounded-[4px] px-1.5 py-0.5 flex items-center justify-center shadow-xs border border-zinc-200">
                                  <svg width="22" height="14" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="10" fill="#EB001B" />
                                    <circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.8" />
                                  </svg>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-50 ml-1">
                                <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest">via</span>
                                <img src="/paystack.svg" alt="Paystack" className="h-2.5 object-contain brightness-0 invert" />
                              </div>
                            </div>
                            {selectedMethod === 'paystack' && <Check className="absolute right-4 w-5 h-5 text-gold-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paypal') && (
                          <button onClick={() => setSelectedMethod('paypal')} className={`relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedMethod === 'paypal' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/paypal.svg" alt="PayPal" className="h-7 object-contain" />
                            {selectedMethod === 'paypal' && <Check className="absolute right-4 w-5 h-5 text-blue-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'skrill') && (
                          <button onClick={() => toast.info('Skrill integration is coming soon!')} className="relative w-full flex items-center justify-center p-4 rounded-xl border-2 transition-all border-zinc-800 hover:border-zinc-700 opacity-50 cursor-not-allowed">
                            <img src="/skrill.svg" alt="Skrill" className="h-9 object-contain" />
                            <div className="absolute right-4 text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full uppercase tracking-wider">Coming Soon</div>
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedMethod === 'mpesa' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Safaricom phone number</label>
                          <div className="flex bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden focus-within:border-gold-500 transition-all">
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
                      disabled={processing || !selectedMethod}
                      className="w-full bg-gold-500 hover:bg-gold-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-gold-500/25 disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : `Get ${jackpot.type === 'midweek' ? 'Midweek' : 'Mega'} Tips`}
                    </button>
                  </motion.div>
                )}

                {paymentView === 'waiting' && (
                  <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-10">
                    <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2">Verifying Payment...</h3>
                    <p className="text-zinc-400 text-center text-sm max-w-xs mb-8">
                      {selectedMethod === 'mpesa'
                        ? 'Please check your phone for the M-Pesa prompt and enter your PIN.'
                        : 'Verifying your payment with the provider. Please do not close this window.'}
                    </p>
                  </motion.div>
                )}

                {paymentView === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-gold-500/40">
                      <Check className="w-10 h-10 text-zinc-950" strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Jackpot Unlocked!</h3>
                    <p className="text-zinc-400 text-sm max-w-xs mb-8">You now have full access to these jackpot predictions. Good luck!</p>
                    <button onClick={onClose} className="w-full bg-gold-500 hover:bg-gold-400 text-zinc-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">View Predictions <ArrowRight className="w-5 h-5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-center text-[10px] text-zinc-500 mb-6 uppercase tracking-widest">Instant access granted after payment</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
