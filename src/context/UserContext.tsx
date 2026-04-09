import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SubscriptionTier } from '../services/pricingService';
import type { TipCategory, JackpotPrediction } from '../services/tipsService';
import { hasAccessToCategory } from '../services/pricingService';
import { authService } from '../services/authService';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import { toast } from 'sonner';

// ---- Types ----
export interface UserSubscription {
  tier: SubscriptionTier;
  expiresAt: string; // ISO date
}

export interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  is_admin?: boolean;
  subscription: UserSubscription;
  purchasedJackpotIds?: string[];
  favorite_teams?: string[];
  profile_picture?: string;
  referral_code?: string;
  referrals_count?: number;
  referral_points?: number;
  referral_discount_active?: boolean;
  unlocked_tip_ids?: number[];
}

interface UserContextType {
  // Auth
  user: UserData | null;
  isLoggedIn: boolean;
  subscribeTo: (tier: SubscriptionTier, durationWeeks: 2 | 4) => void;
  hasAccess: (category: TipCategory) => boolean;
  showPricingModal: boolean;
  setShowPricingModal: (show: boolean, category?: TipCategory, tierId?: string) => void;
  targetCategory: TipCategory | null;
  targetTierId: string | null;
  googleLogin: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  magicLogin: (token: string) => Promise<{ success: boolean; error?: string }>;
  phoneLogin: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  requestPhoneOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  purchaseJackpot: (jackpotId: string) => void;
  hasJackpotAccess: (jackpotId: string) => boolean;
  showJackpotModal: boolean;
  setShowJackpotModal: (show: boolean) => void;
  selectedJackpot: JackpotPrediction | null;
  setSelectedJackpot: (jackpot: JackpotPrediction | null) => void;

  // Legacy compat
  upgradeToPremium: () => void;

  // Personalization (Local Storage)
  favoriteTeams: string[];
  toggleFavoriteTeam: (team: string) => void;
  favoriteLeagues: number[];
  toggleFavoriteLeague: (leagueId: number) => void;
  notifiedMatches: string[];
  toggleMatchNotification: (matchId: string, homeTeam?: string, awayTeam?: string) => void;
  notifiedLeagues: string[];
  toggleLeagueNotification: (league: string) => void;
  bettingHistory: any[];
  addBet: (bet: any) => void;
}

