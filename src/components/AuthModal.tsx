import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, googleLogin } = useUser();
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        toast.success(`Google Auth Successful! 🎉`);
        setShowAuthModal(false);
      } else {
        setError(result.error || 'Google Authentication failed');
      }
    }
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowAuthModal(false); setError(''); }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <h2 className="text-xl font-display font-bold text-white text-center">
                Welcome to TambuaTips
              </h2>
              <p className="text-xs text-zinc-400 text-center mt-1">
                Log in to access your personalized picks seamlessly with Google
              </p>
              <button
                onClick={() => { setShowAuthModal(false); setError(''); }}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-all rounded-lg hover:bg-zinc-900 hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-8 flex flex-col items-center">
              <div className="w-full flex justify-center mb-4">
                <GoogleLogin 
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Authentication Failed')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                />
              </div>

              {error && (
                <p className="w-full text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center mt-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 text-center">
              <button
                onClick={() => { setShowAuthModal(false); setError(''); }}
                className="text-xs text-zinc-600 font-medium hover:text-zinc-400 transition-colors"
              >
                Continue as guest →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
