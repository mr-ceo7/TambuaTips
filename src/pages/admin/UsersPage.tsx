import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronUp, Users as UsersIcon, Shield, Ban,
  Crown, Clock, Globe, MoreVertical, Eye, ArrowUpDown, UserX, UserCheck,
  Download
} from 'lucide-react';
import { adminService, type AdminUser, type UserActivityDetail } from '../../services/adminService';
import { toast } from 'sonner';

type SortField = 'name' | 'email' | 'subscription_tier' | 'last_seen' | 'total_time_spent' | 'created_at';
type SortDir = 'asc' | 'desc';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserActivityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterTier, setFilterTier] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    adminService.getUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  const handleExpandUser = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDetail(null);
      return;
    }
    setExpandedUserId(userId);
    setDetailLoading(true);
    try {
      const detail = await adminService.getUserActivity(userId);
      setUserDetail(detail);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleRevoke = async (userId: number) => {
    if (!confirm('Revoke subscription and revert to FREE?')) return;
    try {
      await adminService.revokeSubscription(userId);
      toast.success('Subscription revoked');
      loadUsers();
    } catch {
      toast.error('Failed to revoke subscription');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (!confirm(user.is_active ? 'Ban this user?' : 'Unban this user?')) return;
    try {
      await adminService.toggleUserActive(user.id);
      toast.success(user.is_active ? 'User banned' : 'User unbanned');
      loadUsers();
    } catch {
      toast.error('Cannot ban yourself');
    }
  };

  const handleMakeAdmin = async (userId: number) => {
    if (!confirm('Grant admin privileges?')) return;
    try {
      await adminService.makeAdmin(userId);
      toast.success('User is now an admin');
      loadUsers();
    } catch {
      toast.error('Failed to make admin');
    }
  };

  // Filtered + sorted users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.country || '').toLowerCase().includes(q)
      );
    }

    // Tier filter
    if (filterTier !== 'all') {
      if (filterTier === 'online') {
        result = result.filter(u => u.is_online);
      } else {
        result = result.filter(u => u.subscription_tier === filterTier);
      }
    }

    // Sort
    result.sort((a, b) => {
      let av: any = (a as any)[sortField];
      let bv: any = (b as any)[sortField];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, sortField, sortDir, filterTier]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length, online: 0 };
    users.forEach(u => {
      counts[u.subscription_tier] = (counts[u.subscription_tier] || 0) + 1;
      if (u.is_online) counts.online++;
    });
    return counts;
  }, [users]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-zinc-900/60 rounded-xl" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900/60 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">User Management</h1>
        <p className="text-sm text-zinc-500 mt-1">{users.length} total users registered</p>
      </div>

      {/* ─── Filters Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or country..."
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'online', label: '🟢 Online' },
            { key: 'free', label: 'Free' },
            { key: 'basic', label: 'Basic' },
            { key: 'standard', label: 'Standard' },
            { key: 'premium', label: 'Premium' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterTier(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                filterTier === f.key
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label} {tierCounts[f.key] !== undefined ? `(${tierCounts[f.key]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Users Table ─────────────────────────────────── */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800/60">
                {[
                  { field: 'name' as const, label: 'User' },
                  { field: 'subscription_tier' as const, label: 'Tier' },
                  { field: 'last_seen' as const, label: 'Status' },
                  { field: 'total_time_spent' as const, label: 'Activity' },
                  { field: 'created_at' as const, label: 'Joined' },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className={`w-3 h-3 ${sortField === col.field ? 'text-emerald-400' : ''}`} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <React.Fragment key={u.id}>
                  <tr
                    className={`border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer ${
                      expandedUserId === u.id ? 'bg-zinc-800/20' : ''
                    }`}
                    onClick={() => handleExpandUser(u.id)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                          !u.is_active ? 'bg-red-500/10 text-red-400' : u.is_admin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white truncate">{u.name}</span>
                            {u.is_admin && <Shield className="w-3 h-3 text-emerald-400" title="Admin" />}
                            {!u.is_active && <Ban className="w-3 h-3 text-red-400" title="Banned" />}
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <TierBadge tier={u.subscription_tier} expiresAt={u.subscription_expires_at} />
                    </td>
                    <td className="px-4 py-3.5">
                      {u.is_online ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <div>
                          <span className="text-[11px] text-zinc-500">Offline</span>
                          {u.last_seen && (
                            <p className="text-[10px] text-zinc-600">{new Date(u.last_seen).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[11px] text-zinc-400">
                        <p>{u.most_visited_page || '—'}</p>
                        <p className="text-zinc-600">{Math.floor(u.total_time_spent / 60)}m total</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {u.country && (
                          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{u.country}</span>
                        )}
                        <span className="text-[11px] text-zinc-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleExpandUser(u.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {u.subscription_tier !== 'free' && (
                          <button
                            onClick={() => handleRevoke(u.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                            title="Revoke subscription"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition-all ${
                            u.is_active
                              ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                              : 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={u.is_active ? 'Ban user' : 'Unban user'}
                        >
                          {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        {!u.is_admin && (
                          <button
                            onClick={() => handleMakeAdmin(u.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            title="Make admin"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail panel */}
                  {expandedUserId === u.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-0">
                        <div className="bg-zinc-800/30 rounded-xl p-4 my-2 border border-zinc-800/40">
                          {detailLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : userDetail ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* User info */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Summary</h4>
                                <div className="space-y-2 text-xs">
                                  <p className="text-zinc-300">Total Time: <span className="font-bold text-white">{Math.floor(userDetail.total_time_spent / 60)}m {userDetail.total_time_spent % 60}s</span></p>
                                  <p className="text-zinc-300">Total Spent: <span className="font-bold text-emerald-400">KES {userDetail.total_spent.toLocaleString()}</span></p>
                                  <p className="text-zinc-300">Jackpot Purchases: <span className="font-bold text-gold-400">{userDetail.jackpot_purchases}</span></p>
                                  <p className="text-zinc-300">Country: <span className="font-bold text-white">{userDetail.user.country || 'Unknown'}</span></p>
                                </div>
                              </div>

                              {/* Page activity */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Page Activity</h4>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {userDetail.pages.map(p => (
                                    <div key={p.path} className="flex items-center justify-between text-[11px]">
                                      <span className="text-zinc-400 truncate mr-2">{p.path}</span>
                                      <span className="text-zinc-500 shrink-0">{p.visits}x • {Math.floor(p.total_time / 60)}m</span>
                                    </div>
                                  ))}
                                  {userDetail.pages.length === 0 && <p className="text-xs text-zinc-600">No activity recorded</p>}
                                </div>
                              </div>

                              {/* Payment history */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payment History</h4>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {userDetail.payments.map(p => (
                                    <div key={p.id} className="flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                          p.status === 'completed' ? 'bg-emerald-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`} />
                                        <span className="text-zinc-300">KES {p.amount.toLocaleString()}</span>
                                      </div>
                                      <span className="text-zinc-500 capitalize">{p.method}</span>
                                    </div>
                                  ))}
                                  {userDetail.payments.length === 0 && <p className="text-xs text-zinc-600">No payments</p>}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-sm">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier, expiresAt }: { tier: string; expiresAt: string | null }) {
  const colors: Record<string, string> = {
    free: 'bg-zinc-800 text-zinc-500',
    basic: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    standard: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    premium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  };
  return (
    <div>
      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${colors[tier] || colors.free}`}>
        {tier}
      </span>
      {expiresAt && tier !== 'free' && (
        <p className="text-[9px] text-zinc-600 mt-0.5">Until {new Date(expiresAt).toLocaleDateString()}</p>
      )}
    </div>
  );
}