export const enablePushNotifications = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.register('/sw.js');
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          
          // Format base64
          const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
          const base64 = (vapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }

          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray
          });
        }
        await authService.pushSubscribe(sub);
      }
    } catch (err) {
      console.error("WebPush Subscription Failed:", err);
    }
  }
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, _setShowPricingModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<TipCategory | null>(null);
  const [targetTierId, setTargetTierId] = useState<string | null>(null);

  const setShowPricingModal = useCallback((show: boolean, category?: TipCategory, tierId?: string) => {
    _setShowPricingModal(show);
    if (show) {
      setTargetCategory(category || null);
      setTargetTierId(tierId || null);
    } else {
      setTargetCategory(null);
      setTargetTierId(null);
    }
  }, []);
  const [showJackpotModal, setShowJackpotModal] = useState(false);
  const [selectedJackpot, setSelectedJackpot] = useState<JackpotPrediction | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<number[]>([]);
  const [notifiedMatches, setNotifiedMatches] = useState<string[]>([]);
  const [notifiedLeagues, setNotifiedLeagues] = useState<string[]>([]);
  const [bettingHistory, setBettingHistory] = useState<any[]>([]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.me();
      setUser(userData);
      if (userData.favorite_teams) {
        setFavoriteTeams(userData.favorite_teams);
        localStorage.setItem('tambua_fav_teams', JSON.stringify(userData.favorite_teams));
      }
    } catch (error) {
      // If 401 or 403, it means no valid cookie or unverified
      if ((error as any).response?.status === 401 || (error as any).response?.status === 403) {
        setUser(null);
      }
    }
  }, []);

  // Restore session from backend on mount
  useEffect(() => {
    refreshUser();

    // Listen for unauthorized events to clear state
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    // Load local personalization
    // ...
    const favs = localStorage.getItem('tambua_fav_teams');
    if (favs) setFavoriteTeams(JSON.parse(favs));
    
    const favLeagues = localStorage.getItem('tambua_fav_leagues');
    if (favLeagues) setFavoriteLeagues(JSON.parse(favLeagues));

    const notifs = localStorage.getItem('tambua_notif_matches');
    if (notifs) setNotifiedMatches(JSON.parse(notifs));

    const leagueNotifs = localStorage.getItem('tambua_notif_leagues');
    if (leagueNotifs) setNotifiedLeagues(JSON.parse(leagueNotifs));

    const history = localStorage.getItem('tambua_betting_history');
    if (history) setBettingHistory(JSON.parse(history));

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    try {
      const refCode = localStorage.getItem('tambua_referral_code') || undefined;
      await authService.googleLogin(idToken, refCode);
      // Clear referral code after it has been used
      localStorage.removeItem('tambua_referral_code');
      
      const userData = await authService.me();
      setUser(userData);
      if (userData.favorite_teams) {
        setFavoriteTeams(userData.favorite_teams);
        localStorage.setItem('tambua_fav_teams', JSON.stringify(userData.favorite_teams));
      }
      setShowAuthModal(false);
      enablePushNotifications();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Google Authentication Failed'
      };
    }
  }, []);

  const requestPhoneOtp = useCallback(async (phone: string) => {
    try {
      const refCode = localStorage.getItem('tambua_referral_code') || undefined;
      await authService.requestPhoneOtp(phone, refCode);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to send OTP'
      };
    }
  }, []);

  const phoneLogin = useCallback(async (phone: string, code: string) => {
    try {
      const refCode = localStorage.getItem('tambua_referral_code') || undefined;
      await authService.verifyPhoneOtp(phone, code, refCode);
      localStorage.removeItem('tambua_referral_code');
      
      const userData = await authService.me();
      setUser(userData);
      if (userData.favorite_teams) {
        setFavoriteTeams(userData.favorite_teams);
        localStorage.setItem('tambua_fav_teams', JSON.stringify(userData.favorite_teams));
      }
      setShowAuthModal(false);
      enablePushNotifications();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Phone verification failed'
      };
    }
  }, []);

  const magicLogin = useCallback(async (token: string) => {
    try {
      await authService.magicLogin(token);
      
      const userData = await authService.me();
      setUser(userData);
      if (userData.favorite_teams) {
        setFavoriteTeams(userData.favorite_teams);
        localStorage.setItem('tambua_fav_teams', JSON.stringify(userData.favorite_teams));
      }
      setShowAuthModal(false);
      enablePushNotifications();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Magic login failed'
      };
    }
  }, []);

  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      if (credentialResponse.credential) {
        const result = await googleLogin(credentialResponse.credential);
        if (result.success) {
          toast.success(`Welcome to TambuaTips! 🎉`);
        } else {
          toast.error(result.error || 'Google Authentication failed');
        }
      }
    },
    onError: () => {
      console.error('Google One Tap Failed');
    },
    disabled: !!user,
    cancel_on_tap_outside: false
  });

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // TODO: Implement backend integration for subscriptions and jackpots
  const subscribeTo = useCallback((tier: SubscriptionTier, durationWeeks: 2 | 4) => {
    if (user) {
      const expiresAt = new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString();
      const sub: UserSubscription = { tier, expiresAt };
      setUser(prev => prev ? { ...prev, subscription: sub } : prev);
      // Backend integration will happen in pricingService
    }
  }, [user]);

  const purchaseJackpot = useCallback((jackpotId: string) => {
    if (user) {
      const currentIds = user.purchasedJackpotIds || [];
      if (!currentIds.includes(jackpotId)) {
        const nextIds = [...currentIds, jackpotId];
        setUser(prev => prev ? { ...prev, purchasedJackpotIds: nextIds } : prev);
        // Backend integration will happen in paymentService
      }
    }
  }, [user]);

  const hasJackpotAccess = useCallback((jackpotId: string): boolean => {
    if (!user) return false;
    // Premium members get all jackpots for free
    if (user.subscription.tier === 'premium' && (!user.subscription.expiresAt || new Date(user.subscription.expiresAt) > new Date())) {
      return true;
    }
    return user.purchasedJackpotIds?.includes(jackpotId) || false;
  }, [user]);

  // Legacy compat
  const upgradeToPremium = useCallback(() => {
    subscribeTo('premium', 4);
  }, [subscribeTo]);

  const hasAccess = useCallback((category: TipCategory): boolean => {
    if (!user) return category === 'free';
    // Check if subscription is expired
    if (user.subscription.expiresAt && new Date(user.subscription.expiresAt) < new Date()) {
      return category === 'free';
    }
    return hasAccessToCategory(user.subscription.tier, category);
  }, [user]);

  const toggleFavoriteTeam = useCallback((team: string) => {
    setFavoriteTeams(prev => {
      const next = prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team];
      localStorage.setItem('tambua_fav_teams', JSON.stringify(next));
      
      // If logged in, sync with backend
      if (user) {
        authService.updateFavorites(next).catch(err => {
          console.error("Failed to sync favorite teams", err);
        });
      }
      return next;
    });
  }, [user]);

  const toggleFavoriteLeague = (leagueId: number) => {
    setFavoriteLeagues(prev => {
      const next = prev.includes(leagueId) ? prev.filter(l => l !== leagueId) : [...prev, leagueId];
      localStorage.setItem('tambua_fav_leagues', JSON.stringify(next));
      return next;
    });
  };

  // Call silently for returning users who already granted permission
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'granted') {
      enablePushNotifications();
    }
  }, [user]);

  const toggleMatchNotification = useCallback(async (matchId: string, homeTeam?: string, awayTeam?: string) => {
    setNotifiedMatches(prev => {
      const next = prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId];
      localStorage.setItem('tambua_notif_matches', JSON.stringify(next));
      return next;
    });

    if (user) {
      try {
        await authService.toggleMatchSubscription(parseInt(matchId, 10), homeTeam, awayTeam);
      } catch (err) {
        console.error("Failed to sync match subscription with server", err);
      }
      await enablePushNotifications();
    }
  }, [user]);

  const toggleLeagueNotification = (league: string) => {
    setNotifiedLeagues(prev => {
      const next = prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league];
      localStorage.setItem('tambua_notif_leagues', JSON.stringify(next));
      return next;
    });
  };

  const addBet = (bet: any) => {
    setBettingHistory(prev => {
      const next = [bet, ...prev];
      localStorage.setItem('tambua_betting_history', JSON.stringify(next));
      return next;
    });
  };

  return (
    <UserContext.Provider value={{
      user, isLoggedIn: !!user, googleLogin, magicLogin, phoneLogin, requestPhoneOtp, logout, refreshUser, upgradeToPremium, subscribeTo, hasAccess,
      showAuthModal, setShowAuthModal,
      showPricingModal, setShowPricingModal, targetCategory, targetTierId,
      purchaseJackpot, hasAccessToCategory, hasJackpotAccess,
      showJackpotModal, setShowJackpotModal,
      selectedJackpot, setSelectedJackpot,
      favoriteTeams, toggleFavoriteTeam, favoriteLeagues, toggleFavoriteLeague,
      notifiedMatches, toggleMatchNotification, notifiedLeagues, toggleLeagueNotification,
      bettingHistory, addBet,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
