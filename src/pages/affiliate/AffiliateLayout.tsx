/**
 * AffiliateLayout — sidebar navigation + content area for the affiliate portal.
 * Dark theme consistent with the admin panel.
 * Pending affiliates see the dashboard but other pages are locked.
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import {
  LayoutDashboard, TrendingUp, DollarSign, Users, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Clock, Lock
} from 'lucide-react';
import { useAffiliate } from '../../context/AffiliateContext';

export function AffiliateLayout() {
  const { affiliate, logout } = useAffiliate();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPending = affiliate?.status === 'pending';
  const restrictedPaths = ['/conversions', '/payouts', '/team'];
  const isRestricted = isPending && restrictedPaths.some(p => location.pathname.includes(p));

  const NAV_ITEMS = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { path: '/conversions', icon: TrendingUp, label: 'Conversions', end: false },
    { path: '/payouts', icon: DollarSign, label: 'Payouts', end: false },
    ...(affiliate?.is_affiliate_admin
      ? [{ path: '/team', icon: Users, label: 'My Team', end: false }]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#09090b', color: '#fafafa',
    }}>
      <Toaster theme="dark" position="top-center" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(24,24,27,0.95)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(63,63,70,0.5)',
        transition: 'all 0.3s ease-out',
        width: collapsed ? '72px' : '240px',
        transform: mobileOpen ? 'translateX(0)' : (window.innerWidth < 1024 ? 'translateX(-100%)' : 'translateX(0)'),
      }}>
        {/* Logo */}
        <div style={{
          height: '64px', display: 'flex', alignItems: 'center', padding: '0 1rem',
          borderBottom: '1px solid rgba(63,63,70,0.4)', gap: '0.75rem', flexShrink: 0,
        }}>
          <img
            src="/tambua-logo.png"
            alt="TambuaTips"
            style={{
              width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
            }}
          />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white', margin: 0 }}>TambuaTips</p>
              <p style={{ fontSize: '0.625rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Affiliate Portal
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.5rem', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const locked = isPending && item.path !== '/dashboard';
            return (
              <NavLink
                key={item.path}
                to={locked ? '#' : item.path}
                end={item.end}
                onClick={(e) => {
                  if (locked) e.preventDefault();
                  setMobileOpen(false);
                }}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem',
                  fontWeight: 500, textDecoration: 'none', marginBottom: '4px',
                  transition: 'all 0.2s', position: 'relative' as const,
                  background: isActive && !locked ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: locked ? '#52525b' : (isActive ? '#10b981' : '#a1a1aa'),
                  border: isActive && !locked ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                  opacity: locked ? 0.5 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                })}
              >
                <item.icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && locked && <Lock style={{ width: '14px', height: '14px', marginLeft: 'auto', color: '#71717a' }} />}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(63,63,70,0.4)', flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem',
              fontWeight: 500, color: '#71717a', background: 'transparent',
              border: 'none', cursor: 'pointer', width: '100%',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(63,63,70,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: window.innerWidth >= 1024 ? 'flex' : 'none',
              alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '0.5rem', borderRadius: '12px', marginTop: '0.5rem',
              color: '#52525b', background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {collapsed ? <ChevronRight style={{ width: '16px', height: '16px' }} /> : <ChevronLeft style={{ width: '16px', height: '16px' }} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        transition: 'all 0.3s',
        marginLeft: window.innerWidth >= 1024 ? (collapsed ? '72px' : '240px') : '0',
      }}>
        {/* Top bar */}
        <header style={{
          height: '64px', borderBottom: '1px solid rgba(63,63,70,0.4)',
          background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1rem', position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: window.innerWidth < 1024 ? 'flex' : 'none',
              padding: '0.5rem', borderRadius: '12px', color: '#a1a1aa',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            {mobileOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
            {isPending && (
              <span style={{
                padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem',
                fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                ⏳ Pending Approval
              </span>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white', margin: 0 }}>{affiliate?.name}</p>
              <p style={{ fontSize: '0.625rem', color: '#71717a', margin: 0 }}>{affiliate?.email}</p>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>
                {affiliate?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Pending Approval Banner */}
        {isPending && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(234,88,12,0.08) 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '16px',
            margin: '1rem 1.5rem 0',
            padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          }}>
            <Clock style={{ width: '20px', height: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24', margin: '0 0 0.25rem' }}>
                Account Pending Approval
              </p>
              <p style={{ fontSize: '0.8rem', color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
                Your affiliate account is under review. You can explore the dashboard, but conversions, payouts, and team features will be unlocked once an admin approves your account.
              </p>
            </div>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          {isRestricted ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: '40vh', textAlign: 'center',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.5rem',
              }}>
                <Lock style={{ width: '36px', height: '36px', color: '#f59e0b' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: '0 0 0.5rem' }}>
                Feature Locked
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#a1a1aa', maxWidth: '400px', lineHeight: 1.6 }}>
                This section will be available once your account has been approved by an admin.
                Check back soon!
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                  color: '#10b981', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
