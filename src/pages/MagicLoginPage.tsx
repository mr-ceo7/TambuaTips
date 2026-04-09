import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, XCircle } from 'lucide-react';

export function MagicLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { magicLogin } = useUser();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    const token = searchParams.get('t');
    
    if (!token) {
      setStatus('error');
      toast.error('Invalid login link. Token missing.');
      return;
    }

    const authenticate = async () => {
      const result = await magicLogin(token);
      if (result.success) {
        setStatus('success');
        toast.success('Successfully logged in! Welcome to the new TambuaTips! 🎉');
        setTimeout(() => {
          navigate('/tips', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
        toast.error(result.error || 'Failed to login with this link.');
      }
    };

    authenticate();
  }, [searchParams, magicLogin, navigate]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="flex justify-center mb-6">
          <img src="/logo-icon.png" alt="TambuaTips" className="w-16 h-16 object-contain" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
        </div>
        
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white font-display">Authenticating...</h2>
            <p className="text-zinc-400 text-sm">Securing your new account connection.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-emerald-400 font-display">Authentication Successful</h2>
            <p className="text-zinc-400 text-sm">Redirecting you to your tips...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-red-400 font-display">Login Failed</h2>
            <p className="text-zinc-400 text-sm">
              This link is invalid or has expired. You can still access your account by signing in with your phone number.
            </p>
            <button 
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all w-full"
            >
              Go to Home Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
