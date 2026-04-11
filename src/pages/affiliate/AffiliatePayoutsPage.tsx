/**
 * AffiliatePayoutsPage — payout history for the affiliate.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { affiliateService } from '../../services/affiliateService';
import { DollarSign, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Payout {
  id: number;
  amount: number;
  method: string;
  phone: string | null;
  status: string;
  transaction_id: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
}

export function AffiliatePayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateService.getPayouts(page, limit);
      setPayouts(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);
  const statusIcon = (s: string) => {
    switch (s) {
      case 'completed': return <CheckCircle style={{ width: '14px', height: '14px', color: '#10b981' }} />;
      case 'failed': return <XCircle style={{ width: '14px', height: '14px', color: '#ef4444' }} />;
      default: return <Clock style={{ width: '14px', height: '14px', color: '#f59e0b' }} />;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>Payout History</h1>
        <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Track all your commission payouts
        </p>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 style={{ width: '24px', height: '24px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#52525b' }}>
            <DollarSign style={{ width: '40px', height: '40px', color: '#3f3f46', margin: '0 auto 0.75rem' }} />
            <p>No payouts yet. Keep marketing to earn your first payout! 💪</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Amount', 'Method', 'Phone', 'Status', 'Transaction ID', 'Period', 'Date'].map(h => (
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
                    <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                      KES {p.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                      {p.method.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontSize: '0.85rem' }}>{p.phone || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                        background: p.status === 'completed' ? 'rgba(16,185,129,0.15)' : p.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: p.status === 'completed' ? '#10b981' : p.status === 'failed' ? '#ef4444' : '#f59e0b',
                      }}>
                        {statusIcon(p.status)} {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#71717a', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {p.transaction_id || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontSize: '0.8rem' }}>
                      {p.period_start && p.period_end
                        ? `${new Date(p.period_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(p.period_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                        : '-'}
                    </td>
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
            padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '0.4rem', borderRadius: '8px', border: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.06)', color: page > 1 ? '#d1d5db' : '#3f3f46' }}>
              <ChevronLeft style={{ width: '18px', height: '18px' }} />
            </button>
            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.4rem', borderRadius: '8px', border: 'none', cursor: page < totalPages ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.06)', color: page < totalPages ? '#d1d5db' : '#3f3f46' }}>
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
