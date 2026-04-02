import React, { useState, useEffect } from 'react';
import { Save, Loader2, Settings, ShieldAlert, ToggleLeft, ToggleRight, Users, Gift, TrendingUp, Crown, UserPlus } from 'lucide-react';
import { adminService, type ReferralSettings, type ReferralStatsResponse } from '../../services/adminService';
import { toast } from 'sonner';

const TIER_OPTIONS = [
  { value: 'basic', label: 'Basic', color: 'text-blue-400' },
  { value: 'standard', label: 'Standard', color: 'text-purple-400' },
  { value: 'premium', label: 'Premium', color: 'text-yellow-400' },
];

export function SettingsManagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReferralSettings>({
    referral_enabled: true,
    referral_reward_tier: 'basic',
    referral_reward_days: 7,
    referral_new_user_reward: false,
    referral_new_user_reward_tier: 'basic',
    referral_new_user_reward_days: 7,
    referral_free_tips_count: 1,
  });
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [settingsData, statsData] = await Promise.all([
        adminService.getSettings(),
        adminService.getReferralStats(),
      ]);
      setSettings(settingsData);
      setStats(statsData);
    } catch (e) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await adminService.updateSettings(settings);
      setSettings(updated);
      toast.success('Settings saved successfully');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-500" />
            Platform Settings
          </h1>
          <p className="text-zinc-400 text-sm">Configure referral economics and growth incentives.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* ═══ Referral Analytics Summary ═══ */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Referrals', value: stats.total_referrals, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Users via Referral', value: stats.referred_users, icon: UserPlus, color: 'text-blue-400' },
            { label: 'Top Referrers', value: stats.top_referrers.length, icon: Crown, color: 'text-yellow-400' },
            { label: 'System', value: settings.referral_enabled ? 'Active' : 'Disabled', icon: Gift, color: settings.referral_enabled ? 'text-emerald-400' : 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Referral System Toggle ═══ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-500" />
              Referral System
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Master toggle for the entire referral program</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, referral_enabled: !settings.referral_enabled })}
            className={`transition-all ${settings.referral_enabled ? 'text-emerald-500' : 'text-zinc-600'}`}
          >
            {settings.referral_enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
          </button>
        </div>

        {settings.referral_enabled && (
          <div className="space-y-6">
            {/* ─── Referrer Rewards ─── */}
            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-5">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Crown className="w-3.5 h-3.5" />
                Referrer Rewards
              </h3>
              <p className="text-[11px] text-zinc-500 mb-4">
                What the referring user earns when someone signs up using their link.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tier */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Subscription Tier</label>
                  <select
                    value={settings.referral_reward_tier}
                    onChange={e => setSettings({ ...settings, referral_reward_tier: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                  >
                    {TIER_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Days */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Days Granted</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.referral_reward_days}
                    onChange={e => setSettings({ ...settings, referral_reward_days: parseInt(e.target.value) || 1 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Free Tips */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Free Tips Unlocked</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={settings.referral_free_tips_count}
                    onChange={e => setSettings({ ...settings, referral_free_tips_count: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 flex gap-3 text-[11px]">
                <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-zinc-400">
                  Each successful referral grants the referrer <span className="text-white font-bold">{settings.referral_reward_days} days</span> of <span className="text-white font-bold capitalize">{settings.referral_reward_tier}</span> access and unlocks <span className="text-white font-bold">{settings.referral_free_tips_count}</span> premium tip{settings.referral_free_tips_count !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>

            {/* ─── New User Rewards ─── */}
            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5" />
                    New User Rewards
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Optionally reward the new user who signed up via a referral link.</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, referral_new_user_reward: !settings.referral_new_user_reward })}
                  className={`transition-all ${settings.referral_new_user_reward ? 'text-blue-400' : 'text-zinc-600'}`}
                >
                  {settings.referral_new_user_reward ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {settings.referral_new_user_reward && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-300">Subscription Tier</label>
                    <select
                      value={settings.referral_new_user_reward_tier}
                      onChange={e => setSettings({ ...settings, referral_new_user_reward_tier: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                    >
                      {TIER_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-300">Days Granted</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.referral_new_user_reward_days}
                      onChange={e => setSettings({ ...settings, referral_new_user_reward_days: parseInt(e.target.value) || 1 })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {settings.referral_new_user_reward && (
                <div className="mt-4 bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 flex gap-3 text-[11px]">
                  <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-400">
                    New users who register via a referral link will receive <span className="text-white font-bold">{settings.referral_new_user_reward_days} days</span> of <span className="text-white font-bold capitalize">{settings.referral_new_user_reward_tier}</span> access on sign-up.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Top Referrers Leaderboard ═══ */}
      {stats && stats.top_referrers.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-yellow-400" />
            Top Referrers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">#</th>
                  <th className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">User</th>
                  <th className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Code</th>
                  <th className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold text-right">Referrals</th>
                  <th className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold text-right">Days Earned</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_referrers.map((r, i) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-700' : 'text-zinc-500'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <p className="text-[10px] text-zinc-500">{r.email}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{r.referral_code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm font-bold text-emerald-400">{r.referrals_count}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm font-bold text-zinc-300">{r.referrals_count * settings.referral_reward_days}d</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
