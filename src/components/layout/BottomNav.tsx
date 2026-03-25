import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Newspaper, Trophy, Lightbulb } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/fixtures', icon: Calendar, label: 'Fixtures' },
  { to: '/news', icon: Newspaper, label: 'News' },
  { to: '/standings', icon: Trophy, label: 'Standings' },
  { to: '/tips', icon: Lightbulb, label: 'Tips' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400 scale-105'
                  : 'text-zinc-500 hover:text-zinc-300 active:scale-95'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? '' : ''}`}>
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
