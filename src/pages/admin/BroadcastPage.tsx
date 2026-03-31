import React, { useState } from 'react';
import { Bell, Send, Smartphone, Globe } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';

export function BroadcastPage() {
  const [form, setForm] = useState({
    title: '', body: '', url: '/',
    targetTier: 'all', targetCountry: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ targeted_users: number; total_subscriptions: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) {
      toast.error('Title and message body are required');
      return;
    }
    setIsSending(true);
    try {
      const result = await adminService.broadcastPush({
        title: form.title,
        body: form.body,
        url: form.url,
        target_tier: form.targetTier,
        target_country: form.targetCountry || undefined,
      });
      toast.success(`Broadcast queued! Targeted ${result.targeted_users} users`);
      setLastResult(result);
      setForm({ title: '', body: '', url: '/', targetTier: 'all', targetCountry: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Broadcast failed');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 overflow-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Push Broadcast</h1>
        <p className="text-sm text-zinc-500 mt-1">Send notifications to targeted users</p>
      </div>

      {/* ─── Notification Preview ────────────────────────── */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Notification Preview</span>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">
                {form.title || 'Notification Title'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                {form.body || 'Your notification message will appear here...'}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">tambuatips.com • now</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Broadcast Form ──────────────────────────────── */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">
              Notification Title <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 🔥 Hot Tip Alert!"
              className="admin-input"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">
              Message Body <span className="text-emerald-400">*</span>
            </label>
            <textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="e.g. Manchester United vs Liverpool - Our premium pick is live! Check it out now."
              className="admin-input min-h-[120px] resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">
              Target URL on Click
            </label>
            <input
              type="text"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="/"
              className="admin-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">
                Target Audience
              </label>
              <select
                value={form.targetTier}
                onChange={e => setForm({ ...form, targetTier: e.target.value })}
                className="admin-input"
              >
                <option value="all">Everyone</option>
                <option value="premium">Premium Only</option>
                <option value="free">Free Only</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">
                Target Region
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={form.targetCountry}
                  onChange={e => setForm({ ...form, targetCountry: e.target.value.toUpperCase() })}
                  placeholder="e.g. KE, UG, NG"
                  className="admin-input pl-10 uppercase"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/60">
            <button
              type="submit"
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm font-display disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  Sending Broadcast...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Launch Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Last Result ─────────────────────────────────── */}
      {lastResult && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm">
          <p className="text-emerald-400 font-bold mb-1">✅ Last Broadcast Result</p>
          <p className="text-zinc-400">
            Targeted <span className="font-bold text-white">{lastResult.targeted_users}</span> users
            ({lastResult.total_subscriptions} push subscriptions)
          </p>
        </div>
      )}
    </div>
  );
}
