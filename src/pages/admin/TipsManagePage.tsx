import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, Edit, Check, X, Star, Filter,
  Zap, ChevronDown, Loader
} from 'lucide-react';
import {
  getAllTips, addTip, updateTip, deleteTip, getTipStats,
  type Tip, type TipCategory
} from '../../services/tipsService';
import { CATEGORY_LABELS } from '../../services/pricingService';
import { adminService, type FixtureSearchResult } from '../../services/adminService';
import { toast } from 'sonner';

const TIP_CATEGORIES: TipCategory[] = ['free', '2+', '4+', 'gg', '10+', 'vip'];

export function TipsManagePage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, winRate: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [selectedTips, setSelectedTips] = useState<Set<string>>(new Set());

  // Quick-add fixture search
  const [fixtureQuery, setFixtureQuery] = useState('');
  const [fixtureResults, setFixtureResults] = useState<FixtureSearchResult[]>([]);
  const [fixtureSearching, setFixtureSearching] = useState(false);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [fixtureSearchError, setFixtureSearchError] = useState<string | null>(null);

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
    oddsBetika: '',
    oddsSportPesa: '',
    oddsBetway: '',
    confidence: 3,
    reasoning: '',
    category: 'free' as TipCategory,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tipsData, statsData] = await Promise.all([getAllTips(), getTipStats()]);
    setTips(tipsData);
    setStats(statsData);
  };

  const resetForm = () => {
    setForm({
      fixtureId: '', homeTeam: '', awayTeam: '', league: '',
      matchDate: new Date().toISOString().split('T')[0],
      prediction: '', odds: '', bookmaker: 'Betika',
      oddsBetika: '', oddsSportPesa: '', oddsBetway: '',
      confidence: 3, reasoning: '', category: 'free',
    });
    setEditingId(null);
    setShowForm(false);
    setFixtureResults([]);
    setFixtureQuery('');
    setFixtureSearchError(null);
  };

  // ─── Fixture Search ───────────────────────────────────
  const searchFixtures = useCallback(async () => {
    if (!fixtureQuery.trim()) return;
    setFixtureSearching(true);
    setFixtureSearchError(null);
    try {
      const results = await adminService.searchFixtures(fixtureQuery, searchDate);
      setFixtureResults(results);
      if (results.length === 0) {
        setFixtureSearchError('No fixtures found. Try a different team name or date.');
      }
    } catch {
      setFixtureSearchError('API unavailable. Use manual entry below.');
    } finally {
      setFixtureSearching(false);
    }
  }, [fixtureQuery, searchDate]);

  const selectFixture = (fixture: FixtureSearchResult) => {
    setForm(prev => ({
      ...prev,
      fixtureId: String(fixture.id),
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      league: fixture.league,
      matchDate: fixture.matchDate?.split('T')[0] || prev.matchDate,
    }));
    setFixtureResults([]);
    setFixtureQuery('');
    toast.success('Fixture loaded! Now add your prediction.');
  };

  // ─── Form Submit ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.homeTeam || !form.prediction) {
      toast.error('Home team and prediction are required');
      return;
    }

    const bookmakerOdds = [
      { bookmaker: 'Betika', odds: form.oddsBetika || form.odds },
      { bookmaker: 'SportPesa', odds: form.oddsSportPesa || form.odds },
      { bookmaker: 'Betway', odds: form.oddsBetway || form.odds },
    ].filter(bo => bo.odds);

    const tipData = {
      fixtureId: parseInt(form.fixtureId) || 0,
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
      league: form.league,
      matchDate: form.matchDate,
      prediction: form.prediction,
      odds: form.odds,
      bookmaker: form.bookmaker,
      bookmakerOdds,
      confidence: form.confidence,
      reasoning: form.reasoning,
      category: form.category,
      isPremium: form.category !== 'free',
    };

    if (editingId) {
      await updateTip(editingId, tipData);
      toast.success('Tip updated');
    } else {
      await addTip({ ...tipData, result: 'pending' });
      toast.success('Tip published');
    }
    await loadData();
    resetForm();
  };

  const handleEditTip = (tip: Tip) => {
    const bOdds = tip.bookmakerOdds || [];
    setForm({
      fixtureId: String(tip.fixtureId),
      homeTeam: tip.homeTeam,
      awayTeam: tip.awayTeam,
      league: tip.league,
      matchDate: tip.matchDate.split('T')[0],
      prediction: tip.prediction,
      odds: tip.odds,
      bookmaker: tip.bookmaker,
      oddsBetika: bOdds.find(b => b.bookmaker === 'Betika')?.odds || '',
      oddsSportPesa: bOdds.find(b => b.bookmaker === 'SportPesa')?.odds || '',
      oddsBetway: bOdds.find(b => b.bookmaker === 'Betway')?.odds || '',
      confidence: tip.confidence,
      reasoning: tip.reasoning,
      category: tip.category,
    });
    setEditingId(tip.id);
    setShowForm(true);
  };

  const handleDeleteTip = async (id: string) => {
    if (!confirm('Delete this tip?')) return;
    await deleteTip(id);
    await loadData();
    toast.success('Tip deleted');
  };

  const handleResult = async (id: string, result: 'won' | 'lost' | 'void') => {
    await updateTip(id, { result });
    await loadData();
    toast.success(`Marked as ${result}`);
  };

  // Bulk result marking
  const handleBulkResult = async (result: 'won' | 'lost' | 'void') => {
    if (selectedTips.size === 0) return;
    if (!confirm(`Mark ${selectedTips.size} tips as ${result}?`)) return;
    await Promise.all(Array.from(selectedTips).map((id: string) => updateTip(id, { result })));
    setSelectedTips(new Set());
    await loadData();
    toast.success(`${selectedTips.size} tips marked as ${result}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedTips(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered tips
  const filteredTips = tips.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterResult !== 'all' && t.result !== filterResult) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Tips Management</h1>
          <p className="text-sm text-zinc-500 mt-1">{stats.total} total • {stats.winRate}% win rate</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Add Tip
        </button>
      </div>

      {/* ─── Stats Row ───────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Won', value: stats.won, color: 'text-emerald-400' },
          { label: 'Lost', value: stats.lost, color: 'text-red-400' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Tip Form ────────────────────────────────────── */}
      {showForm && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 font-display">
            {editingId ? '✏️ Edit Tip' : '⚡ Quick Add Tip'}
          </h3>

          {/* Fixture Search */}
          {!editingId && (
            <div className="mb-5 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-zinc-300">Quick Fill — Search Fixture</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    value={fixtureQuery}
                    onChange={e => setFixtureQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchFixtures()}
                    placeholder="Type team name and press Enter..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={searchFixtures}
                  disabled={fixtureSearching || !fixtureQuery.trim()}
                  className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-all text-sm disabled:opacity-50"
                >
                  {fixtureSearching ? <Loader className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* Results */}
              {fixtureResults.length > 0 && (
                <div className="mt-3 border border-zinc-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {fixtureResults.map(f => (
                    <button
                      key={f.id}
                      onClick={() => selectFixture(f)}
                      className="w-full text-left px-4 py-3 border-b border-zinc-800/50 last:border-b-0 hover:bg-emerald-500/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{f.homeTeam} vs {f.awayTeam}</p>
                          <p className="text-[11px] text-zinc-500">{f.league}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            f.status === 'live' ? 'bg-red-500/10 text-red-400' :
                            f.status === 'upcoming' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-zinc-800 text-zinc-500'
                          }`}>{f.status}</span>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{f.matchDate?.split('T')[0]}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {fixtureSearchError && (
                <p className="text-xs text-yellow-400 mt-2">⚠️ {fixtureSearchError}</p>
              )}
            </div>
          )}

          {/* Manual Form */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Category" required>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as TipCategory })} className="admin-input">
                {TIP_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.label || cat}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Home Team" required>
              <input value={form.homeTeam} onChange={e => setForm({ ...form, homeTeam: e.target.value })} placeholder="e.g. Arsenal" className="admin-input" required />
            </FormField>
            <FormField label="Away Team" required>
              <input value={form.awayTeam} onChange={e => setForm({ ...form, awayTeam: e.target.value })} placeholder="e.g. Chelsea" className="admin-input" required />
            </FormField>
            <FormField label="League">
              <input value={form.league} onChange={e => setForm({ ...form, league: e.target.value })} placeholder="e.g. Premier League" className="admin-input" />
            </FormField>
            <FormField label="Match Date">
              <input type="date" value={form.matchDate} onChange={e => setForm({ ...form, matchDate: e.target.value })} className="admin-input" />
            </FormField>
            <FormField label="Prediction" required>
              <input value={form.prediction} onChange={e => setForm({ ...form, prediction: e.target.value })} placeholder="e.g. Home Win, Over 2.5" className="admin-input" required />
            </FormField>
            <FormField label="Odds">
              <input value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} placeholder="e.g. 1.85" className="admin-input" />
            </FormField>
            <FormField label="Confidence">
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, confidence: n })} className={`p-1.5 rounded ${n <= form.confidence ? 'text-yellow-400' : 'text-zinc-700'}`}>
                    <Star className={`w-5 h-5 ${n <= form.confidence ? 'fill-yellow-400' : ''}`} />
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Fixture ID">
              <input type="number" value={form.fixtureId} onChange={e => setForm({ ...form, fixtureId: e.target.value })} placeholder="Auto-filled from search" className="admin-input" />
            </FormField>
            <div className="sm:col-span-2 lg:col-span-3">
              <FormField label="Reasoning">
                <textarea value={form.reasoning} onChange={e => setForm({ ...form, reasoning: e.target.value })} placeholder="Analysis / reasoning..." className="admin-input h-20 resize-none" />
              </FormField>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" className="flex-1 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">
                {editingId ? 'Update Tip' : 'Publish Tip'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Filter Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 overflow-x-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
              filterCategory === 'all' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >All</button>
          {TIP_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                filterCategory === cat ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >{CATEGORY_LABELS[cat]?.label || cat}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1">
          {['all', 'pending', 'won', 'lost', 'void'].map(r => (
            <button
              key={r}
              onClick={() => setFilterResult(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                filterResult === r ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >{r === 'all' ? 'All Results' : r.charAt(0).toUpperCase() + r.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* ─── Bulk Actions ────────────────────────────────── */}
      {selectedTips.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-emerald-500/20 rounded-xl">
          <span className="text-xs text-zinc-400">{selectedTips.size} selected:</span>
          <button onClick={() => handleBulkResult('won')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/20 transition-all">
            Mark Won
          </button>
          <button onClick={() => handleBulkResult('lost')} className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-all">
            Mark Lost
          </button>
          <button onClick={() => handleBulkResult('void')} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-lg hover:bg-zinc-700 transition-all">
            Mark Void
          </button>
          <button onClick={() => setSelectedTips(new Set())} className="ml-auto text-xs text-zinc-500 hover:text-zinc-300">
            Clear Selection
          </button>
        </div>
      )}

      {/* ─── Tips List ───────────────────────────────────── */}
      <div className="space-y-2">
        {filteredTips.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
            <p className="text-zinc-500">No tips match the current filters.</p>
          </div>
        ) : (
          filteredTips.map(tip => (
            <div
              key={tip.id}
              className={`bg-zinc-900/40 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${
                selectedTips.has(tip.id) ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800/60'
              }`}
            >
              {/* Checkbox for bulk selection (only for pending tips) */}
              {tip.result === 'pending' && (
                <input
                  type="checkbox"
                  checked={selectedTips.has(tip.id)}
                  onChange={() => toggleSelect(tip.id)}
                  className="w-4 h-4 accent-emerald-500 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-zinc-500">{tip.league}</span>
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                    tip.category === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
                    tip.category === 'vip' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{CATEGORY_LABELS[tip.category]?.label || tip.category}</span>
                  <span className="text-[10px] text-zinc-600">{tip.matchDate.split('T')[0]}</span>
                </div>
                <p className="text-sm font-medium text-zinc-200 truncate">{tip.homeTeam} vs {tip.awayTeam}</p>
                <p className="text-xs text-emerald-400 font-bold">{tip.prediction} {tip.odds && `@ ${tip.odds}`}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                  tip.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                  tip.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                  tip.result === 'void' ? 'bg-zinc-800 text-zinc-500' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>{tip.result}</span>
                {tip.result === 'pending' && (
                  <>
                    <button onClick={() => handleResult(tip.id, 'won')} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all" title="Won">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleResult(tip.id, 'lost')} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all" title="Lost">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button onClick={() => handleEditTip(tip)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all" title="Edit">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteTip(tip.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all" title="Delete">
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

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      {children}
    </div>
  );
}
