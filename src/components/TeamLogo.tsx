import React, { useState, useEffect } from 'react';
import { getTeamLogo, getCachedTeamLogo } from '../services/teamLogoService';

interface TeamLogoProps {
  teamName: string;
  /** Size in pixels (width & height). Default 24 */
  size?: number;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Displays a team crest/badge next to the team name.
 * Fetches from TheSportsDB and caches in localStorage.
 * Falls back to a styled initial letter if no logo found.
 */
export function TeamLogo({ teamName, size = 24, className = '' }: TeamLogoProps) {
  // Try synchronous cache first to avoid flash
  const cached = getCachedTeamLogo(teamName);
  const [logoUrl, setLogoUrl] = useState<string | null>(cached === undefined ? null : cached);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTeamLogo(teamName).then(url => {
      if (!cancelled) {
        setLogoUrl(url);
        if (!url) setError(true);
      }
    });
    return () => { cancelled = true; };
  }, [teamName]);

  const initial = teamName?.charAt(0)?.toUpperCase() || '?';

  // If we have a URL and it hasn't errored, show the image
  if (logoUrl && !error) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt={`${teamName} badge`}
          width={size}
          height={size}
          loading="lazy"
          className={`object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        {/* Show initial while image loads */}
        {!loaded && (
          <span
            className="absolute text-[10px] font-bold text-zinc-500"
            style={{ fontSize: Math.max(size * 0.4, 8) }}
          >
            {initial}
          </span>
        )}
      </span>
    );
  }

  // Fallback: styled initial
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-zinc-800/80 border border-zinc-700/40 shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(size * 0.4, 8) }}
      title={teamName}
    >
      <span className="font-bold text-zinc-500">{initial}</span>
    </span>
  );
}

/**
 * Convenience: renders "Logo TeamName" inline.
 */
export function TeamWithLogo({
  teamName,
  size = 20,
  className = '',
  textClassName = '',
}: TeamLogoProps & { textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <TeamLogo teamName={teamName} size={size} />
      <span className={`truncate ${textClassName}`}>{teamName}</span>
    </span>
  );
}
