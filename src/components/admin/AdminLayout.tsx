import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import {
  LayoutDashboard, Users, TrendingUp, Trophy, DollarSign, Settings,
  Bell, ChevronLeft, ChevronRight, LogOut, Shield, Menu, X, Megaphone, Presentation
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { usePageTitle } from '../../hooks/usePageTitle';

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/users', icon: Users, label: 'Users', end: false },
  { path: '/admin/tips', icon: TrendingUp, label: 'Tips', end: false },
  { path: '/admin/jackpots', icon: Trophy, label: 'Jackpots', end: false },
  { path: '/admin/revenue', icon: DollarSign, label: 'Revenue', end: false },
  { path: '/admin/pricing', icon: Settings, label: 'Pricing', end: false },
  { path: '/admin/ads', icon: Megaphone, label: 'Ads', end: false },
  { path: '/admin/campaigns', icon: Presentation, label: 'Campaigns', end: false },
  { path: '/admin/broadcast', icon: Bell, label: 'Broadcast', end: false },
  { path: '/admin/settings', icon: Settings, label: 'Settings', end: false },
];

export function AdminLayout() {
  usePageTitle('Admin Console');
  const { user } = useUser();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || !user.is_admin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-display">Access Denied</h2>
        <p className="text-zinc-400 text-center max-w-sm mb-6">
          You do not have administrative privileges to access this console.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm font-medium"
        >
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex font-sans text-zinc-50">
      <Toaster theme="dark" position="top-center" />
      {/* ─── Mobile overlay ──────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ─── Sidebar ────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800/80
        transition-all duration-300 ease-out
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-zinc-800/60 gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white font-display tracking-wide">TambuaTips</p>
              <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-widest">Admin Console</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                }
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-800 text-white text-xs rounded-lg
                  invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap
                  shadow-xl pointer-events-none z-50
                ">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-800/60 space-y-2 shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-all w-full"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Back to Site</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'}`}>
        {/* Top bar */}
        <header className="h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-[10px] text-zinc-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-400">{user.username?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
