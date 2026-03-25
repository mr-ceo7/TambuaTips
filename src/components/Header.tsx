import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Trophy, Bell, BellRing, Menu, User, X, Home, Calendar, Newspaper, BarChart3, Lightbulb } from 'lucide-react';
import { UserProfile } from './UserProfile';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/fixtures', label: 'Fixtures', icon: Calendar },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/tips', label: 'Tips', icon: Lightbulb },
];

export function Header() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleNotifications = () => {
    if (!notificationsEnabled) {
      alert("Push notifications enabled! You'll receive alerts for tips and live scores.");
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 max-w-7xl">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform duration-300">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-lg sm:text-xl font-display font-bold tracking-tight text-zinc-50 uppercase">
              Tambua<span className="text-emerald-500">Tips</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleNotifications}
              className="relative p-2 text-zinc-400 hover:text-white transition-all rounded-full hover:bg-zinc-800 hover:scale-110 active:scale-95"
              title={notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
            >
              {notificationsEnabled ? <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> : <Bell className="w-4 h-4 sm:w-5 sm:h-5" />}
              {notificationsEnabled && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-zinc-950" />}
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-2 text-zinc-400 hover:text-white transition-all rounded-full hover:bg-zinc-800 hover:scale-110 active:scale-95"
              title="My Profile"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <Link
              to="/tips"
              className="hidden sm:block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Go Premium
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-all rounded-full hover:bg-zinc-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg">
            <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
