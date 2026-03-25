import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Filter, Trophy } from 'lucide-react';
import { fetchFixturesByDate, LEAGUES } from '../services/sportsApiService';
import { FixtureData } from '../types';

function getDateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = getDateStr(1);
  const yesterday = getDateStr(-1);
  
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function FixturesPage() {
  const [fixtures, setFixtures] = useState<FixtureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getDateStr(0));
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchFixturesByDate(selectedDate);
        setFixtures(data);
      } catch (err) {
        console.error('Failed to load fixtures:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDate]);

  // Date navigation  
  const dates = useMemo(() => {
    return [-2, -1, 0, 1, 2, 3, 4].map(offset => getDateStr(offset));
  }, []);

  // Group fixtures by league, optionally filter
  const grouped = useMemo(() => {
    let filtered = fixtures;
    if (selectedLeague) {
      filtered = fixtures.filter(f => f.leagueId === selectedLeague);
    }
    const map = new Map<string, FixtureData[]>();
    filtered.forEach(f => {
      const list = map.get(f.league) || [];
      list.push(f);
      map.set(f.league, list);
    });
    return Array.from(map.entries());
  }, [fixtures, selectedLeague]);

  const leagueOptions = Object.values(LEAGUES);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase mb-2">Fixtures</h1>
        <p className="text-sm text-zinc-400">Browse matches by date and league</p>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
        {dates.map(date => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
              date === selectedDate
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {formatDateLabel(date)}
          </button>
        ))}
      </div>

      {/* League Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedLeague(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
            !selectedLeague ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          All Leagues
        </button>
        {leagueOptions.map(league => (
          <button
            key={league.id}
            onClick={() => setSelectedLeague(league.id === selectedLeague ? null : league.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
              league.id === selectedLeague ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <span>{league.flag}</span> {league.name}
          </button>
        ))}
      </div>

      {/* Fixtures List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <CalendarIcon className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No fixtures found for {formatDateLabel(selectedDate)}</p>
          <p className="text-xs text-zinc-600 mt-1">Try selecting a different date or league</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([league, matches]) => (
            <div key={league} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">{league}</h3>
                <span className="ml-auto text-xs text-zinc-600">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {matches.map(f => (
                  <Link
                    key={f.id}
                    to={`/match/${f.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Time / Status */}
                    <div className="w-14 text-center flex-shrink-0">
                      {f.status === 'live' ? (
                        <div>
                          <span className="text-xs font-bold text-red-400 font-mono">{f.elapsed}'</span>
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mx-auto mt-1 animate-pulse" />
                        </div>
                      ) : f.status === 'finished' ? (
                        <span className="text-xs font-medium text-zinc-500">FT</span>
                      ) : (
                        <span className="text-xs text-zinc-400">{new Date(f.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {f.homeLogo && <img src={f.homeLogo} alt="" className="w-4 h-4 object-contain" />}
                        <span className="text-sm font-medium text-zinc-200 truncate">{f.homeTeam}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.awayLogo && <img src={f.awayLogo} alt="" className="w-4 h-4 object-contain" />}
                        <span className="text-sm font-medium text-zinc-200 truncate">{f.awayTeam}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      {f.score ? (
                        <span className={`text-lg font-display font-bold font-mono ${f.status === 'live' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {f.score}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">vs</span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

