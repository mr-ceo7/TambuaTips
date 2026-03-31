import React, { useState } from 'react';
import { FixtureData } from '../types';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { FixtureRowSkeleton } from './skeletons/FixtureRowSkeleton';
import { TeamLogo } from './TeamLogo';

interface TodaysFixturesProps {
  fixtures: FixtureData[];
  loading: boolean;
}

export function TodaysFixtures({ fixtures, loading }: TodaysFixturesProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedFixtures = showAll ? fixtures : fixtures.slice(0, 5);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          <h3 className="text-sm sm:text-base font-display font-bold text-white uppercase tracking-wider">Today's Fixtures</h3>
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">
          {fixtures.length} Matches
        </span>
      </div>

      <div className={`p-0 overflow-y-auto hide-scrollbar transition-all duration-300 ease-in-out ${showAll ? 'max-h-[600px]' : 'max-h-[300px] sm:max-h-[400px]'}`}>
        {loading ? (
          <div className="divide-y divide-zinc-800/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <FixtureRowSkeleton key={i} />
            ))}
          </div>
        ) : fixtures.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <p className="text-xs sm:text-sm">No major fixtures scheduled for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {displayedFixtures.map((fixture) => {
              let timeStr = 'TBD';
              try {
                timeStr = format(parseISO(fixture.matchDate), 'HH:mm');
              } catch (e) {
                // ignore
              }

              const isLive = fixture.status === 'live';
              const isFinished = fixture.status === 'finished';

              return (
                <div key={fixture.id} className="p-3 sm:p-4 hover:bg-zinc-800/30 transition-colors flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                        {fixture.league}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate inline-flex items-center gap-1.5"><TeamLogo teamName={fixture.homeTeam} size={16} />{fixture.homeTeam}</span>
                        {(isLive || isFinished) && fixture.score && (
                          <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 shrink-0">{fixture.score.split(' - ')[0]}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate inline-flex items-center gap-1.5"><TeamLogo teamName={fixture.awayTeam} size={16} />{fixture.awayTeam}</span>
                        {(isLive || isFinished) && fixture.score && (
                          <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 shrink-0">{fixture.score.split(' - ')[1]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-3 sm:ml-4 flex flex-col items-end justify-center min-w-[50px] sm:min-w-[60px] shrink-0">
                    {isLive ? (
                      <span className="flex items-center gap-1 sm:gap-1.5 rounded bg-red-500/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-500">
                        <span className="relative flex h-1 w-1 sm:h-1.5 sm:w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1 w-1 sm:h-1.5 sm:w-1.5 bg-red-500"></span>
                        </span>
                        {fixture.elapsed ? `${fixture.elapsed}'` : 'LIVE'}
                      </span>
                    ) : isFinished ? (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded">FT</span>
                    ) : (
                      <div className="flex flex-col items-end text-zinc-400 group-hover:text-emerald-400 transition-colors">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mb-0.5" />
                        <span className="text-[10px] sm:text-xs font-mono font-bold">{timeStr}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {fixtures.length > 5 && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className="flex items-center justify-center gap-2 w-full text-center p-2.5 sm:p-3 bg-zinc-950/50 border-t border-zinc-800 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-500 hover:bg-zinc-900 hover:text-emerald-400 active:bg-zinc-800 transition-all"
        >
          {showAll ? (
            <>Hide Schedule <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /></>
          ) : (
            <>View Full Schedule <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
