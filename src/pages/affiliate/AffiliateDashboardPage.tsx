/**
 * AffiliateDashboardPage — main dashboard with stats cards, unique link, and recent conversions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAffiliate } from '../../context/AffiliateContext';
import { affiliateService } from '../../services/affiliateService';
import {
  MousePointerClick, UserPlus, ShoppingCart, DollarSign,
  Copy, Check, TrendingUp, Calendar, ArrowUpRight, Loader2,
} from 'lucide-react';

interface DashboardStats {
  total_clicks: number;
  total_signups: number;
  total_purchases: number;
  total_revenue: number;
  commission_earned: number;
  commission_paid: number;
  commission_balance: number;
  month_clicks: number;
  month_signups: number;
  month_purchases: number;
  month_commission: number;
}

interface Conversion {
  id: number;
  conversion_type: string;
  amount: number;
  commission_amount: number;
  created_at: string | null;
  user_name: string | null;
}

export function AffiliateDashboardPage() {
  const { affiliate } = useAffiliate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const affiliateLink = `https://www.tambuatips.com/?aff=${affiliate?.referral_code}`;

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, convRes] = await Promise.all([
        affiliateService.getDashboard(),
        affiliateService.getConversions(1, 10),
      ]);
      setStats(statsRes.data);
      setConversions(convRes.data.items || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = affiliateLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 style={{ width: '32px', height: '32px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const s = stats!;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>
          Welcome back, {affiliate?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Here's your affiliate performance overview
        </p>
      </div>

      {/* Unique Link Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
        border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px',
        padding: '1.25rem', marginBottom: '1.5rem',
      }}>
        <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>
          Your Affiliate Link
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: '200px',
            background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
            padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#d1d5db',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {affiliateLink}
          </div>
          <button
            onClick={copyLink}
            style={{
              padding: '0.75rem 1.25rem', borderRadius: '12px', border: 'none',
              background: copied ? '#059669' : '#10b981',
              color: 'white', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {copied ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: '0.5rem' }}>
          Share this link to earn commissions on every referred purchase
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem', marginBottom: '1.5rem',
      }}>
        <StatsCard icon={<MousePointerClick />} label="Total Clicks" value={s.total_clicks} monthly={s.month_clicks} color="#3b82f6" />
        <StatsCard icon={<UserPlus />} label="Signups" value={s.total_signups} monthly={s.month_signups} color="#8b5cf6" />
        <StatsCard icon={<ShoppingCart />} label="Purchases" value={s.total_purchases} monthly={s.month_purchases} color="#f59e0b" />
        <StatsCard icon={<DollarSign />} label="Commission Balance" value={`KES ${s.commission_balance.toLocaleString()}`} monthly={s.month_commission} color="#10b981" isCurrency />
      </div>

      {/* Commission Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.75rem', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Total Earned', value: s.commission_earned, color: '#10b981' },
          { label: 'Total Paid', value: s.commission_paid, color: '#3b82f6' },
          { label: 'Balance', value: s.commission_balance, color: '#f59e0b' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', padding: '1rem',
          }}>
            <p style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, margin: '0 0 0.25rem' }}>{item.label}</p>
            <p style={{ color: item.color, fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              KES {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Conversions */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
            Recent Conversions
          </h3>
          <a href="/conversions" style={{
            color: '#10b981', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            View All <ArrowUpRight style={{ width: '14px', height: '14px' }} />
          </a>
        </div>

        {conversions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#52525b', fontSize: '0.875rem' }}>
            No conversions yet. Share your link to get started! 🚀
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Type', 'User', 'Amount', 'Commission', 'Date'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.75rem 1rem',
                      color: '#71717a', fontSize: '0.7rem', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversions.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                        background: c.conversion_type === 'purchase' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                        color: c.conversion_type === 'purchase' ? '#10b981' : '#8b5cf6',
                      }}>
                        {c.conversion_type === 'purchase' ? '💰 Purchase' : '👤 Signup'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                      {c.user_name || 'Unknown'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                      {c.amount > 0 ? `KES ${c.amount.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      {c.commission_amount > 0 ? `KES ${c.commission_amount.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#71717a', fontSize: '0.8rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, monthly, color, isCurrency }: {
  icon: React.ReactNode; label: string; value: number | string;
  monthly: number; color: string; isCurrency?: boolean;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', padding: '1.25rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: `${color}08`,
      }} />
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '0.75rem', color: color,
      }}>
        {React.cloneElement(icon as React.ReactElement, { style: { width: '20px', height: '20px' } })}
      </div>
      <p style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, margin: '0 0 0.25rem' }}>{label}</p>
      <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem',
        color: '#10b981', fontSize: '0.7rem', fontWeight: 500,
      }}>
        <Calendar style={{ width: '12px', height: '12px' }} />
        <span>This month: {isCurrency ? `KES ${monthly.toLocaleString()}` : monthly.toLocaleString()}</span>
      </div>
    </div>
  );
}
