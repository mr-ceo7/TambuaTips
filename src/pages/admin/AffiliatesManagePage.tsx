/**
 * AffiliatesManagePage — Admin panel page for managing the affiliate program.
 * Tabs: Affiliates, Commission Configs, Payouts, Overview Stats.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';
import {
  Users, DollarSign, Settings, TrendingUp, Search, CheckCircle, XCircle,
  Shield, UserPlus, ChevronLeft, ChevronRight, Loader2, MousePointerClick,
  ShoppingCart, Handshake, CreditCard, Save, ToggleLeft, ToggleRight,
} from 'lucide-react';

type Tab = 'overview' | 'affiliates' | 'commissions' | 'payouts';

interface AffiliateItem {
  id: number; name: string; email: string; phone: string; referral_code: string;
  status: string; is_affiliate_admin: boolean; affiliate_admin_id: number | null;
  total_clicks: number; total_signups: number; total_revenue: number;
  commission_earned: number; commission_paid: number; commission_balance: number;
  created_at: string | null; admin_name: string | null;
}

interface CommissionConfig {
  id?: number; item_type: string; tier_id: string | null; duration: string | null;
  commission_percent: number; affiliate_admin_commission_percent: number; earn_on_renewal: boolean;
}

interface PayoutItem {
  id: number; affiliate_name: string; affiliate_email: string; amount: number;
  method: string; phone: string | null; status: string; transaction_id: string | null;
  period_start: string | null; period_end: string | null; created_at: string | null;
}

interface OverviewStats {
  total_affiliates: number; pending_affiliates: number; active_affiliates: number;
  total_clicks: number; total_signups: number; total_purchases: number;
  total_commission: number; total_paid: number; unpaid_commission: number;
  total_revenue_from_affiliates: number;
}

function AffiliatesManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <TrendingUp style={{ width: '16px', height: '16px' }} /> },
    { key: 'affiliates', label: 'Affiliates', icon: <Users style={{ width: '16px', height: '16px' }} /> },
    { key: 'commissions', label: 'Commission Rates', icon: <Settings style={{ width: '16px', height: '16px' }} /> },
    { key: 'payouts', label: 'Payouts', icon: <DollarSign style={{ width: '16px', height: '16px' }} /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>
          <Handshake style={{ width: '24px', height: '24px', display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.5rem', color: '#10b981' }} />
          Affiliate Program
        </h1>
        <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Manage your affiliate marketers, commissions, and payouts
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '1.5rem', overflowX: 'auto',
        background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '4px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1rem', borderRadius: '10px', border: 'none',
              background: activeTab === t.key ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: activeTab === t.key ? '#10b981' : '#71717a',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'affiliates' && <AffiliatesTab />}
      {activeTab === 'commissions' && <CommissionsTab />}
      {activeTab === 'payouts' && <PayoutsTab />}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/affiliate-stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <p style={{ color: '#71717a' }}>Failed to load stats</p>;

  const cards = [
    { label: 'Total Affiliates', value: stats.total_affiliates, icon: <Users />, color: '#3b82f6' },
    { label: 'Pending Approval', value: stats.pending_affiliates, icon: <UserPlus />, color: '#f59e0b' },
    { label: 'Active', value: stats.active_affiliates, icon: <CheckCircle />, color: '#10b981' },
    { label: 'Total Clicks', value: stats.total_clicks, icon: <MousePointerClick />, color: '#8b5cf6' },
    { label: 'Signups', value: stats.total_signups, icon: <UserPlus />, color: '#06b6d4' },
    { label: 'Purchases', value: stats.total_purchases, icon: <ShoppingCart />, color: '#f59e0b' },
    { label: 'Revenue from Affiliates', value: `KES ${stats.total_revenue_from_affiliates.toLocaleString()}`, icon: <TrendingUp />, color: '#10b981' },
    { label: 'Total Commission', value: `KES ${stats.total_commission.toLocaleString()}`, icon: <DollarSign />, color: '#f59e0b' },
    { label: 'Total Paid', value: `KES ${stats.total_paid.toLocaleString()}`, icon: <CreditCard />, color: '#3b82f6' },
    { label: 'Unpaid', value: `KES ${stats.unpaid_commission.toLocaleString()}`, icon: <DollarSign />, color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px', padding: '1.25rem',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: `${c.color}15`, color: c.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
          }}>
            {React.cloneElement(c.icon as React.ReactElement, { style: { width: '18px', height: '18px' } })}
          </div>
          <p style={{ color: '#71717a', fontSize: '0.7rem', fontWeight: 500, margin: '0 0 0.2rem' }}>{c.label}</p>
          <p style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Affiliates Tab ───────────────────────────────────────────

function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState<AffiliateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const perPage = 15;

  // Get affiliate admins for assignment dropdown
  const [admins, setAdmins] = useState<{ id: number; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, per_page: perPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/admin/affiliates', { params });
      setAffiliates(res.data.affiliates || []);
      setTotal(res.data.total || 0);

      // Also fetch admins list for the dropdown
      const adminRes = await apiClient.get('/admin/affiliates', { params: { is_admin: true, per_page: 100 } });
      setAdmins((adminRes.data.affiliates || []).map((a: any) => ({ id: a.id, name: a.name })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/admin/affiliates/${id}/status`, { status });
      toast.success(`Affiliate ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAdmin = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await apiClient.patch(`/admin/affiliates/${id}/make-admin`);
      toast.success(res.data.message);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const assignAdmin = async (affiliateId: number, adminId: number | null) => {
    try {
      await apiClient.patch(`/admin/affiliates/${affiliateId}/assign-admin`, { affiliate_admin_id: adminId });
      toast.success('Admin assigned');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const payAffiliate = async (id: number) => {
    if (!confirm('Send payout to this affiliate?')) return;
    setActionLoading(id);
    try {
      const res = await apiClient.post(`/admin/affiliates/${id}/pay`, {});
      toast.success(`Paid KES ${res.data.amount} | TX: ${res.data.transaction_id || 'simulated'}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Payout failed');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', padding: '0 0.75rem',
        }}>
          <Search style={{ width: '16px', height: '16px', color: '#71717a' }} />
          <input
            placeholder="Search by name, email, code..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              flex: 1, padding: '0.6rem 0', background: 'transparent', border: 'none',
              color: 'white', fontSize: '0.85rem', outline: 'none',
            }}
          />
        </div>
        {['', 'pending', 'approved', 'suspended'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '10px', border: 'none', fontSize: '0.8rem',
              fontWeight: 500, cursor: 'pointer',
              background: statusFilter === s ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === s ? '#10b981' : '#a1a1aa',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Pay All button */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={async () => {
            if (!confirm('Pay ALL affiliates with positive balance?')) return;
            try {
              const res = await apiClient.post('/admin/affiliates/pay-all', {});
              toast.success(`Paid ${res.data.total_paid}, Failed: ${res.data.total_failed}`);
              fetchData();
            } catch (err: any) {
              toast.error(err.response?.data?.detail || 'Batch payout failed');
            }
          }}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <CreditCard style={{ width: '16px', height: '16px' }} /> Pay All Affiliates
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        {loading ? <LoadingSpinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  {['Name', 'Code', 'Status', 'Admin', 'Clicks', 'Signups', 'Revenue', 'Balance', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.65rem 0.75rem', color: '#71717a',
                      fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map(aff => (
                  <tr key={aff.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <p style={{ color: '#d1d5db', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                        {aff.name}
                        {aff.is_affiliate_admin && (
                          <Shield style={{ width: '12px', height: '12px', color: '#f59e0b', marginLeft: '0.3rem', display: 'inline', verticalAlign: 'text-bottom' }} />
                        )}
                      </p>
                      <p style={{ color: '#52525b', fontSize: '0.7rem', margin: 0 }}>{aff.email}</p>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#a1a1aa', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {aff.referral_code}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <StatusBadge status={aff.status} />
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <select
                        value={aff.affiliate_admin_id || ''}
                        onChange={e => assignAdmin(aff.id, e.target.value ? Number(e.target.value) : null)}
                        style={{
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px', padding: '0.3rem 0.5rem', color: '#d1d5db',
                          fontSize: '0.75rem', outline: 'none', maxWidth: '120px',
                        }}
                      >
                        <option value="">None</option>
                        {admins.filter(a => a.id !== aff.id).map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#d1d5db', fontSize: '0.85rem' }}>{aff.total_clicks}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#d1d5db', fontSize: '0.85rem' }}>{aff.total_signups}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#d1d5db', fontSize: '0.85rem' }}>KES {aff.total_revenue.toLocaleString()}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      KES {aff.commission_balance.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {aff.status === 'pending' && (
                          <ActionBtn label="Approve" color="#10b981" loading={actionLoading === aff.id} onClick={() => updateStatus(aff.id, 'approved')} />
                        )}
                        {aff.status === 'approved' && (
                          <ActionBtn label="Suspend" color="#ef4444" loading={actionLoading === aff.id} onClick={() => updateStatus(aff.id, 'suspended')} />
                        )}
                        {aff.status === 'suspended' && (
                          <ActionBtn label="Restore" color="#f59e0b" loading={actionLoading === aff.id} onClick={() => updateStatus(aff.id, 'approved')} />
                        )}
                        <ActionBtn
                          label={aff.is_affiliate_admin ? 'Demote' : 'Make Admin'}
                          color={aff.is_affiliate_admin ? '#ef4444' : '#3b82f6'}
                          loading={actionLoading === aff.id}
                          onClick={() => toggleAdmin(aff.id)}
                        />
                        {aff.commission_balance > 0 && (
                          <ActionBtn label="Pay" color="#10b981" loading={actionLoading === aff.id} onClick={() => payAffiliate(aff.id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '0.35rem', borderRadius: '8px', border: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.06)', color: page > 1 ? '#d1d5db' : '#3f3f46' }}>
              <ChevronLeft style={{ width: '16px', height: '16px' }} />
            </button>
            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Page {page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.35rem', borderRadius: '8px', border: 'none', cursor: page < totalPages ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.06)', color: page < totalPages ? '#d1d5db' : '#3f3f46' }}>
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Commission Configs Tab ───────────────────────────────────

function CommissionsTab() {
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/affiliate-commissions')
      .then(r => {
        const existing = r.data.configs || [];
        // Pre-fill with defaults if empty
        if (existing.length === 0) {
          setConfigs(getDefaultConfigs());
        } else {
          setConfigs(existing);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getDefaultConfigs = (): CommissionConfig[] => [
    { item_type: 'subscription', tier_id: 'basic', duration: '2wk', commission_percent: 10, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
    { item_type: 'subscription', tier_id: 'basic', duration: '4wk', commission_percent: 10, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
    { item_type: 'subscription', tier_id: 'standard', duration: '2wk', commission_percent: 12, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
    { item_type: 'subscription', tier_id: 'standard', duration: '4wk', commission_percent: 12, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
    { item_type: 'subscription', tier_id: 'premium', duration: '2wk', commission_percent: 15, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
    { item_type: 'subscription', tier_id: 'premium', duration: '4wk', commission_percent: 15, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
    { item_type: 'jackpot', tier_id: null, duration: null, commission_percent: 10, affiliate_admin_commission_percent: 20, earn_on_renewal: false },
  ];

  const updateConfig = (idx: number, field: string, value: any) => {
    setConfigs(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await apiClient.put('/admin/affiliate-commissions', configs);
      toast.success('Commission configs saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: 0 }}>
          Set the commission percentages for each package. Admin commission is a % of the affiliate's commission.
        </p>
        <button
          onClick={saveAll}
          disabled={saving}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
            fontWeight: 600, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          {saving ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: '16px', height: '16px' }} />}
          Save All
        </button>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Package', 'Duration', 'Affiliate %', 'Admin % (of affiliate)', 'Earn on Renewal'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0.75rem 1rem', color: '#71717a',
                    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem', fontWeight: 500 }}>
                    {c.item_type === 'jackpot' ? '🎯 Jackpot' : `📦 ${(c.tier_id || '').charAt(0).toUpperCase() + (c.tier_id || '').slice(1)}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
                    {c.duration || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <PercentInput value={c.commission_percent} onChange={v => updateConfig(i, 'commission_percent', v)} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <PercentInput value={c.affiliate_admin_commission_percent} onChange={v => updateConfig(i, 'affiliate_admin_commission_percent', v)} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      onClick={() => updateConfig(i, 'earn_on_renewal', !c.earn_on_renewal)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.earn_on_renewal ? '#10b981' : '#3f3f46' }}
                    >
                      {c.earn_on_renewal
                        ? <ToggleRight style={{ width: '28px', height: '28px' }} />
                        : <ToggleLeft style={{ width: '28px', height: '28px' }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── Payouts Tab ──────────────────────────────────────────────

function PayoutsTab() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/affiliate-payouts', { params: { page, per_page: perPage } });
      setPayouts(res.data.payouts || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', overflow: 'hidden',
    }}>
      {loading ? <LoadingSpinner /> : payouts.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#52525b' }}>
          <DollarSign style={{ width: '40px', height: '40px', color: '#3f3f46', margin: '0 auto 0.75rem' }} />
          <p>No payouts yet</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Affiliate', 'Amount', 'Phone', 'Status', 'TX ID', 'Date'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0.75rem 1rem', color: '#71717a',
                    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <p style={{ color: '#d1d5db', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>{p.affiliate_name}</p>
                    <p style={{ color: '#52525b', fontSize: '0.7rem', margin: 0 }}>{p.affiliate_email}</p>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>KES {p.amount.toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontSize: '0.85rem' }}>{p.phone || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '0.75rem 1rem', color: '#71717a', fontSize: '0.75rem', fontFamily: 'monospace' }}>{p.transaction_id || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#71717a', fontSize: '0.8rem' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '0.35rem', borderRadius: '8px', border: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.06)', color: page > 1 ? '#d1d5db' : '#3f3f46' }}>
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          </button>
          <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Page {page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.35rem', borderRadius: '8px', border: 'none', cursor: page < totalPages ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.06)', color: page < totalPages ? '#d1d5db' : '#3f3f46' }}>
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <Loader2 style={{ width: '24px', height: '24px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    approved: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    completed: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    pending: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    suspended: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    failed: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  };
  const c = colors[status] || { bg: 'rgba(255,255,255,0.06)', text: '#a1a1aa' };
  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem',
      fontWeight: 600, background: c.bg, color: c.text,
    }}>
      {status}
    </span>
  );
}

function ActionBtn({ label, color, loading, onClick }: {
  label: string; color: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '0.25rem 0.5rem', borderRadius: '6px', border: `1px solid ${color}40`,
        background: `${color}15`, color, fontSize: '0.7rem', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <input
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '64px', padding: '0.4rem 0.5rem', borderRadius: '8px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#d1d5db', fontSize: '0.85rem', textAlign: 'center', outline: 'none',
        }}
      />
      <span style={{ color: '#71717a', fontSize: '0.8rem' }}>%</span>
    </div>
  );
}

export default AffiliatesManagePage;
