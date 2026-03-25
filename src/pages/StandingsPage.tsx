import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Trophy } from 'lucide-react';
import { fetchStandings, LEAGUES } from '../services/sportsApiService';
import { TeamStanding } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';

export function StandingsPage() {
  usePageTitle('Standings');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLeague = parseInt(searchParams.get('league') || '39');
  const [selectedLeague, setSelectedLeague] = useState(initialLeague);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);

  const leagueOptions = Object.values(LEAGUES);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchStandings(selectedLeague);
        setStandings(data);
      } catch (err) {
        console.error('Failed to load standings:', err);
        setStandings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedLeague]);

  const handleLeagueChange = (leagueId: number) => {
    setSelectedLeague(leagueId);
    setSearchParams({ league: String(leagueId) });
  };

  const currentLeague = leagueOptions.find(l => l.id === selectedLeague);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase mb-2">Standings</h1>
        <p className="text-sm text-zinc-400">League tables for top competitions</p>
      </div>

      {/* League Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {leagueOptions.map(league => (
          <button
            key={league.id}
            onClick={() => handleLeagueChange(league.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
              league.id === selectedLeague
                ? 'bg-emerald-500 text-zinc-950'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <span>{league.flag}</span> {league.name}
          </button>
        ))}
      </div>

      {/* Current League Header */}
      {currentLeague && (
        <div className="flex items-center gap-3 mb-4 bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-3">
          <span className="text-2xl">{currentLeague.flag}</span>
          <div>
            <h2 className="text-lg font-display font-bold text-zinc-200">{currentLeague.name}</h2>
            <span className="text-xs text-zinc-500">{currentLeague.country}</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No standings data available for this league</p>
          <p className="text-xs text-zinc-600 mt-1">The season may not have started yet</p>
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-8">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Team</th>
                  <th className="text-center px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">P</th>
                  <th className="text-center px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">W</th>
                  <th className="text-center px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">D</th>
                  <th className="text-center px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">L</th>
                  <th className="text-center px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">GD</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, i) => (
                  <tr
                    key={team.team.id}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                      i < 4 ? 'border-l-2 border-l-emerald-500' : i >= standings.length - 3 ? 'border-l-2 border-l-red-500' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-zinc-400">{team.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {team.team.logo && (
                          <img src={team.team.logo} alt={team.team.name} className="w-5 h-5 object-contain" />
                        )}
                        <span className="text-sm font-medium text-zinc-200 truncate max-w-[150px] sm:max-w-none">{team.team.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-2 py-3 text-xs text-zinc-400">{team.all.played}</td>
                    <td className="text-center px-2 py-3 text-xs text-zinc-400">{team.all.win}</td>
                    <td className="text-center px-2 py-3 text-xs text-zinc-400">{team.all.draw}</td>
                    <td className="text-center px-2 py-3 text-xs text-zinc-400">{team.all.lose}</td>
                    <td className="text-center px-2 py-3 text-xs text-zinc-400 hidden sm:table-cell">
                      <span className={team.goalsDiff > 0 ? 'text-emerald-400' : team.goalsDiff < 0 ? 'text-red-400' : ''}>
                        {team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3 text-sm font-bold text-white">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
