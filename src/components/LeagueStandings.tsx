import React, { useEffect, useState } from 'react';
import { fetchStandings } from '../services/sportsApiService';
import { TeamStanding } from '../types';
import { Trophy, Loader2, AlertCircle, Bell, BellRing } from 'lucide-react';
import { useUser } from '../context/UserContext';

const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' }
];

export function LeagueStandings() {
  const [activeLeague, setActiveLeague] = useState(LEAGUES[0].id);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { notifiedLeagues, toggleLeagueNotification } = useUser();
  const activeLeagueName = LEAGUES.find(l => l.id === activeLeague)?.name || '';
  const isNotified = notifiedLeagues.includes(activeLeagueName);

  useEffect(() => {
    let isMounted = true;
    
    const loadStandings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStandings(activeLeague);
        if (isMounted) setStandings(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load standings');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStandings();
    
    return () => { isMounted = false; };
  }, [activeLeague]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" />
          <h3 className="text-sm sm:text-base font-display font-bold text-white uppercase tracking-wider">League Standings</h3>
        </div>
        <button 
          onClick={() => toggleLeagueNotification(activeLeagueName)}
          className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${isNotified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-emerald-400'}`}
          title={isNotified ? "Remove League Notifications" : "Notify me about this league"}
        >
          {isNotified ? <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>
      </div>
      
      <div className="flex overflow-x-auto border-b border-zinc-800 hide-scrollbar scroll-smooth">
        {LEAGUES.map(league => (
          <button
            key={league.id}
            onClick={() => setActiveLeague(league.id)}
            className={`flex-1 whitespace-nowrap px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
              activeLeague === league.id 
                ? 'bg-zinc-800 text-white border-b-2 border-emerald-500' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>

      <div className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-400">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : standings.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            No standings available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/30 text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-2 sm:px-4 py-2 font-medium w-8">#</th>
                  <th className="px-2 py-2 font-medium">Team</th>
                  <th className="px-1 sm:px-2 py-2 font-medium text-center w-8">P</th>
                  <th className="px-1 sm:px-2 py-2 font-medium text-center w-10">GD</th>
                  <th className="px-2 sm:px-4 py-2 font-medium text-center w-10">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {standings.slice(0, 10).map((row) => (
                  <tr key={row.team.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-zinc-400 font-mono text-[10px] sm:text-xs">{row.rank}</td>
                    <td className="px-2 py-2 sm:py-2.5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <img src={row.team.logo} alt={row.team.name} className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain" referrerPolicy="no-referrer" />
                        <span className="font-bold text-zinc-200 truncate max-w-[80px] sm:max-w-[140px] text-xs sm:text-sm" title={row.team.name}>{row.team.name}</span>
                      </div>
                    </td>
                    <td className="px-1 sm:px-2 py-2 sm:py-2.5 text-center text-zinc-400 font-mono text-[10px] sm:text-xs">{row.all.played}</td>
                    <td className="px-1 sm:px-2 py-2 sm:py-2.5 text-center text-zinc-400 font-mono text-[10px] sm:text-xs">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center font-bold text-emerald-400 font-mono text-[10px] sm:text-xs">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 sm:p-3 text-center border-t border-zinc-800/50">
              <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest">Top 10 Shown</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
