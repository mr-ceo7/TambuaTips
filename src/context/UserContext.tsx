import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SubscriptionTier } from '../services/pricingService';
import type { TipCategory, JackpotPrediction } from '../services/tipsService';
import { hasAccessToCategory } from '../services/pricingService';
import { authService } from '../services/authService';

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
}

interface UserContextType {
  // Auth
  user: UserData | null;
  isLoggedIn: boolean;
  subscribeTo: (tier: SubscriptionTier, durationWeeks: 2 | 4) => void;
  hasAccess: (category: TipCategory) => boolean;
  showPricingModal: boolean;
  setShowPricingModal: (show: boolean, category?: TipCategory) => void;
  targetCategory: TipCategory | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  toggleMatchNotification: (matchId: string) => void;
  notifiedLeagues: string[];
  toggleLeagueNotification: (league: string) => void;
  bettingHistory: any[];
  addBet: (bet: any) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, _setShowPricingModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<TipCategory | null>(null);

  const setShowPricingModal = useCallback((show: boolean, category?: TipCategory) => {
    _setShowPricingModal(show);
    if (show && category) setTargetCategory(category);
    else if (!show) setTargetCategory(null);
  }, []);
  const [showJackpotModal, setShowJackpotModal] = useState(false);
  const [selectedJackpot, setSelectedJackpot] = useState<JackpotPrediction | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<number[]>([]);
  const [notifiedMatches, setNotifiedMatches] = useState<string[]>([]);
  const [notifiedLeagues, setNotifiedLeagues] = useState<string[]>([]);
  const [bettingHistory, setBettingHistory] = useState<any[]>([]);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('tambuatips_access_token');
    if (token) {
      try {
        const userData = await authService.me();
        setUser(userData);
      } catch (error) {
        console.error('Failed to refresh user', error);
        // Don't logout on refresh error, just set user to null if it's a 401
        if ((error as any).response?.status === 401) {
          setUser(null);
        }
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

  const signup = useCallback(async (username: string, email: string, password: string) => {
    try {
      const tokens = await authService.register(username, email, password);
      localStorage.setItem('tambuatips_access_token', tokens.access_token);
      localStorage.setItem('tambuatips_refresh_token', tokens.refresh_token);
      
      const userData = await authService.me();
      setUser(userData);
      setShowAuthModal(false);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Signup failed. Email might be in use.' 
      };
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const tokens = await authService.login(email, password);
      localStorage.setItem('tambuatips_access_token', tokens.access_token);
      localStorage.setItem('tambuatips_refresh_token', tokens.refresh_token);
      
      const userData = await authService.me();
      setUser(userData);
      setShowAuthModal(false);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Invalid email or password' 
      };
    }
  }, []);

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

  const toggleFavoriteTeam = (team: string) => {
    setFavoriteTeams(prev => {
      const next = prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team];
      localStorage.setItem('tambua_fav_teams', JSON.stringify(next));
      return next;
    });
  };

  const toggleFavoriteLeague = (leagueId: number) => {
    setFavoriteLeagues(prev => {
      const next = prev.includes(leagueId) ? prev.filter(l => l !== leagueId) : [...prev, leagueId];
      localStorage.setItem('tambua_fav_leagues', JSON.stringify(next));
      return next;
    });
  };

  const toggleMatchNotification = (matchId: string) => {
    setNotifiedMatches(prev => {
      const next = prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId];
      localStorage.setItem('tambua_notif_matches', JSON.stringify(next));
      return next;
    });
  };

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
      user, isLoggedIn: !!user, login, signup, logout, refreshUser, upgradeToPremium, subscribeTo, hasAccess,
      showAuthModal, setShowAuthModal,
      showPricingModal, setShowPricingModal, targetCategory,
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
