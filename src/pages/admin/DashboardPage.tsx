import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
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
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchStats = () => {
      adminService.getDashboardStats(days)
        .then(setStats)
        .catch(() => toast.error('Failed to load dashboard'))
        .finally(() => setLoading(false));
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, 15000); // Poll every 15s

    return () => clearInterval(intervalId);
  }, [days]);

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

  // Format chart ticks intelligently based on timeframe (daily vs monthly)
  const formatChartTick = (val: string) => {
    if (!val) return '';
    if (val.length === 7) {
      // Yearly (YYYY-MM) -> "Mar"
      const parts = val.split('-');
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    // Daily (YYYY-MM-DD) -> "03-31"
    return val.slice(5);
  };

  // Calculate selected timeframe revenue from the trend array
  const trendRevenue = stats.revenue.trend.reduce((sum, item) => sum + item.amount, 0);

  // Prepare pie chart data
  const pieData = Object.entries(stats.revenue.by_method).map(([method, amount]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: amount,
    color: METHOD_COLORS[method] || '#71717a',
  }));

  // Variants for staggered entry
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 overflow-hidden pb-10">
      {/* Page title */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Platform overview & real-time analytics</p>
        </div>
        
        <button
          onClick={async () => {
            if (window.confirm("DANGER: Are you absolutely sure you want to completely wipe all revenue history, visitor logs, and reset all active user subscriptions to zero? This CANNOT be undone.")) {
              const toastId = toast.loading('Clearing all dashboard stats...');
              try {
                await adminService.clearDashboardStats();
                toast.success('Stats completely wiped!', { id: toastId });
                setLoading(true);
                adminService.getDashboardStats().then(setStats).finally(() => setLoading(false));
              } catch (err: any) {
                toast.error(err.response?.data?.detail || 'Failed to clear stats');
                toast.dismiss(toastId);
              }
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-sm font-bold transition-all w-fit"
        >
          <Activity className="w-4 h-4" />
          Reset Stats
        </button>
      </motion.div>

      {/* ═══ KPI Cards ═══ */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Users */}
        <KPICard
          icon={Users}
          label="Total Visitors"
          value={formatCompact(stats.users.today_registered + stats.users.today_guests)}
          change={null}
          breakdowns={[
            { label: 'Registered', value: formatCompact(stats.users.today_registered), color: EMERALD },
            { label: 'Guests', value: formatCompact(stats.users.today_guests), color: BLUE }
          ]}
          positive
          color="emerald"
          extraContent={
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-sm font-black text-emerald-400">+{stats.users.today_registered}</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">users today</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-sm font-black text-blue-400">+{stats.users.today_guests}</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">guests today</span>
              </div>
            </div>
          }
        />
        {/* Online Now */}
        <KPICard
          icon={Wifi}
          label="Online Now"
          value={formatCompact(stats.users.online_registered + stats.users.online_guests)}
          breakdowns={[
            { label: 'Users', value: formatCompact(stats.users.online_registered), color: EMERALD },
            { label: 'Guests', value: formatCompact(stats.users.online_guests), color: BLUE }
          ]}
          badge="LIVE"
          color="emerald"
          pulse
        />
        {/* Subscribers */}
        <KPICard
          icon={Crown}
          label="Subscribers"
          value={formatCompact(stats.users.active_subscribers)}
          change={`${stats.users.conversion_rate}% conv.`}
          breakdowns={Object.entries(stats.users.subscribers_by_tier)
            .filter(([t]) => t !== 'free')
            .map(([tier, count]) => ({
              label: tier.charAt(0).toUpperCase() + tier.slice(1),
              value: formatCompact(count),
              color: tier.includes('basic') ? BLUE : tier.includes('standard') ? PURPLE : GOLD
            }))}
          positive={stats.users.conversion_rate > 0}
          color="gold"
        />
        {/* Revenue */}
        <KPICard
          icon={DollarSign}
          label="Total Revenue"
          value={formatKES(stats.revenue.total)}
          change={`${formatKES(stats.revenue.today)} today`}
          breakdowns={Object.entries(stats.revenue.by_method)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 3)
            .map(([method, amount]) => ({
              label: method.charAt(0).toUpperCase() + method.slice(1),
              value: formatKES(amount as number),
              color: METHOD_COLORS[method] || '#71717a'
            }))}
          positive
          color="emerald"
        />
        {/* Win Rate */}
        <KPICard
          icon={Target}
          label="Win Rate"
          value={`${stats.tips.win_rate}%`}
          change={`${formatCompact(stats.tips.won)}W / ${formatCompact(stats.tips.lost)}L`}
          breakdowns={[
            { label: 'Won', value: formatCompact(stats.tips.won), color: EMERALD },
            { label: 'Lost', value: formatCompact(stats.tips.lost), color: RED },
            { label: 'Void', value: formatCompact(stats.tips.voided), color: '#a1a1aa' }
          ]}
          positive={stats.tips.win_rate > 50}
          color={stats.tips.win_rate > 50 ? 'emerald' : 'red'}
        />
        {/* Tips */}
        <KPICard
          icon={TrendingUp}
          label="Total Tips"
          value={formatCompact(stats.tips.total)}
          change={`${formatCompact(stats.tips.pending)} pending`}
          breakdowns={[
            { label: 'Settled', value: formatCompact(stats.tips.won + stats.tips.lost + stats.tips.voided), color: BLUE },
            { label: 'Pending', value: formatCompact(stats.tips.pending), color: GOLD }
          ]}
          color="blue"
        />
      </motion.div>

      {/* ═══ Charts Row ═══ */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Revenue Trend</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Last {days === 365 ? '12 months' : `${days} days`}</p>
            </div>
            {/* Dynamic time frame toggles */}
            <div className="flex bg-zinc-950/50 rounded-lg p-1 border border-zinc-800">
              {[7, 30, 90, 365].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    days === d
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {d === 365 ? '1Y' : `${d}D`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-white font-display">{formatKES(trendRevenue)}</span>
            <span className="text-xs text-zinc-500">Collected in {days === 365 ? '1 year' : `${days} days`}</span>
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
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={formatChartTick} />
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
      </motion.div>

      {/* ═══ User Growth + Subscribers by Tier ═══ */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-300 mb-1">User Growth</h3>
          <p className="text-xs text-zinc-500 mb-4">New signups {days === 365 ? 'per month' : 'per day'}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.users.growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={formatChartTick} />
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
      </motion.div>

      {/* ═══ Top Pages + Activity Feed ═══ */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
      </motion.div>

      {/* ═══ Tip Performance + Jackpot Stats ═══ */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
      </motion.div>
    </motion.div>
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
  extraContent?: React.ReactNode;
}

function KPICard({ icon: Icon, label, value, change, badge, positive, color, pulse, breakdowns, extraContent }: KPICardProps) {
  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-500', border: 'border-emerald-500/10' },
    gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: 'text-yellow-500', border: 'border-yellow-500/10' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-500', border: 'border-blue-500/10' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'text-red-500', border: 'border-red-500/10' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'text-purple-500', border: 'border-purple-500/10' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-xl p-3 sm:p-4 relative overflow-hidden group hover:border-zinc-700/60 hover:shadow-xl hover:shadow-black/40 transition-colors flex flex-col justify-between`}
    >
      <div className="flex flex-col gap-2">
        {/* Top Row: Icon & Change */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${c.icon}`} />
            </div>
            {badge && (
              <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-full ${c.bg} ${c.text} ${pulse ? 'animate-pulse' : ''}`}>
                {badge}
              </span>
            )}
          </div>
          
          {change && (
            <p className={`text-[10px] sm:text-xs font-bold flex items-center text-right gap-0.5 ${positive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {positive && <ArrowUpRight className="w-3 h-3" />}
              {change}
            </p>
          )}
        </div>

        {/* Center: Label & Value */}
        <div className="flex flex-col items-center justify-center flex-1 py-2 w-full min-w-0">
          <p className="text-[10px] sm:text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1.5">{label}</p>
          <p className={`font-bold text-white font-display leading-none tracking-tight text-center break-all ${
            value.length > 12 ? 'text-lg sm:text-xl' :
            value.length > 8 ? 'text-xl sm:text-2xl' :
            value.length > 5 ? 'text-2xl sm:text-3xl' :
            'text-3xl sm:text-4xl'
          }`}>{value}</p>
        </div>
      </div>
      
      {/* Breakdowns Row */}
      {breakdowns && breakdowns.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/50 flex flex-wrap gap-1 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest leading-tight">
          {breakdowns.map((b, i) => (
            <div key={i} className="flex flex-col min-w-[42%] flex-1 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-1 rounded-md" style={{ color: b.color || '#a1a1aa' }}>
              <span className="opacity-80 text-[8px] sm:text-[9px]">{b.label}</span>
              <span className="text-white font-black text-xs sm:text-sm">{b.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Extra Content */}
      {extraContent}

      {/* Decorative glow */}
      <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full ${c.bg} opacity-0 group-hover:opacity-80 transition-opacity duration-500 blur-3xl pointer-events-none`} />
    </motion.div>
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
