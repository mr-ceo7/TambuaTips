import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  favoriteTeams: string[];
  toggleFavoriteTeam: (team: string) => void;
  notifiedMatches: string[];
  toggleMatchNotification: (matchId: string) => void;
  notifiedLeagues: string[];
  toggleLeagueNotification: (league: string) => void;
  bettingHistory: any[]; // We can define a type later
  addBet: (bet: any) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [notifiedMatches, setNotifiedMatches] = useState<string[]>([]);
  const [notifiedLeagues, setNotifiedLeagues] = useState<string[]>([]);
  const [bettingHistory, setBettingHistory] = useState<any[]>([]);

  useEffect(() => {
    const favs = localStorage.getItem('tambua_fav_teams');
    if (favs) setFavoriteTeams(JSON.parse(favs));
    
    const notifs = localStorage.getItem('tambua_notif_matches');
    if (notifs) setNotifiedMatches(JSON.parse(notifs));

    const leagueNotifs = localStorage.getItem('tambua_notif_leagues');
    if (leagueNotifs) setNotifiedLeagues(JSON.parse(leagueNotifs));

    const history = localStorage.getItem('tambua_betting_history');
    if (history) setBettingHistory(JSON.parse(history));
  }, []);

  const toggleFavoriteTeam = (team: string) => {
    setFavoriteTeams(prev => {
      const next = prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team];
      localStorage.setItem('tambua_fav_teams', JSON.stringify(next));
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
      favoriteTeams, toggleFavoriteTeam, 
      notifiedMatches, toggleMatchNotification,
      notifiedLeagues, toggleLeagueNotification,
      bettingHistory, addBet
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
