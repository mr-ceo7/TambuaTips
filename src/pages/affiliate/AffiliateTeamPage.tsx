/**
 * AffiliateTeamPage — for Affiliate Admins to view their team's performance.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAffiliate } from '../../context/AffiliateContext';
import { affiliateService } from '../../services/affiliateService';
import { Users, DollarSign, MousePointerClick, UserPlus, TrendingUp, Loader2, Calendar } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  status: string;
  total_clicks: number;
  total_signups: number;
  total_revenue: number;
  commission_earned: number;
  commission_paid: number;
  commission_balance: number;
  created_at: string | null;
}

interface TeamStats {
  team_size: number;
  total_clicks: number;
  total_signups: number;
  total_revenue: number;
  total_admin_commission: number;
  month_admin_commission: number;
}

export function AffiliateTeamPage() {
  const { affiliate } = useAffiliate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [teamRes, statsRes] = await Promise.all([
        affiliateService.getTeam(),
        affiliateService.getTeamStats(),
      ]);
      setMembers(teamRes.data.members || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!affiliate?.is_affiliate_admin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#71717a' }}>
        <p>Only affiliate admins can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 style={{ width: '32px', height: '32px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>My Team</h1>
        <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Overview of your assigned affiliates and your admin commission
        </p>
      </div>

      {/* Team Stats */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem', marginBottom: '1.5rem',
        }}>
          <MiniCard icon={<Users />} label="Team Size" value={stats.team_size} color="#3b82f6" />
          <MiniCard icon={<MousePointerClick />} label="Team Clicks" value={stats.total_clicks} color="#8b5cf6" />
          <MiniCard icon={<UserPlus />} label="Team Signups" value={stats.total_signups} color="#f59e0b" />
          <MiniCard icon={<TrendingUp />} label="Team Revenue" value={`KES ${stats.total_revenue.toLocaleString()}`} color="#10b981" />
          <MiniCard icon={<DollarSign />} label="Your Commission" value={`KES ${stats.total_admin_commission.toLocaleString()}`} color="#10b981" />
          <MiniCard icon={<Calendar />} label="This Month" value={`KES ${stats.month_admin_commission.toLocaleString()}`} color="#f59e0b" />
        </div>
      )}

      {/* Team Members Table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
            Team Members ({members.length})
          </h3>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#52525b' }}>
            <Users style={{ width: '40px', height: '40px', color: '#3f3f46', margin: '0 auto 0.75rem' }} />
            <p>No team members assigned yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Status', 'Clicks', 'Signups', 'Revenue', 'Commission', 'Joined'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.75rem 1rem', color: '#71717a',
                      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <p style={{ color: '#d1d5db', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{m.name}</p>
                      <p style={{ color: '#52525b', fontSize: '0.7rem', margin: 0 }}>{m.email}</p>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                        background: m.status === 'approved' ? 'rgba(16,185,129,0.15)' : m.status === 'suspended' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: m.status === 'approved' ? '#10b981' : m.status === 'suspended' ? '#ef4444' : '#f59e0b',
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>{m.total_clicks}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>{m.total_signups}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>KES {m.total_revenue.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      KES {m.commission_earned.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#71717a', fontSize: '0.8rem' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
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

function MiniCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number | string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px', padding: '1rem',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '10px',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '0.5rem', color,
      }}>
        {React.cloneElement(icon as React.ReactElement, { style: { width: '16px', height: '16px' } })}
      </div>
      <p style={{ color: '#71717a', fontSize: '0.7rem', fontWeight: 500, margin: '0 0 0.2rem' }}>{label}</p>
      <p style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
