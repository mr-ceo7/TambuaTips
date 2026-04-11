/**
 * AffiliateConversionsPage — full conversion history with pagination and type filter.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { affiliateService } from '../../services/affiliateService';
import { ChevronLeft, ChevronRight, Loader2, TrendingUp, Filter } from 'lucide-react';

interface Conversion {
  id: number;
  conversion_type: string;
  amount: number;
  commission_amount: number;
  affiliate_admin_commission: number;
  created_at: string | null;
  user_name: string | null;
}

export function AffiliateConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateService.getConversions(page, limit, filter);
      setConversions(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>Conversions</h1>
          <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '0.25rem' }}>Track your signups and purchases</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter style={{ width: '16px', height: '16px', color: '#71717a' }} />
          {['all', 'signup', 'purchase'].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f === 'all' ? undefined : f); setPage(1); }}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem',
                fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                background: (f === 'all' && !filter) || filter === f ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                color: (f === 'all' && !filter) || filter === f ? '#10b981' : '#a1a1aa',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{f === 'all' ? ` (${total})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 style={{ width: '24px', height: '24px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : conversions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#52525b' }}>
            <TrendingUp style={{ width: '40px', height: '40px', color: '#3f3f46', margin: '0 auto 0.75rem' }} />
            <p>No conversions found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Type', 'User', 'Sale Amount', 'Your Commission', 'Date'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.75rem 1rem', color: '#71717a',
                      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
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
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>{c.user_name || 'Unknown'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                      {c.amount > 0 ? `KES ${c.amount.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      {c.commission_amount > 0 ? `KES ${c.commission_amount.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#71717a', fontSize: '0.8rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
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
            padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '0.4rem', borderRadius: '8px', border: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed',
                background: 'rgba(255,255,255,0.06)', color: page > 1 ? '#d1d5db' : '#3f3f46',
              }}
            >
              <ChevronLeft style={{ width: '18px', height: '18px' }} />
            </button>
            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '0.4rem', borderRadius: '8px', border: 'none', cursor: page < totalPages ? 'pointer' : 'not-allowed',
                background: 'rgba(255,255,255,0.06)', color: page < totalPages ? '#d1d5db' : '#3f3f46',
              }}
            >
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
