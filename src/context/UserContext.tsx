import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SubscriptionTier } from '../services/pricingService';
import type { TipCategory } from '../services/tipsService';
import { hasAccessToCategory } from '../services/pricingService';

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
  isPremium?: boolean; // kept for backwards compat
  subscription: UserSubscription;
}

interface UserContextType {
  // Auth
  user: UserData | null;
  isLoggedIn: boolean;
  subscribeTo: (tier: SubscriptionTier, durationWeeks: 2 | 4) => void;
  hasAccess: (category: TipCategory) => boolean;
  showPricingModal: boolean;
  setShowPricingModal: (show: boolean) => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (username: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;

  // Legacy compat
  upgradeToPremium: () => void;

  // Personalization
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

// Storage keys
const USERS_KEY = 'tambuatips_users';
const SESSION_KEY = 'tambuatips_session';

const DEFAULT_SUB: UserSubscription = { tier: 'free', expiresAt: '' };

function loadUsers(): Record<string, { username: string; email: string; password: string; createdAt: string; isPremium?: boolean; subscription?: UserSubscription }> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveUsers(users: Record<string, any>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUserSub(userData: any): UserSubscription {
  if (userData.subscription) return userData.subscription;
  // Migrate old isPremium users
  if (userData.isPremium) return { tier: 'premium', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
  return DEFAULT_SUB;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<number[]>([]);
  const [notifiedMatches, setNotifiedMatches] = useState<string[]>([]);
  const [notifiedLeagues, setNotifiedLeagues] = useState<string[]>([]);
  const [bettingHistory, setBettingHistory] = useState<any[]>([]);

  // Restore session on mount
  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      const users = loadUsers();
      const userData = users[sessionId];
      if (userData) {
        const sub = getUserSub(userData);
        setUser({ id: sessionId, username: userData.username, email: userData.email, createdAt: userData.createdAt, isPremium: sub.tier !== 'free', subscription: sub });
      }
    }

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
  }, []);

  const signup = useCallback((username: string, email: string, password: string) => {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase().trim();

    for (const u of Object.values(users)) {
      if (u.email === normalizedEmail) {
        return { success: false, error: 'Email already registered' };
      }
    }

    const id = crypto.randomUUID();
    const sub = DEFAULT_SUB;
    const newUser = { username: username.trim(), email: normalizedEmail, password, createdAt: new Date().toISOString(), subscription: sub };
    users[id] = newUser;
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, id);
    setUser({ id, username: newUser.username, email: newUser.email, createdAt: newUser.createdAt, isPremium: false, subscription: sub });
    setShowAuthModal(false);
    return { success: true };
  }, []);

  const login = useCallback((email: string, password: string) => {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase().trim();

    for (const [id, u] of Object.entries(users)) {
      if (u.email === normalizedEmail && u.password === password) {
        localStorage.setItem(SESSION_KEY, id);
        const sub = getUserSub(u);
        setUser({ id, username: u.username, email: u.email, createdAt: u.createdAt, isPremium: sub.tier !== 'free', subscription: sub });
        setShowAuthModal(false);
        return { success: true };
      }
    }

    return { success: false, error: 'Invalid email or password' };
  }, []);

  const subscribeTo = useCallback((tier: SubscriptionTier, durationWeeks: 2 | 4) => {
    if (user) {
      const users = loadUsers();
      if (users[user.id]) {
        const expiresAt = new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString();
        const sub: UserSubscription = { tier, expiresAt };
        users[user.id].subscription = sub;
        users[user.id].isPremium = tier !== 'free';
        saveUsers(users);
        setUser(prev => prev ? { ...prev, isPremium: tier !== 'free', subscription: sub } : prev);
      }
    }
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

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

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
      user, isLoggedIn: !!user, login, signup, logout, upgradeToPremium, subscribeTo, hasAccess,
      showAuthModal, setShowAuthModal,
      showPricingModal, setShowPricingModal,
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
