/**
 * AffiliateContext — manages affiliate auth state (separate from main user auth).
 * Only active when on the affiliate subdomain.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { affiliateService } from '../services/affiliateService';

interface AffiliateProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  referral_code: string;
  status: string;
  is_affiliate_admin: boolean;
  affiliate_admin_id: number | null;
  total_clicks: number;
  total_signups: number;
  total_revenue: number;
  commission_earned: number;
  commission_paid: number;
  commission_balance: number;
  created_at: string | null;
}

interface AffiliateContextType {
  affiliate: AffiliateProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  requestPhoneOtp: (phone: string, name?: string) => Promise<void>;
  phoneLogin: (phone: string, otp: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AffiliateContext = createContext<AffiliateContextType | undefined>(undefined);

export function AffiliateProvider({ children }: { children: React.ReactNode }) {
  const [affiliate, setAffiliate] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await affiliateService.getMe();
      setAffiliate(res.data);
      setError(null);
    } catch {
      setAffiliate(null);
    }
  }, []);

  // Initial load — try to restore session from cookies
  useEffect(() => {
    (async () => {
      try {
        const res = await affiliateService.getMe();
        setAffiliate(res.data);
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    })();

    // Listen for unauthorized events from the interceptor
    const handleUnauth = () => {
      setAffiliate(null);
    };
    window.addEventListener('affiliate:unauthorized', handleUnauth);
    return () => window.removeEventListener('affiliate:unauthorized', handleUnauth);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await affiliateService.login({ email, password });
    if (res.data.status === 'success') {
      await refreshProfile();
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<string> => {
    const res = await affiliateService.register({ name, email, password, phone });
    return res.data.message;
  };

  const googleLogin = useCallback(async (idToken: string) => {
    try {
      await affiliateService.googleLogin(idToken);
      await refreshProfile();
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        throw new Error(err.response.data?.detail || 'Account pending approval');
      }
      throw new Error(err.response?.data?.detail || 'Google login failed');
    }
  }, [refreshProfile]);

  const requestPhoneOtp = useCallback(async (phone: string, name?: string) => {
    try {
      await affiliateService.requestPhoneOtp(phone, name);
      setError(null);
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to send OTP');
    }
  }, []);

  const phoneLogin = useCallback(async (phone: string, otp: string) => {
    try {
      await affiliateService.phoneLogin(phone, otp);
      await refreshProfile();
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        throw new Error(err.response.data?.detail || 'Account pending approval');
      }
      throw new Error(err.response?.data?.detail || 'Invalid OTP code');
    }
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    try {
      await affiliateService.logout();
    } finally {
      setAffiliate(null);
    }
  }, []);

  return (
    <AffiliateContext.Provider value={{ affiliate, loading, error, login, googleLogin, requestPhoneOtp, phoneLogin, register, logout, refreshProfile }}>
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliate() {
  const ctx = useContext(AffiliateContext);
  if (!ctx) throw new Error('useAffiliate must be used within AffiliateProvider');
  return ctx;
}
