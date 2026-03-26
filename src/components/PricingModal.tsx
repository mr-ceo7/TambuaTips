import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Shield, Zap, TrendingUp, Smartphone, CreditCard, Wallet } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';

interface GeoData {
  country_code: string;
  currency: string;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { upgradeToPremium } = useUser();
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch user country
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setLoadingGeo(false);
      })
      .catch(() => {
        // Fallback
        setGeoData({ country_code: 'US', currency: 'USD' });
        setLoadingGeo(false);
      });
  }, [isOpen]);

  const isKenya = geoData?.country_code === 'KE';
  const price = isKenya ? 'KES 500' : '$11.00';
  const period = 'Weekly Pass';

  const handleCheckout = () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (selectedMethod === 'mpesa' && phone.length < 9) {
      toast.error('Please enter a valid Safaricom number');
      return;
    }

    setProcessing(true);
    
    // Simulate API Payment Delay
    setTimeout(() => {
      setProcessing(false);
      upgradeToPremium();
      toast.success('Payment Successful! Premium features unlocked.', {
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
            className="relative w-full max-w-md bg-zinc-900 border border-emerald-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-emerald-600 to-emerald-800 p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-emerald-100 hover:text-white transition-colors"
                disabled={processing}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center mb-2">
                <Shield className="w-10 h-10 text-emerald-100" />
              </div>
              <h2 className="text-2xl font-display font-bold text-center text-white mb-1">
                Unlock Premium
              </h2>
              <p className="text-emerald-100 text-center text-sm">
                Get VIP picks and maximize your wins.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4 mb-6">
                {[
                  { icon: Zap, text: 'Instant access to all VIP tips' },
                  { icon: TrendingUp, text: 'Detailed Form & H2H Analysis' },
                  { icon: Shield, text: 'High confidence predictions' }
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-200 text-sm font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Pricing Section */}
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 mb-6 text-center">
                {loadingGeo ? (
                  <div className="h-10 w-32 bg-zinc-800 animate-pulse mx-auto rounded-lg"></div>
                ) : (
                  <>
                    <div className="text-3xl font-display font-bold text-emerald-400">
                      {price}
                    </div>
                    <div className="text-zinc-400 text-sm mt-1">{period}</div>
                  </>
                )}
              </div>

              {/* Payment Methods */}
              {!loadingGeo && (
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Select Payment Method
                  </p>
                  
                  {isKenya && (
                    <button
                      onClick={() => setSelectedMethod('mpesa')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedMethod === 'mpesa' 
                          ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                          : 'border-zinc-700 hover:border-zinc-500 text-zinc-300'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <span className="font-semibold flex-1 text-left">M-Pesa</span>
                      {selectedMethod === 'mpesa' && <Check className="w-4 h-4 text-emerald-500" />}
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedMethod('paypal')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedMethod === 'paypal' 
                        ? 'border-blue-500 bg-blue-500/10 text-white' 
                        : 'border-zinc-700 hover:border-zinc-500 text-zinc-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold flex-1 text-left">PayPal</span>
                    {selectedMethod === 'paypal' && <Check className="w-4 h-4 text-blue-500" />}
                  </button>

                  <button
                    onClick={() => setSelectedMethod('skrill')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedMethod === 'skrill' 
                        ? 'border-purple-500 bg-purple-500/10 text-white' 
                        : 'border-zinc-700 hover:border-zinc-500 text-zinc-300'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold flex-1 text-left">Skrill</span>
                    {selectedMethod === 'skrill' && <Check className="w-4 h-4 text-purple-500" />}
                  </button>
                </div>
              )}

              {/* Method Specific Inputs */}
              <AnimatePresence>
                {selectedMethod === 'mpesa' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                  >
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Safaricom Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    />
                    <p className="text-xs text-emerald-400/80 mt-2">
                      You will receive an STK push prompt on your phone to complete the payment.
                    </p>
                  </motion.div>
                )}
                
                {(selectedMethod === 'paypal' || selectedMethod === 'skrill') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                  >
                    <p className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-lg">
                      You will be redirected to the secure {selectedMethod === 'paypal' ? 'PayPal' : 'Skrill'} checkout portal to complete your transaction in {geoData?.currency || 'USD'}.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                disabled={processing || !selectedMethod || loadingGeo}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {price} Now</span>
                  </>
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
