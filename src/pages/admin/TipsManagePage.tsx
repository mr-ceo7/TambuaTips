import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, Edit, Check, X, Star, Filter,
  Zap, ChevronDown, Loader, Copy
} from 'lucide-react';
import { TeamWithLogo, LeagueLogo } from '../../components/TeamLogo';
import {
  getAllTips, addTip, updateTip, deleteTip, getTipStats,
  type Tip, type TipCategory
} from '../../services/tipsService';
import { CATEGORY_LABELS } from '../../services/pricingService';
import { adminService, type FixtureSearchResult } from '../../services/adminService';
import { toast } from 'sonner';
import { POPULAR_LEAGUES, TEAMS_BY_LEAGUE, ALL_POPULAR_TEAMS } from '../../data/footballData';
import { AutocompleteInput } from '../../components/AutocompleteInput';

const DEFAULT_PREDICTIONS = ['1', 'X', '2', '1X', 'X2', '12', 'Ov1.5', 'Ov2.5', 'Ov3.5', 'Un2.5', 'GG', 'NG', 'GG & O2.5'];

const TIP_CATEGORIES: TipCategory[] = ['2+', '4+', 'gg', '10+', 'vip'];

export function TipsManagePage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, winRate: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    matchDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16),
    prediction: '',
    confidence: 3,
    reasoning: '',
    category: (sessionStorage.getItem('admin_last_category') as TipCategory) || '2+',
    isFree: sessionStorage.getItem('admin_last_is_free') === 'true',
    notify: false,
    notify_target: 'subscribers',
    notify_channel: 'both',
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
      matchDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16),
      prediction: '', confidence: 3, reasoning: '', 
      category: (sessionStorage.getItem('admin_last_category') as TipCategory) || '2+',
      isFree: sessionStorage.getItem('admin_last_is_free') === 'true',
      notify: false, notify_target: 'subscribers', notify_channel: 'both',
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
      matchDate: fixture.matchDate ? fixture.matchDate.substring(0, 16) : prev.matchDate,
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

    const tipData = {
      fixtureId: parseInt(form.fixtureId) || 0,
      homeTeam: form.homeTeam.trim(),
      awayTeam: form.awayTeam.trim(),
      league: form.league.trim(),
      matchDate: form.matchDate,
      prediction: form.prediction.trim(),
      odds: '', // Deprecated but required by schema
      bookmaker: '', // Deprecated
      bookmakerOdds: [], // Deprecated
      confidence: form.confidence,
      reasoning: form.reasoning,
      category: form.category,
      isFree: form.isFree,
      notify: form.notify,
      notify_target: form.notify_target,
      notify_channel: form.notify_channel,
    };

    sessionStorage.setItem('admin_last_category', form.category);
    sessionStorage.setItem('admin_last_is_free', String(form.isFree));

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateTip(editingId, tipData);
        toast.success('Tip updated');
      } else {
        await addTip({ ...tipData, result: 'pending' });
        toast.success('Tip published');
      }
      await loadData();
      resetForm();
    } catch (error) {
      toast.error('Failed to save tip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTip = (tip: Tip) => {
    setForm({
      fixtureId: String(tip.fixtureId),
      homeTeam: tip.homeTeam,
      awayTeam: tip.awayTeam,
      league: tip.league,
      matchDate: tip.matchDate.substring(0, 16),
      prediction: tip.prediction,
      confidence: tip.confidence,
      reasoning: tip.reasoning,
      category: tip.category,
      isFree: tip.isFree || false,
      notify: false, notify_target: 'subscribers', notify_channel: 'both',
    });
    setEditingId(tip.id);
    setShowForm(true);
  };

  const handleDuplicateTip = (tip: Tip) => {
    setForm({
      fixtureId: String(tip.fixtureId),
      homeTeam: tip.homeTeam,
      awayTeam: tip.awayTeam,
      league: tip.league,
      matchDate: tip.matchDate.substring(0, 16),
      prediction: tip.prediction,
      confidence: tip.confidence,
      reasoning: tip.reasoning,
      category: tip.category,
      isFree: tip.isFree || false,
      notify: false, notify_target: 'subscribers', notify_channel: 'both',
    });
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Tip copied to form. You can now adjust details and publish as a new tip.');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Tips Management</h1>
          <p className="text-sm text-zinc-500 mt-1">{stats.total} total • {stats.winRate}% win rate</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Tip
        </button>
      </div>

      {/* ─── Stats Row ───────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Won', value: stats.won, color: 'text-emerald-400' },
          { label: 'Lost', value: stats.lost, color: 'text-red-400' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 text-center">
            <p className={`text-base sm:text-xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Main Content Flex ─────────────────────────────── */}
      <div className={`flex flex-col gap-5 items-start relative`}>
        
        {/* ─── Tip Form ────────────────────── */}
        {showForm && (
          <div className="w-full bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm relative z-50">
            <h3 className="text-lg font-bold text-white mb-4 font-display flex justify-between items-center">
              {editingId ? '✏️ Edit Tip' : '⚡ Quick Add Tip'}
            </h3>



            {/* Manual Form */}
            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-5">
              {/* Left Column Div */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Fixture Search */}
                {!editingId && (
                  <div className="mb-2 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs font-bold text-zinc-300">Quick Fill — Search Fixture</span>
                    </div>
                    <div className="flex flex-col gap-2">
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
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchFixtures(); } }}
                          placeholder="Type team and Enter..."
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
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
                            type="button"
                            key={f.id}
                            onClick={() => selectFixture(f)}
                            className="w-full text-left px-4 py-3 border-b border-zinc-800/50 last:border-b-0 hover:bg-emerald-500/5 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                                  <TeamWithLogo teamName={f.homeTeam} size={16} textClassName="text-sm font-medium" />
                                  <span className="text-zinc-500">vs</span>
                                  <TeamWithLogo teamName={f.awayTeam} size={16} textClassName="text-sm font-medium" />
                                </div>
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

                <FormField label="Category" required>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as TipCategory })} className="admin-input py-2 min-h-[40px] text-sm">
                    {TIP_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.label || cat}</option>
                    ))}
                  </select>
                </FormField>

                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg mt-1 mb-1">
                  <label className="flex items-center gap-2 cursor-pointer w-full text-emerald-400">
                    <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={form.isFree} onChange={e => setForm({ ...form, isFree: e.target.checked })} />
                    <span className="text-sm font-bold whitespace-nowrap">🎁 Make this tip FREE</span>
                  </label>
                </div>

                <FormField label="League">
                  <AutocompleteInput 
                    value={form.league} 
                    onChange={val => setForm({ ...form, league: val })} 
                    options={POPULAR_LEAGUES} 
                    placeholder="e.g. Premier League"
                    type="league"
                  />
                </FormField>

                <FormField label="Match Date & Time">
                  <input type="datetime-local" value={form.matchDate} onChange={e => setForm({ ...form, matchDate: e.target.value })} className="admin-input py-2 w-full min-h-[40px] text-sm" />
                </FormField>

                <FormField label="Home Team" required>
                  <AutocompleteInput 
                    value={form.homeTeam} 
                    onChange={val => setForm({ ...form, homeTeam: val })} 
                    options={form.league && TEAMS_BY_LEAGUE[form.league] ? TEAMS_BY_LEAGUE[form.league] : ALL_POPULAR_TEAMS} 
                    placeholder="e.g. Arsenal" 
                    required 
                    type="team"
                  />
                </FormField>

                <FormField label="Away Team" required>
                  <AutocompleteInput 
                    value={form.awayTeam} 
                    onChange={val => setForm({ ...form, awayTeam: val })} 
                    options={form.league && TEAMS_BY_LEAGUE[form.league] ? TEAMS_BY_LEAGUE[form.league] : ALL_POPULAR_TEAMS} 
                    placeholder="e.g. Chelsea" 
                    required 
                    type="team"
                  />
                </FormField>
              </div>

              {/* Right Column Div */}
              <div className="flex-1 flex flex-col gap-3">
                <FormField label="Prediction" required>
                   <input value={form.prediction} onChange={e => setForm({ ...form, prediction: e.target.value })} placeholder="e.g. Home Win" className="admin-input w-full py-2 min-h-[40px] text-sm" required />
                </FormField>

                <FormField label="Confidence Level">
                  <div className="flex gap-1 h-[40px] items-center bg-zinc-900 border border-zinc-700 rounded-lg px-2 w-full justify-between">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setForm({ ...form, confidence: n })} className={`p-1 flex flex-col items-center justify-center rounded transition-colors ${n <= form.confidence ? 'text-yellow-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${n <= form.confidence ? 'fill-yellow-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField label="Reasoning (Optional)">
                  <input value={form.reasoning} onChange={e => setForm({ ...form, reasoning: e.target.value })} placeholder="Provide an analysis or reasoning..." className="admin-input py-2 w-full min-h-[40px] text-sm" />
                </FormField>

                <FormField label="Fixture ID (Optional)">
                  <input type="number" value={form.fixtureId} onChange={e => setForm({ ...form, fixtureId: e.target.value })} placeholder="Auto HTML search" className="admin-input py-2 min-h-[40px] text-sm" />
                </FormField>

                <FormField label="Quick Picks">
                   <div className="flex flex-wrap gap-1 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50">
                      {DEFAULT_PREDICTIONS.map(p => (
                        <button key={p} type="button" onClick={() => setForm({ ...form, prediction: p })} className="flex-1 min-w-[40px] px-2 py-1.5 text-[11px] font-bold bg-zinc-800 text-zinc-300 rounded hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700 transition-all shrink-0">
                          {p}
                        </button>
                      ))}
                    </div>
                </FormField>
              
                {!editingId && (
                  <div className="flex flex-col gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 items-start mt-1">
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={form.notify} onChange={e => setForm({ ...form, notify: e.target.checked })} />
                        <span className="text-sm font-bold text-white whitespace-nowrap">Auto-notify users</span>
                      </label>
                    </div>
                    {form.notify && (
                      <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
                        <select value={form.notify_target} onChange={e => setForm({ ...form, notify_target: e.target.value })} className="admin-input min-h-[36px] text-sm py-1.5 flex-1">
                            <option value="all">Everyone</option>
                            <option value="subscribers">Subscribers</option>
                            <option value="free">Free Users</option>
                          </select>
                        <select value={form.notify_channel} onChange={e => setForm({ ...form, notify_channel: e.target.value })} className="admin-input min-h-[36px] text-sm py-1.5 flex-1">
                            <option value="both">Push + Email</option>
                            <option value="push">Push Only</option>
                            <option value="email">Email Only</option>
                          </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button disabled={isSubmitting} type="submit" className="flex-1 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {isSubmitting ? <><Loader className="w-4 h-4 animate-spin"/> Saving...</> : editingId ? 'Update Tip' : 'Publish Tip'}
                  </button>
                  <button disabled={isSubmitting} type="button" onClick={resetForm} className="flex-1 sm:max-w-[120px] py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm disabled:opacity-50 font-bold">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ─── Right Content (Filter + Table) ────────────────── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 w-full relative">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 overflow-x-auto shrink-0">
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
        <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900/60 border border-emerald-500/20 rounded-xl">
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
                  <LeagueLogo leagueName={tip.league} size={14} />
                  <span className="text-[11px] text-zinc-500">{tip.league}</span>
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                    tip.category === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
                    tip.category === 'vip' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{CATEGORY_LABELS[tip.category]?.label || tip.category}</span>
                  <span className="text-[10px] text-zinc-600">
                    {tip.matchDate.includes('T') ? tip.matchDate.replace('T', ' ').substring(0, 16) : tip.matchDate}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200 truncate">
                  <TeamWithLogo teamName={tip.homeTeam} size={16} textClassName="text-sm" />
                  <span className="text-zinc-500">vs</span>
                  <TeamWithLogo teamName={tip.awayTeam} size={16} textClassName="text-sm" />
                </div>
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
                <button onClick={() => handleDuplicateTip(tip)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 transition-all" title="Duplicate">
                  <Copy className="w-3.5 h-3.5" />
                </button>
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
