import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Smartphone, CreditCard, Wallet, Check, Shield, Lock } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import type { JackpotPrediction } from '../services/tipsService';

interface JackpotPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  jackpot: JackpotPrediction | null;
}

export function JackpotPurchaseModal({ isOpen, onClose, jackpot }: JackpotPurchaseModalProps) {
  const { user, purchaseJackpot, setShowAuthModal } = useUser();
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | null>('mpesa');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!jackpot) return null;

  const handleCheckout = () => {
    if (!user) {
      onClose();
      setShowAuthModal(true);
      toast.error('Please sign in first to purchase');
      return;
    }

    if (selectedMethod === 'mpesa' && phone.length < 9) {
      toast.error('Please enter a valid Safaricom number');
      return;
    }

    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      purchaseJackpot(jackpot.id);
      toast.success(`${jackpot.type === 'midweek' ? 'Midweek' : 'Mega'} Jackpot predictions unlocked!`, {
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
            className="relative w-full max-w-md bg-zinc-900 border border-gold-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-gold-600 to-amber-700 p-6 relative">
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-amber-100 hover:text-white transition-colors"
                disabled={processing}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-10 h-10 text-amber-100" />
              </div>
              <h2 className="text-2xl font-display font-bold text-center text-white mb-1">Unlock Jackpot</h2>
              <p className="text-amber-100 text-center text-sm">
                Get the full {jackpot.matches.length} match predictions for this {jackpot.type}.
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-5 flex items-center justify-between border border-zinc-700">
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Item</p>
                  <p className="font-bold text-white capitalize">{jackpot.type} Jackpot Tips</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Price</p>
                  <p className="font-bold text-gold-400 text-lg">KES {jackpot.price.toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 mb-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Payment Method</p>
                
                <button 
                  onClick={() => setSelectedMethod('mpesa')} 
                  className={`relative w-full flex items-center justify-center p-3 rounded-xl border transition-all ${
                    selectedMethod === 'mpesa' ? 'border-gold-500 bg-gold-500/10' : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <img src="/mpesa.svg" alt="M-Pesa" className="h-7 object-contain" />
                  {selectedMethod === 'mpesa' && <Check className="absolute right-4 w-5 h-5 text-gold-500" />}
                </button>

                <button 
                  onClick={() => setSelectedMethod('paypal')} 
                  className={`relative w-full flex items-center justify-center p-3 rounded-xl border transition-all ${
                    selectedMethod === 'paypal' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <img src="/paypal.svg" alt="PayPal" className="h-5 object-contain" />
                  {selectedMethod === 'paypal' && <Check className="absolute right-4 w-5 h-5 text-blue-500" />}
                </button>
              </div>

              {/* M-Pesa Phone Input */}
              {selectedMethod === 'mpesa' && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Safaricom Phone Number</label>
                  <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500 transition-all">
                    <div className="flex items-center justify-center bg-zinc-900 border-r border-zinc-700 px-3 text-sm text-zinc-300 font-mono">
                      🇰🇪 +254
                    </div>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="712345678" 
                      className="w-full bg-transparent px-3 py-3 text-white focus:outline-hidden font-mono" 
                    />
                  </div>
                  <p className="text-xs text-gold-400/80 mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Secure STK Push prompt will be sent.
                  </p>
                </div>
              )}

              {/* Checkout CTA */}
              <button 
                onClick={handleCheckout} 
                disabled={processing || !selectedMethod} 
                className="w-full bg-gold-500 hover:bg-gold-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-gold-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Securely Pay KES {jackpot.price.toLocaleString()}
                  </span>
                )}
              </button>
              
              <p className="text-center text-[10px] text-zinc-500 mt-4 uppercase tracking-widest">
                Immediate Unlocking after Payment
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
