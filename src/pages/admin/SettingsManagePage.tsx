import React, { useState, useEffect } from 'react';
import { Save, Loader2, Settings, ShieldAlert, ToggleLeft, ToggleRight, Users, Gift, TrendingUp, Crown, UserPlus, MessageSquare, Smartphone, Eye, Mail, Info, Percent, Trophy, Trash2, Phone } from 'lucide-react';
import { adminService, type ReferralSettings, type ReferralStatsResponse, type SMSSettings, type EmailSettings, type SupportSettings } from '../../services/adminService';
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
    jackpot_midweek_price: 500,
    jackpot_mega_price: 1000,
    jackpot_midweek_int_price: 5,
    jackpot_mega_int_price: 10,
  });
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [smsSettings, setSmsSettings] = useState<SMSSettings>({
    SMS_SRC: 'ARVOCAP',
    SMS_ENABLED: true,
    SMS_TEMPLATE: '[TambuaTips] Your verification code is {code}. This code expires in 5 minutes. Do NOT share this code with anyone. Visit {url} to access your account.',
  });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    SMTP_EMAIL: '',
    SMTP_PASSWORD: '',
  });
  const [supportSettings, setSupportSettings] = useState<SupportSettings>({
    SUPPORT_EMAIL: '',
    SUPPORT_WHATSAPP: '',
    SUPPORT_WHATSAPP_NUMBER: '',
  });
  
  // Custom states for DC Pricing
  const [selectedDcLevel, setSelectedDcLevel] = useState('3');
  const [dcPrices, setDcPrices] = useState<Record<string, Record<string, { local: number, intl: number }>>>({});

  const [savingSms, setSavingSms] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingSupport, setSavingSupport] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [settingsData, statsData, smsData, emailData, supportData] = await Promise.all([
        adminService.getSettings(),
        adminService.getReferralStats(),
        adminService.getSmsSettings(),
        adminService.getEmailSettings(),
        adminService.getSupportSettings(),
      ]);
      setSettings(settingsData);
      
      try {
        const parsed = JSON.parse(settingsData.jackpot_prices_json || '{}');
        setDcPrices(parsed);
      } catch (err) {
        setDcPrices({});
      }
      
      setStats(statsData);
      setSmsSettings(smsData);
      setEmailSettings(emailData);
      setSupportSettings(supportData);
    } catch (e) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...settings, jackpot_prices_json: JSON.stringify(dcPrices) };
      const updated = await adminService.updateSettings(payload);
      setSettings(updated);
      toast.success('Settings saved successfully');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSms = async () => {
    try {
      setSavingSms(true);
      const updated = await adminService.updateSmsSettings(smsSettings);
      setSmsSettings(updated);
      toast.success('SMS settings saved successfully');
    } catch (e) {
      toast.error('Failed to save SMS settings');
    } finally {
      setSavingSms(false);
    }
  };

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      await adminService.updateEmailSettings(emailSettings);
      toast.success('Email settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update email settings');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSaveSupport = async () => {
    setSavingSupport(true);
    try {
      await adminService.updateSupportSettings(supportSettings);
      toast.success('Support contact settings updated!');
    } catch (error) {
      toast.error('Failed to update support settings');
    } finally {
      setSavingSupport(false);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Referrals', value: stats.total_referrals, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Users via Referral', value: stats.referred_users, icon: UserPlus, color: 'text-blue-400' },
            { label: 'Tips Unlocked', value: stats.total_tips_unlocked || 0, icon: Gift, color: 'text-purple-400' },
            { label: 'Discounts Claimed', value: stats.total_discounts_claimed || 0, icon: Percent, color: 'text-cyan-400' },
            { label: 'Top Referrers', value: stats.top_referrers.length, icon: Crown, color: 'text-yellow-400' },
            { label: 'System', value: settings.referral_enabled ? 'Active' : 'Disabled', icon: Settings, color: settings.referral_enabled ? 'text-emerald-400' : 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold truncate">{stat.label}</span>
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
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Setting'}
            </button>
            <button
              onClick={() => setSettings({ ...settings, referral_enabled: !settings.referral_enabled })}
              className={`transition-all ${settings.referral_enabled ? 'text-emerald-500' : 'text-zinc-600'}`}
            >
              {settings.referral_enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
            </button>
          </div>
        </div>

        {settings.referral_enabled && (
          <div className="space-y-6">
            {/* ─── The Points Economy ─── */}
            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-5">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Crown className="w-3.5 h-3.5" />
                The Points Economy
              </h3>
              <p className="text-[11px] text-zinc-500 mb-4">
                Configure how many "Invite Points" users must spend to redeem rewards. 1 Friend Invited = 1 Point.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Unlock a Single Tip</label>
                  <div className="relative">
                    <input
                      type="number" min="1" max="100"
                      value={settings.points_per_tip || 0}
                      onChange={e => setSettings({ ...settings, points_per_tip: parseInt(e.target.value) || 1 })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold pl-10 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <Gift className="w-4 h-4 text-emerald-500/50 absolute left-3 top-3" />
                  </div>
                  <p className="text-[9px] text-zinc-500">Points cost to unlock one locked tip</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Unlock 7 Days Premium</label>
                  <div className="relative">
                    <input
                      type="number" min="1" max="100"
                      value={settings.points_per_premium || 0}
                      onChange={e => setSettings({ ...settings, points_per_premium: parseInt(e.target.value) || 1 })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold pl-10 focus:outline-none focus:border-gold-500 transition-colors"
                    />
                    <Crown className="w-4 h-4 text-gold-500/50 absolute left-3 top-3" />
                  </div>
                  <p className="text-[9px] text-zinc-500">Points cost to buy premium access</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Payment Discount</label>
                  <div className="relative">
                    <input
                      type="number" min="0" max="100"
                      value={settings.points_per_discount || 0}
                      onChange={e => setSettings({ ...settings, points_per_discount: parseInt(e.target.value) || 1 })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold pl-10 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <Percent className="w-4 h-4 text-blue-500/50 absolute left-3 top-3" />
                  </div>
                  <p className="text-[9px] text-zinc-500">Points cost to generate M-Pesa discount</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Discount Amount (%)</label>
                  <input
                    type="number" min="1" max="100"
                    value={settings.discount_percentage || 0}
                    onChange={e => setSettings({ ...settings, discount_percentage: parseInt(e.target.value) || 50 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[9px] text-zinc-500">How much gets slashed off the standard price.</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Premium Days Granted</label>
                  <input
                    type="number" min="1" max="365"
                    value={settings.premium_days_reward || 0}
                    onChange={e => setSettings({ ...settings, premium_days_reward: parseInt(e.target.value) || 7 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-gold-500 transition-colors"
                  />
                  <p className="text-[9px] text-zinc-500">How long the redeemed premium access lasts.</p>
                </div>
              </div>

              <div className="mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 flex gap-3 text-[11px]">
                <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-zinc-400">
                  Users collect <span className="text-white font-bold">1 Point</span> for every friend they invite. They can spend these points via the Rewards Hub.
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

      {/* ═══ SMS / OTP Configuration ═══ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              SMS / OTP Configuration
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Configure the SMS provider for phone number verification</p>
          </div>
          <button
            onClick={handleSaveSms}
            disabled={savingSms}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {savingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingSms ? 'Saving...' : 'Save SMS'}
          </button>
        </div>

        {/* SMS Enabled Toggle */}
        <div className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${smsSettings.SMS_ENABLED ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
            <div>
              <p className="text-sm font-bold text-white">SMS OTP System</p>
              <p className="text-[11px] text-zinc-500">When disabled, OTP codes will still be generated but not sent via SMS</p>
            </div>
          </div>
          <button
            onClick={() => setSmsSettings({ ...smsSettings, SMS_ENABLED: !smsSettings.SMS_ENABLED })}
            className={`transition-all ${smsSettings.SMS_ENABLED ? 'text-cyan-500' : 'text-zinc-600'}`}
          >
            {smsSettings.SMS_ENABLED ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
          </button>
        </div>

        {/* SMS Provider Settings */}
        <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" />
            Provider Settings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-300">Sender ID (SMS_SRC)</label>
              <input
                type="text"
                value={smsSettings.SMS_SRC}
                onChange={e => setSmsSettings({ ...smsSettings, SMS_SRC: e.target.value.toUpperCase() })}
                placeholder="ARVOCAP"
                maxLength={11}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors font-mono tracking-wider"
              />
              <p className="text-[10px] text-zinc-600">The name recipients see as the sender. Max 11 characters.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-300">SMS Provider</label>
              <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-500 font-mono">
                trackomgroup.com
              </div>
              <p className="text-[10px] text-zinc-600">SMS gateway. Contact admin to change provider.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300">Message Template</label>
              <textarea
                value={smsSettings.SMS_TEMPLATE}
                onChange={e => setSmsSettings({ ...smsSettings, SMS_TEMPLATE: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                rows={3}
              />
              <p className="text-[10px] text-zinc-600">Use {'{code}'} for the OTP code and {'{url}'} for the site URL.</p>
            </div>
          </div>

          {/* SMS Preview */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Live Message Preview</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-700/50 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{smsSettings.SMS_SRC || 'SENDER'}</span>
                <span className="text-[10px] text-zinc-600">• just now</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed font-mono">
                {smsSettings.SMS_TEMPLATE?.replace('{code}', '847291')
                  .replace('{url}', 'tambuatips.co.ke')
                  .split('847291').map((part, i, arr) => 
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="text-cyan-400 font-bold">847291</span>}
                    </React.Fragment>
                  )}
              </p>
            </div>
          </div>

          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-3 flex gap-3 text-[11px]">
            <ShieldAlert className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
            <p className="text-zinc-400">
              SMS messages are sent via <span className="text-white font-bold">Trackomgroup</span> using sender ID <span className="text-white font-bold font-mono">{smsSettings.SMS_SRC || '—'}</span>. Each OTP is valid for <span className="text-white font-bold">5 minutes</span> and auto-expires.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Global Jackpot Defaults ═══ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Jackpot Configuration
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Configure global jackpot behavior and DC-based pricing</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Prices'}
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-emerald-500" />
                History Auto-Cleanup
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Number of days to keep jackpots visible in history</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.jackpot_history_retention_days || 30}
                onChange={e => setSettings({ ...settings, jackpot_history_retention_days: parseInt(e.target.value) || 30 })}
                className="w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 text-center"
              />
              <span className="text-xs font-bold text-zinc-500 uppercase">Days</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t border-zinc-800/50">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-500" />
                Bundle Discount
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Percentage discount offered when purchasing all available jackpots together</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={settings.jackpot_bundle_discount || 20}
                onChange={e => setSettings({ ...settings, jackpot_bundle_discount: parseInt(e.target.value) || 20 })}
                className="w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 text-center"
              />
              <span className="text-xs font-bold text-zinc-500 uppercase">%</span>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800/50 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                Filter by DC Level
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Assign custom prices for specific Double Chance limits. If left blank, defaults above are used.</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex gap-4 mb-4 pb-4 border-b border-zinc-800">
                <select 
                  value={selectedDcLevel} 
                  onChange={e => setSelectedDcLevel(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {['0', '3', '4', '5', '6', '7', '10', '99'].map(dc => (
                    <option key={dc} value={dc}>{dc === '99' ? 'ALL ' : dc + ' '}DC</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Local Price (KES)</label>
                  <input
                    type="number"
                    value={dcPrices['midweek']?.[selectedDcLevel]?.local ?? ''}
                    placeholder="Use Default"
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      const currentMidweek = dcPrices['midweek']?.[selectedDcLevel] || { local: 0, intl: 0 };
                      const currentMega = dcPrices['mega']?.[selectedDcLevel] || { local: 0, intl: 0 };
                      const newLocal = isNaN(val) ? 0 : val;
                      const newObj = { 
                        ...dcPrices, 
                        'midweek': { ...dcPrices['midweek'], [selectedDcLevel]: { ...currentMidweek, local: newLocal } },
                        'mega': { ...dcPrices['mega'], [selectedDcLevel]: { ...currentMega, local: newLocal } }
                      };
                      setDcPrices(newObj);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Intl Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dcPrices['midweek']?.[selectedDcLevel]?.intl ?? ''}
                    placeholder="Use Default"
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      const currentMidweek = dcPrices['midweek']?.[selectedDcLevel] || { local: 0, intl: 0 };
                      const currentMega = dcPrices['mega']?.[selectedDcLevel] || { local: 0, intl: 0 };
                      const newIntl = isNaN(val) ? 0 : val;
                      const newObj = { 
                        ...dcPrices, 
                        'midweek': { ...dcPrices['midweek'], [selectedDcLevel]: { ...currentMidweek, intl: newIntl } },
                        'mega': { ...dcPrices['mega'], [selectedDcLevel]: { ...currentMega, intl: newIntl } }
                      };
                      setDcPrices(newObj);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Settings Section */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase">App Email Configuration</h2>
              <p className="text-xs text-zinc-400">Connect a Gmail account to dispatch platform emails.</p>
            </div>
          </div>
          <button
            onClick={handleSaveEmail}
            disabled={savingEmail}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingEmail ? 'Saving...' : 'Save Config'}
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Email Address</label>
            <input
              type="text"
              placeholder="tambuatips@gmail.com"
              value={emailSettings.SMTP_EMAIL}
              onChange={e => setEmailSettings({ ...emailSettings, SMTP_EMAIL: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[10px] text-zinc-600">The Gmail address used for authenticating.</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">App Password</label>
            <input
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={emailSettings.SMTP_PASSWORD}
              onChange={e => setEmailSettings({ ...emailSettings, SMTP_PASSWORD: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            />
            <p className="text-[10px] text-zinc-600">Generated 16-character App Password (Not your actual Gmail password).</p>
          </div>
          
          <div className="col-span-1 sm:col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-blue-400 mb-1">How to obtain an App Password:</h4>
              <ol className="text-xs text-zinc-400 space-y-1 ml-4 list-decimal">
                <li>Go to your Google Account (Manage your Google Account).</li>
                <li>Go to <strong>Security</strong> and ensure <strong>2-Step Verification</strong> is ON.</li>
                <li>Search for "App passwords" in the search bar.</li>
                <li>Create a new app (e.g. "TambuaTips Platform") and copy the 16 digit code here.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Support Contact Configuration ═══ */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase">Support Contact Info</h2>
              <p className="text-xs text-zinc-400">Configure details shown on the help widget and contact page.</p>
            </div>
          </div>
          <button
            onClick={handleSaveSupport}
            disabled={savingSupport}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingSupport ? 'Saving...' : 'Save Contacts'}
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Support Email</label>
            <input
              type="email"
              value={supportSettings.SUPPORT_EMAIL}
              onChange={e => setSupportSettings({ ...supportSettings, SUPPORT_EMAIL: e.target.value })}
              placeholder="help@tambuatips.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">WhatsApp Number</label>
            <input
              type="text"
              value={supportSettings.SUPPORT_WHATSAPP_NUMBER}
              onChange={e => setSupportSettings({ ...supportSettings, SUPPORT_WHATSAPP_NUMBER: e.target.value })}
              placeholder="+254 700 000000"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">WhatsApp Chat Link</label>
            <input
              type="url"
              value={supportSettings.SUPPORT_WHATSAPP}
              onChange={e => setSupportSettings({ ...supportSettings, SUPPORT_WHATSAPP: e.target.value })}
              placeholder="https://wa.me/254700000000"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
