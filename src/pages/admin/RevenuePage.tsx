import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Download, Search, Filter,
  CreditCard, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { adminService, type DashboardStats, type Transaction, type TransactionFilters } from '../../services/adminService';
import { toast } from 'sonner';

const METHOD_COLORS: Record<string, string> = {
  mpesa: '#10b981', paypal: '#3b82f6', paystack: '#8b5cf6', skrill: '#06b6d4', card: '#ec4899',
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

export function RevenuePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTxns, setTotalTxns] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    per_page: 20,
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    adminService.getDashboardStats()
      .then(setStats)
      .catch(() => toast.error('Failed to load revenue stats'))
      .finally(() => setLoading(false));
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const res = await adminService.getTransactions(filters);
      setTransactions(res.transactions);
      setTotalTxns(res.total);
      setTotalPages(res.total_pages);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTxnLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const updateFilter = (key: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  const handleExportCSV = () => {
    const url = adminService.exportTransactionsCSV(filters);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900/60 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-zinc-900/60 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Revenue & Transactions</h1>
          <p className="text-sm text-zinc-500 mt-1">Financial analytics & payment history</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700 transition-all text-sm border border-zinc-700"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* ─── Revenue KPI Cards ───────────────────────────── */}
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <RevenueCard
              label="Total Revenue"
              amount={stats.revenue.total}
              icon={DollarSign}
              color="emerald"
              subtitle="All time"
            />
            <RevenueCard
              label="Today"
              amount={stats.revenue.today}
              icon={Calendar}
              color="blue"
            />
            <RevenueCard
              label="This Week"
              amount={stats.revenue.this_week}
              icon={TrendingUp}
              color="purple"
            />
            <RevenueCard
              label="This Month"
              amount={stats.revenue.this_month}
              icon={CreditCard}
              color="cyan"
            />
            <RevenueCard
              label="This Year"
              amount={stats.revenue.this_year}
              icon={DollarSign}
              color="gold"
            />
          </div>

          {/* Revenue by Method */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-zinc-300 mb-1">Revenue Trend</h3>
              <p className="text-xs text-zinc-500 mb-4">Last 30 days</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.revenue.trend}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={d => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: unknown) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#revGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-zinc-300 mb-1">By Payment Method</h3>
              <p className="text-xs text-zinc-500 mb-4">Revenue breakdown</p>
              <div className="space-y-4">
                {Object.entries(stats.revenue.by_method).map(([method, amount]) => {
                  const numAmount = Number(amount);
                  const pct = stats.revenue.total > 0 ? Math.round(numAmount / stats.revenue.total * 100) : 0;
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METHOD_COLORS[method] || '#71717a' }} />
                          <span className="text-xs font-bold text-zinc-300 capitalize">{method}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white">{formatKES(numAmount)}</span>
                          <span className="text-[10px] text-zinc-500 ml-1.5">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: METHOD_COLORS[method] || '#71717a' }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats.revenue.by_method).length === 0 && (
                  <p className="text-zinc-600 text-sm text-center py-6">No payment data</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ TRANSACTION STATEMENTS ═══ */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800/60">
          <h3 className="text-lg font-bold text-white font-display mb-4">Transaction Statements</h3>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by email, reference, or transaction ID..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <select
              value={filters.status || ''}
              onChange={e => updateFilter('status', e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={filters.method || ''}
              onChange={e => updateFilter('method', e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Methods</option>
              <option value="mpesa">M-Pesa</option>
              <option value="paypal">PayPal</option>
              <option value="paystack">Paystack</option>
              <option value="skrill">Skrill</option>
            </select>
            <select
              value={filters.item_type || ''}
              onChange={e => updateFilter('item_type', e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="jackpot">Jackpot</option>
            </select>
          </div>

          {/* Date range */}
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">From</span>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={e => updateFilter('date_from', e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">To</span>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={e => updateFilter('date_to', e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button
              onClick={() => {
                setFilters({ page: 1, per_page: 20 });
                setSearchInput('');
              }}
              className="px-3 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {txnLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-3.5 text-[11px] text-zinc-400 whitespace-nowrap">
                      {txn.created_at ? new Date(txn.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-white font-medium">{txn.user_name}</p>
                      <p className="text-[10px] text-zinc-600">{txn.user_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-white">{formatKES(txn.amount)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold capitalize" style={{ color: METHOD_COLORS[txn.method] || '#a1a1aa' }}>
                        {txn.method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] text-zinc-400 capitalize">{txn.item_type}</span>
                      {txn.item_id && <span className="text-[10px] text-zinc-600 ml-1">({txn.item_id})</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${STATUS_STYLES[txn.status] || STATUS_STYLES.pending}`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] text-zinc-500 font-mono">{txn.reference || '—'}</span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500 text-sm">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-zinc-800/60">
            <span className="text-xs text-zinc-500">{totalTxns} total transactions</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                disabled={(filters.page || 1) <= 1}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-400">Page {filters.page || 1} of {totalPages}</span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, (prev.page || 1) + 1) }))}
                disabled={(filters.page || 1) >= totalPages}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RevenueCard({
  label, amount, icon: Icon, color, subtitle
}: {
  label: string; amount: number; icon: React.ElementType; color: string; subtitle?: string;
}) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-500' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'text-purple-500' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: 'text-cyan-500' },
    gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: 'text-yellow-500' },
  };
  const c = colors[color] || colors.emerald;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 hover:border-zinc-700/60 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        </div>
      </div>
      <p className="text-lg font-bold text-white font-display">{formatKES(amount)}</p>
      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">{label}</p>
      {subtitle && <p className="text-[9px] text-zinc-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}
