import React, { useState, useEffect } from 'react';
import {
  Users, Wifi, Crown, DollarSign, Target, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, UserPlus, CreditCard,
  Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { adminService, type DashboardStats, type ActivityFeedItem } from '../../services/adminService';
import { toast } from 'sonner';

const EMERALD = '#10b981';
const GOLD = '#eab308';
const BLUE = '#3b82f6';
const PURPLE = '#8b5cf6';
const PINK = '#ec4899';
const CYAN = '#06b6d4';
const RED = '#ef4444';

const METHOD_COLORS: Record<string, string> = {
  mpesa: EMERALD,
  paypal: BLUE,
  paystack: PURPLE,
  skrill: CYAN,
  card: PINK,
};

function formatKES(amount: number): string {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(1)}K`;
  return `KES ${amount.toLocaleString()}`;
}

function timeAgo(timestamp: string | null): string {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState<'today' | 'this_week' | 'this_month' | 'this_year'>('this_month');

  useEffect(() => {
    const fetchStats = () => {
      adminService.getDashboardStats()
        .then(setStats)
        .catch(() => toast.error('Failed to load dashboard'))
        .finally(() => setLoading(false));
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, 15000); // Poll every 15s

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl" />
          <div className="h-80 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!stats) return <p className="text-zinc-500 text-center py-12">No data</p>;

  const revenuePeriodAmount = stats.revenue[revenuePeriod] ?? 0;
  const PERIOD_LABELS: Record<string, string> = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    this_year: 'This Year',
  };

  // Prepare pie chart data
  const pieData = Object.entries(stats.revenue.by_method).map(([method, amount]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: amount,
    color: METHOD_COLORS[method] || '#71717a',
  }));

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Page title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform overview & real-time analytics</p>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Users */}
        <KPICard
          icon={Users}
          label="Total Visitors"
          value={(stats.users.total_registered + stats.users.total_guests).toLocaleString()}
          change={stats.users.growth.length > 1 ? `+${stats.users.growth[stats.users.growth.length - 1]?.count ?? 0} signups today` : null}
          breakdowns={[
            { label: 'Registered', value: stats.users.total_registered.toLocaleString(), color: EMERALD },
            { label: 'Guests', value: stats.users.total_guests.toLocaleString(), color: BLUE }
          ]}
          positive
          color="emerald"
        />
        {/* Online Now */}
        <KPICard
          icon={Wifi}
          label="Online Now"
          value={(stats.users.online_registered + stats.users.online_guests).toString()}
          breakdowns={[
            { label: 'Users', value: stats.users.online_registered.toString(), color: EMERALD },
            { label: 'Guests', value: stats.users.online_guests.toString(), color: BLUE }
          ]}
          badge="LIVE"
          color="emerald"
          pulse
        />
        {/* Subscribers */}
        <KPICard
          icon={Crown}
          label="Subscribers"
          value={stats.users.active_subscribers.toString()}
          change={`${stats.users.conversion_rate}% conv.`}
          positive={stats.users.conversion_rate > 0}
          color="gold"
        />
        {/* Revenue */}
        <KPICard
          icon={DollarSign}
          label="Total Revenue"
          value={formatKES(stats.revenue.total)}
          change={`${formatKES(stats.revenue.today)} today`}
          positive
          color="emerald"
        />
        {/* Win Rate */}
        <KPICard
          icon={Target}
          label="Win Rate"
          value={`${stats.tips.win_rate}%`}
          change={`${stats.tips.won}W / ${stats.tips.lost}L`}
          positive={stats.tips.win_rate > 50}
          color={stats.tips.win_rate > 50 ? 'emerald' : 'red'}
        />
        {/* Tips */}
        <KPICard
          icon={TrendingUp}
          label="Total Tips"
          value={stats.tips.total.toString()}
          change={`${stats.tips.pending} pending`}
          color="blue"
        />
      </div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Revenue Trend</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Last 30 days</p>
            </div>
            <div className="flex gap-1 bg-zinc-800/60 rounded-xl p-1 flex-wrap">
              {(['today', 'this_week', 'this_month', 'this_year'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setRevenuePeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    revenuePeriod === period
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-white font-display">{formatKES(revenuePeriodAmount)}</span>
            <span className="text-xs text-zinc-500">{PERIOD_LABELS[revenuePeriod]}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.revenue.trend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EMERALD} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: unknown) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="amount" stroke={EMERALD} fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Method */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-1">Revenue by Method</h3>
          <p className="text-xs text-zinc-500 mb-4">Payment gateway breakdown</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: unknown) => [`KES ${Number(value).toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map(entry => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="font-bold text-zinc-200">{formatKES(Number(entry.value))}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
              No payment data yet
            </div>
          )}
        </div>
      </div>

      {/* ═══ User Growth + Subscribers by Tier ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-1">User Growth</h3>
          <p className="text-xs text-zinc-500 mb-4">New signups per day (last 30 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.users.growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscribers by Tier */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-1">Subscribers by Tier</h3>
          <p className="text-xs text-zinc-500 mb-4">Current distribution</p>
          <div className="space-y-3 mt-6">
            {Object.entries(stats.users.subscribers_by_tier).map(([tier, count]) => {
              const pct = stats.users.total_registered > 0 ? Math.round(Number(count) / stats.users.total_registered * 100) : 0;
              const tierColor = tier === 'free' ? '#71717a' : tier === 'basic' ? BLUE : tier === 'standard' ? PURPLE : GOLD;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase" style={{ color: tierColor }}>{tier}</span>
                    <span className="text-xs text-zinc-400">{Number(count)} users ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: tierColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Top Pages + Activity Feed ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-1">Top Pages</h3>
          <p className="text-xs text-zinc-500 mb-4">Where users spend the most time</p>
          <div className="space-y-2.5">
            {stats.pages.map((page, i) => {
              const maxTime = stats.pages[0]?.total_time || 1;
              const pct = Math.round(page.total_time / maxTime * 100);
              return (
                <div key={page.path} className="group">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">{i + 1}</span>
                      <span className="text-xs text-zinc-300 font-medium">{page.path}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span>{page.visits} visits</span>
                      <span>{Math.floor(page.total_time / 60)}m {page.total_time % 60}s</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.pages.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-6">No activity data yet</p>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-300">Live Activity Feed</h3>
          </div>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {stats.activity_feed.map((item: ActivityFeedItem, i: number) => (
              <div key={i}><ActivityItem item={item} /></div>
            ))}
            {stats.activity_feed.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-6">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Tip Performance + Jackpot Stats ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">Tip Performance Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatBlock label="Total" value={stats.tips.total} color="#a1a1aa" />
            <StatBlock label="Won" value={stats.tips.won} color={EMERALD} />
            <StatBlock label="Lost" value={stats.tips.lost} color={RED} />
            <StatBlock label="Pending" value={stats.tips.pending} color={GOLD} />
            <StatBlock label="Voided" value={stats.tips.voided} color="#71717a" />
          </div>
          {/* Win rate progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">Win Rate</span>
              <span className="text-sm font-bold" style={{ color: stats.tips.win_rate >= 50 ? EMERALD : RED }}>{stats.tips.win_rate}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${stats.tips.win_rate}%`,
                  background: stats.tips.win_rate >= 50
                    ? `linear-gradient(90deg, ${EMERALD}, ${CYAN})`
                    : `linear-gradient(90deg, ${RED}, ${PINK})`
                }}
              />
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">Jackpot Stats</h3>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-gold-400 font-display">{stats.jackpots.total}</p>
              <p className="text-xs text-zinc-500 mt-1">Total Jackpots Published</p>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-3xl font-bold text-emerald-400 font-display">{stats.jackpots.total_purchases}</p>
              <p className="text-xs text-zinc-500 mt-1">Total Purchases</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string | null;
  badge?: string;
  positive?: boolean;
  color: string;
  pulse?: boolean;
  breakdowns?: { label: string; value: string; color?: string }[];
}

function KPICard({ icon: Icon, label, value, change, badge, positive, color, pulse, breakdowns }: KPICardProps) {
  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-500', border: 'border-emerald-500/10' },
    gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: 'text-yellow-500', border: 'border-yellow-500/10' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-500', border: 'border-blue-500/10' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'text-red-500', border: 'border-red-500/10' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'text-purple-500', border: 'border-purple-500/10' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className={`bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-zinc-700/60 transition-all flex flex-col justify-between`}>
      <div className="flex justify-between items-start gap-4">
        {/* Left column: Icon & Label */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${c.icon}`} />
            </div>
            {badge && (
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${c.bg} ${c.text} ${pulse ? 'animate-pulse' : ''}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 uppercase font-bold tracking-wider mt-1">{label}</p>
        </div>

        {/* Right column: Value & Change */}
        <div className="text-right shrink-0">
          <p className="text-2xl sm:text-3xl font-bold text-white font-display leading-none pb-1">{value}</p>
          {change && (
            <p className={`text-[11px] font-medium flex items-center justify-end gap-1 ${positive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {positive && <ArrowUpRight className="w-3.5 h-3.5" />}
              {change}
            </p>
          )}
        </div>
      </div>
      
      {/* Breakdowns Row */}
      {breakdowns && breakdowns.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-widest">
          {breakdowns.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/40 px-2 py-1 rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.2)]" style={{ color: b.color || '#a1a1aa' }}>
              {b.label}: <span className="text-white relative top-[0.5px]">{b.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Decorative glow */}
      <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full ${c.bg} opacity-0 group-hover:opacity-60 transition-opacity blur-3xl pointer-events-none`} />
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xl sm:text-2xl font-bold font-display" style={{ color }}>{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">{label}</p>
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityFeedItem }) {
  if (item.type === 'signup') {
    return (
      <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-800/40 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <UserPlus className="w-4 h-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-300">
            <span className="font-bold text-white">{item.user_name}</span> signed up
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{item.user_email}</p>
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(item.timestamp)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-800/40 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        item.status === 'completed' ? 'bg-emerald-500/10' : item.status === 'failed' ? 'bg-red-500/10' : 'bg-yellow-500/10'
      }`}>
        <CreditCard className={`w-4 h-4 ${
          item.status === 'completed' ? 'text-emerald-400' : item.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
        }`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-300">
          <span className="font-bold text-white">{item.user_name}</span>{' '}
          {item.status === 'completed' ? 'paid' : item.status === 'failed' ? 'failed payment' : 'initiated'}{' '}
          <span className="font-bold text-emerald-400">KES {item.amount?.toLocaleString()}</span>
          {' '}via <span className="capitalize">{item.method}</span>
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5">{item.item_type} • {item.user_email}</p>
      </div>
      <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(item.timestamp)}</span>
    </div>
  );
}
