import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, signup, verifyEmail, googleLogin } = useUser();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'verify') {
      if (!verificationCode || verificationCode.length !== 6) {
        setError('Please enter the 6-digit code sent to your email');
        return;
      }
      const result = await verifyEmail(verificationCode);
      if (result.success) {
        toast.success('Email verified! Redirecting...');
        resetForm();
      } else {
        setError(result.error || 'Verification failed');
      }
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup') {
      if (!username) {
        setError('Username is required');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
      const result = await signup(username, email, password);
      if (result.success) {
        toast.success(`Check your email! We sent a code to ${email}`);
        setMode('verify');
      } else {
        setError(result.error || 'Signup failed');
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Welcome back! 👋');
        resetForm();
      } else {
        if (result.error?.toLowerCase().includes('unverified')) {
          setMode('verify');
          setError('Please verify your account to continue.');
        } else {
          setError(result.error || 'Login failed');
        }
      }
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        toast.success(`Google Auth Successful! 🎉`);
        resetForm();
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
            onClick={() => { setShowAuthModal(false); resetForm(); }}
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
                  {mode === 'login' && <LogIn className="w-5 h-5 text-emerald-500" />}
                  {mode === 'signup' && <UserPlus className="w-5 h-5 text-emerald-500" />}
                  {mode === 'verify' && <Mail className="w-5 h-5 text-emerald-500" />}
                </div>
              </div>
              <h2 className="text-xl font-display font-bold text-white text-center">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'verify' && 'Verify Email'}
              </h2>
              <p className="text-xs text-zinc-400 text-center mt-1">
                {mode === 'login' && 'Sign in to access your personalized experience'}
                {mode === 'signup' && 'Join TambuaTips for free tips and personalized picks'}
                {mode === 'verify' && 'We sent a verification code to your email.'}
              </p>
              <button
                onClick={() => { setShowAuthModal(false); resetForm(); }}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-all rounded-lg hover:bg-zinc-900 hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 pb-2">
              {mode !== 'verify' && (
                <div className="mb-6 flex justify-center">
                  <GoogleLogin 
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Authentication Failed')}
                    useOneTap
                    theme="filled_black"
                    shape="pill"
                  />
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              {mode !== 'verify' ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 h-px bg-zinc-800"></div>
                    <span className="text-xs text-zinc-500 font-bold uppercase">or</span>
                    <div className="flex-1 h-px bg-zinc-800"></div>
                  </div>
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          placeholder="Choose a username"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-12 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 text-center">6-Digit Verification Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="XXXXXX"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[1em] text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'verify' && 'Verify & Continue'}
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 pb-6 text-center">
              {mode !== 'verify' && (
                <p className="text-xs text-zinc-500">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={switchMode} className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              )}
              {mode === 'verify' && (
                 <p className="text-xs text-zinc-500">
                 Didn't receive a code? <button onClick={() => setMode('login')} className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">Go Back to Login</button>
               </p>
              )}
              <button
                onClick={() => { setShowAuthModal(false); resetForm(); }}
                className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
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
