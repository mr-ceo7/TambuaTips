import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, signup } = useUser();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const result = signup(username, email, password);
      if (result.success) {
        toast.success(`Welcome to TambuaTips, ${username}! 🎉`);
        resetForm();
      } else {
        setError(result.error || 'Signup failed');
      }
    } else {
      const result = login(email, password);
      if (result.success) {
        toast.success('Welcome back! 👋');
        resetForm();
      } else {
        setError(result.error || 'Login failed');
      }
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
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
                  {mode === 'login' ? <LogIn className="w-5 h-5 text-emerald-500" /> : <UserPlus className="w-5 h-5 text-emerald-500" />}
                </div>
              </div>
              <h2 className="text-xl font-display font-bold text-white text-center">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-zinc-400 text-center mt-1">
                {mode === 'login' ? 'Sign in to access your personalized experience' : 'Join TambuaTips for free tips and personalized picks'}
              </p>
              <button
                onClick={() => { setShowAuthModal(false); resetForm(); }}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-all rounded-lg hover:bg-zinc-900 hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 pb-6 text-center">
              <p className="text-xs text-zinc-500">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={switchMode} className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
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
