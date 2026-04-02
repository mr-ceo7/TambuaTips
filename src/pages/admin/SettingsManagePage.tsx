import React, { useState, useEffect } from 'react';
import { Save, Loader2, Settings, ShieldAlert } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';

export function SettingsManagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    referral_vip_days: 7
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSettings();
      setSettings(res);
    } catch (e) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminService.updateSettings(settings);
      toast.success('Settings updated successfully');
    } catch (e) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-500" />
            Platform Settings
          </h1>
          <p className="text-zinc-400 text-sm">Configure core platform metrics and economics.</p>
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
          Referral Economics
        </h2>

        <div className="grid gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-zinc-300">
              VIP Days Granted per Referral
            </label>
            <div className="flex gap-4">
              <input
                type="number"
                min="0"
                max="365"
                value={settings.referral_vip_days}
                onChange={(e) => setSettings({ ...settings, referral_vip_days: parseInt(e.target.value) || 0 })}
                className="w-32 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex gap-3 text-sm">
                <ShieldAlert className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-zinc-300">
                  This controls how many days of Premium access a referring user receives when someone registers using their link. Changes apply to all future signups instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
