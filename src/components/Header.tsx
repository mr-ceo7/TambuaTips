import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Trophy, Bell, BellRing, Menu, User, X, Home, Calendar, Newspaper, BarChart3, Lightbulb, LogOut } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useUser } from '../context/UserContext';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/fixtures', label: 'Fixtures', icon: Calendar },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/tips', label: 'Tips', icon: Lightbulb },
];

export function Header() {
  const { user, isLoggedIn, logout, setShowAuthModal, setShowPricingModal } = useUser();
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
          <Link to="/" className="flex items-center gap-4 group transition-all duration-500 hover:scale-[1.02]">
            {/* Logo Image Container with Ambient Glow */}
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 shrink-0">
              {/* Subtle ambient animated glow behind the ball */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md opacity-40 group-hover:opacity-100 group-hover:bg-emerald-400/30 transition-all duration-700 animate-pulse" />
              
              <img 
                src="/tambua-logo.jpg" 
                alt="TambuaTips Logo" 
                className="absolute w-[180%] h-[180%] max-w-none object-cover mix-blend-screen invert hue-rotate-180 contrast-[1.3] brightness-125 z-10 drop-shadow-[0_0_5px_rgba(16,185,129,0.2)] group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500" 
                style={{
                  maskImage: 'radial-gradient(circle at center, black 35%, transparent 60%)',
                  WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 60%)'
                }}
              />
            </div>

            {/* Premium Typography - Stacked Lockup */}
            <div className="flex flex-col items-start justify-center group-hover:translate-x-1 transition-transform duration-500">
              <span className="text-base sm:text-lg font-display font-black tracking-tight text-white leading-[0.85] mb-0.5 shadow-zinc-950 drop-shadow-md">
                TAMBUA
              </span>
              <span className="text-base sm:text-lg font-display font-black tracking-tight bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent leading-[0.85] drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)] group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500">
                TIPS
              </span>
              <div className="flex items-center mt-1 pl-[1px]">
                <span className="text-[6.5px] sm:text-[7.5px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
                  Keep Your Tips Up
                </span>
              </div>
            </div>
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
              onClick={() => isLoggedIn ? setIsProfileOpen(true) : setShowAuthModal(true)}
              className="p-2 text-zinc-400 hover:text-white transition-all rounded-full hover:bg-zinc-800 hover:scale-110 active:scale-95"
              title={isLoggedIn ? user?.username || 'Profile' : 'Sign In'}
            >
              {isLoggedIn ? (
                user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user.username} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {isLoggedIn && (
              <button
                onClick={logout}
                className="hidden sm:block p-2 text-zinc-400 hover:text-red-400 transition-all rounded-full hover:bg-zinc-800 hover:scale-110 active:scale-95"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowPricingModal(true, 'vip')}
              className="hidden sm:block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Go Premium
            </button>

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
