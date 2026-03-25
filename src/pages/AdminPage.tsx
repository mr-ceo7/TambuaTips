import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit, Check, X, Bot, Loader2, Star, TrendingUp } from 'lucide-react';
import { getAllTips, addTip, updateTip, deleteTip, getTipStats, type Tip } from '../services/tipsService';
import { toast } from 'sonner';

const ADMIN_PASSWORD = 'tambuatips2026';

export function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [tips, setTips] = useState<Tip[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    fixtureId: '',
    homeTeam: '',
    awayTeam: '',
    league: '',
    matchDate: new Date().toISOString().split('T')[0],
    prediction: '',
    odds: '',
    bookmaker: 'Betika',
    confidence: 3,
    reasoning: '',
    isPremium: false,
  });

  useEffect(() => {
    if (isAuth) {
      setTips(getAllTips());
    }
  }, [isAuth]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuth(true);
      toast.success('Admin access granted');
    } else {
      toast.error('Wrong password');
    }
  };

  const resetForm = () => {
    setForm({
      fixtureId: '',
      homeTeam: '',
      awayTeam: '',
      league: '',
      matchDate: new Date().toISOString().split('T')[0],
      prediction: '',
      odds: '',
      bookmaker: 'Betika',
      confidence: 3,
      reasoning: '',
      isPremium: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.homeTeam || !form.prediction) {
      toast.error('Fill in required fields');
      return;
    }

    if (editingId) {
      updateTip(editingId, {
        fixtureId: parseInt(form.fixtureId) || 0,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        league: form.league,
        matchDate: form.matchDate,
        prediction: form.prediction,
        odds: form.odds,
        bookmaker: form.bookmaker,
        confidence: form.confidence,
        reasoning: form.reasoning,
        isPremium: form.isPremium,
      });
      toast.success('Tip updated');
    } else {
      addTip({
        fixtureId: parseInt(form.fixtureId) || 0,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        league: form.league,
        matchDate: form.matchDate,
        prediction: form.prediction,
        odds: form.odds,
        bookmaker: form.bookmaker,
        confidence: form.confidence,
        reasoning: form.reasoning,
        isPremium: form.isPremium,
        result: 'pending',
      });
      toast.success('Tip added');
    }

    setTips(getAllTips());
    resetForm();
  };

  const handleEdit = (tip: Tip) => {
    setForm({
      fixtureId: String(tip.fixtureId),
      homeTeam: tip.homeTeam,
      awayTeam: tip.awayTeam,
      league: tip.league,
      matchDate: tip.matchDate.split('T')[0],
      prediction: tip.prediction,
      odds: tip.odds,
      bookmaker: tip.bookmaker,
      confidence: tip.confidence,
      reasoning: tip.reasoning,
      isPremium: tip.isPremium,
    });
    setEditingId(tip.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this tip?')) {
      deleteTip(id);
      setTips(getAllTips());
      toast.success('Tip deleted');
    }
  };

  const handleResult = (id: string, result: 'won' | 'lost' | 'void') => {
    updateTip(id, { result });
    setTips(getAllTips());
    toast.success(`Marked as ${result}`);
  };

  // Not authenticated
  if (!isAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/20 rounded-full mx-auto mb-6">
            <Shield className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-display font-bold text-center mb-6">Admin Access</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-4"
          />
          <button type="submit" className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">
            Login
          </button>
        </form>
      </div>
    );
  }

  const stats = getTipStats();

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase">Admin Panel</h1>
          <p className="text-sm text-zinc-400">Manage tips and track performance</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Add Tip
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Total</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{stats.won}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Won</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-red-400">{stats.lost}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Lost</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-zinc-400">{stats.pending}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Pending</p>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{stats.winRate}%</p>
          <p className="text-[10px] text-zinc-500 uppercase">Win Rate</p>
        </div>
      </div>

      {/* AI Placeholder */}
      <div className="bg-zinc-900/30 border border-dashed border-zinc-700 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-purple-500/10 rounded-full flex-shrink-0">
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-zinc-400">AI Prediction Assistant</h4>
          <p className="text-xs text-zinc-600">Auto-generate predictions using Gemini AI</p>
        </div>
        <button
          onClick={() => toast.info('🤖 AI Assistant coming soon!')}
          className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed"
          disabled
        >
          Coming Soon
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-zinc-200 mb-4">{editingId ? 'Edit Tip' : 'Add New Tip'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Fixture ID</label>
              <input type="number" value={form.fixtureId} onChange={e => setForm({ ...form, fixtureId: e.target.value })} placeholder="API fixture ID (optional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">League *</label>
              <input value={form.league} onChange={e => setForm({ ...form, league: e.target.value })} placeholder="e.g. Premier League" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Home Team *</label>
              <input value={form.homeTeam} onChange={e => setForm({ ...form, homeTeam: e.target.value })} placeholder="e.g. Arsenal" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Away Team *</label>
              <input value={form.awayTeam} onChange={e => setForm({ ...form, awayTeam: e.target.value })} placeholder="e.g. Chelsea" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Match Date *</label>
              <input type="date" value={form.matchDate} onChange={e => setForm({ ...form, matchDate: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Prediction *</label>
              <input value={form.prediction} onChange={e => setForm({ ...form, prediction: e.target.value })} placeholder="e.g. Home Win, Over 2.5" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Odds</label>
              <input value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} placeholder="e.g. 1.85" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Bookmaker</label>
              <select value={form.bookmaker} onChange={e => setForm({ ...form, bookmaker: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option>Betika</option>
                <option>SportPesa</option>
                <option>Betway</option>
                <option>1xBet</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Confidence (1-5)</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, confidence: n })}
                    className={`p-1.5 rounded ${n <= form.confidence ? 'text-gold-400' : 'text-zinc-700'}`}>
                    <Star className={`w-5 h-5 ${n <= form.confidence ? 'fill-gold-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPremium} onChange={e => setForm({ ...form, isPremium: e.target.checked })} className="w-4 h-4 rounded border-zinc-700" />
                <span className="text-sm text-zinc-300 font-medium">Premium Tip</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Reasoning</label>
              <textarea value={form.reasoning} onChange={e => setForm({ ...form, reasoning: e.target.value })} placeholder="Analysis / reasoning for this prediction..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-24 resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="flex-1 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">
                {editingId ? 'Update Tip' : 'Publish Tip'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tips List */}
      <div className="space-y-3">
        {tips.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <p className="text-zinc-400">No tips yet. Click "Add Tip" to create your first prediction.</p>
          </div>
        ) : (
          tips.map(tip => (
            <div key={tip.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-500">{tip.league}</span>
                  {tip.isPremium && <span className="px-1.5 py-0.5 bg-gold-500/20 text-gold-400 text-[10px] font-bold rounded">PRO</span>}
                </div>
                <p className="text-sm font-medium text-zinc-200 truncate">{tip.homeTeam} vs {tip.awayTeam}</p>
                <p className="text-xs text-emerald-400 font-bold">{tip.prediction} @ {tip.odds}</p>
              </div>

              {/* Result buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  tip.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                  tip.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                  tip.result === 'void' ? 'bg-zinc-800 text-zinc-500' :
                  'bg-zinc-800 text-zinc-400'
                }`}>{tip.result}</span>
                
                {tip.result === 'pending' && (
                  <>
                    <button onClick={() => handleResult(tip.id, 'won')} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-all" title="Mark Won">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleResult(tip.id, 'lost')} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all" title="Mark Lost">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button onClick={() => handleEdit(tip)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 hover:text-white transition-all" title="Edit">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(tip.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-all" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
