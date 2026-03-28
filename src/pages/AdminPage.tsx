import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit, Check, X, Bot, Star, TrendingUp, Trophy, Settings } from 'lucide-react';
import { getAllTips, addTip, updateTip, deleteTip, getTipStats, getAllJackpots, addJackpot, deleteJackpot, type Tip, type TipCategory, type JackpotType, type DCLevel, type JackpotMatch, type JackpotPrediction } from '../services/tipsService';
import { getPricingTiers, updatePricingTier, type TierConfig, CATEGORY_LABELS } from '../services/pricingService';
import { toast } from 'sonner';
import { usePageTitle } from '../hooks/usePageTitle';

const ADMIN_PASSWORD = 'tambuatips2026';
const TIP_CATEGORIES: TipCategory[] = ['free', '2+', '4+', 'gg', '10+', 'vip'];
const DC_LEVELS: DCLevel[] = [3, 4, 5, 6, 7, 10];

export function AdminPage() {
  usePageTitle('Admin Panel');
  const [isAuth, setIsAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'tips' | 'jackpot' | 'pricing'>('tips');

  // ─── Tips State ──────────────────────────────────────────────
  const [tips, setTips] = useState<Tip[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTipForm, setShowTipForm] = useState(false);
  const [tipForm, setTipForm] = useState({
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

  // ─── Jackpot State ───────────────────────────────────────────
  const [jackpots, setJackpots] = useState<JackpotPrediction[]>([]);
  const [showJackpotForm, setShowJackpotForm] = useState(false);
  const [jackpotForm, setJackpotForm] = useState({
    type: 'midweek' as JackpotType,
    dcLevel: 3 as DCLevel,
    price: 500,
    matches: [] as JackpotMatch[],
  });
  const [matchInput, setMatchInput] = useState({ homeTeam: '', awayTeam: '', pick: '1X' });

  // ─── Pricing State ───────────────────────────────────────────
  const [pricingTiers, setPricingTiers] = useState<TierConfig[]>([]);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, winRate: 0 });

  useEffect(() => {
    getAllJackpots().then(setJackpots);
    getPricingTiers().then(setPricingTiers);
  }, []);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState({ price2wk: 0, price4wk: 0 });

  useEffect(() => {
    if (isAuth) {
      getAllTips().then(setTips);
      getAllJackpots().then(setJackpots);
      getPricingTiers().then(setPricingTiers);
      getTipStats().then(setStats);
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

  // ─── Tips Handlers ───────────────────────────────────────────
  const resetTipForm = () => {
    setTipForm({ fixtureId: '', homeTeam: '', awayTeam: '', league: '', matchDate: new Date().toISOString().split('T')[0], prediction: '', odds: '', bookmaker: 'Betika', oddsBetika: '', oddsSportPesa: '', oddsBetway: '', confidence: 3, reasoning: '', category: 'free' });
    setEditingId(null);
    setShowTipForm(false);
  };

  const handleTipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipForm.homeTeam || !tipForm.prediction) { toast.error('Fill in required fields'); return; }

    const bookmakerOdds = [
      { bookmaker: 'Betika', odds: tipForm.oddsBetika || tipForm.odds },
      { bookmaker: 'SportPesa', odds: tipForm.oddsSportPesa || tipForm.odds },
      { bookmaker: 'Betway', odds: tipForm.oddsBetway || tipForm.odds },
    ].filter(bo => bo.odds);

    const tipData = {
      fixtureId: parseInt(tipForm.fixtureId) || 0,
      homeTeam: tipForm.homeTeam,
      awayTeam: tipForm.awayTeam,
      league: tipForm.league,
      matchDate: tipForm.matchDate,
      prediction: tipForm.prediction,
      odds: tipForm.odds,
      bookmaker: tipForm.bookmaker,
      bookmakerOdds,
      confidence: tipForm.confidence,
      reasoning: tipForm.reasoning,
      category: tipForm.category,
      isPremium: tipForm.category !== 'free',
    };

    if (editingId) {
      updateTip(editingId, tipData);
      toast.success('Tip updated');
    } else {
      addTip({ ...tipData, result: 'pending' });
      toast.success('Tip published');
    }
    getAllTips().then(setTips);
    resetTipForm();
  };

  const handleEditTip = (tip: Tip) => {
    const bOdds = tip.bookmakerOdds || [];
    setTipForm({
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
    setShowTipForm(true);
  };

  const handleDeleteTip = (id: string) => {
    if (confirm('Delete this tip?')) {
      deleteTip(id);
      getAllTips().then(setTips);
      toast.success('Tip deleted');
    }
  };

  const handleResult = (id: string, result: 'won' | 'lost' | 'void') => {
    updateTip(id, { result });
    getAllTips().then(setTips);
    toast.success(`Marked as ${result}`);
  };

  // ─── Jackpot Handlers ────────────────────────────────────────
  const addMatchToJackpot = () => {
    if (!matchInput.homeTeam || !matchInput.awayTeam) { toast.error('Fill in both teams'); return; }
    setJackpotForm(prev => ({
      ...prev,
      matches: [...prev.matches, { ...matchInput }],
    }));
    setMatchInput({ homeTeam: '', awayTeam: '', pick: '1X' });
  };

  const removeMatchFromJackpot = (index: number) => {
    setJackpotForm(prev => ({
      ...prev,
      matches: prev.matches.filter((_, i) => i !== index),
    }));
  };

  const handleJackpotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedMatches = jackpotForm.type === 'midweek' ? 13 : 17;
    if (jackpotForm.matches.length !== expectedMatches) {
      toast.error(`${jackpotForm.type === 'midweek' ? 'Midweek' : 'Mega'} jackpot requires exactly ${expectedMatches} matches. You have ${jackpotForm.matches.length}.`);
      return;
    }
    addJackpot(jackpotForm);
    getAllJackpots().then(setJackpots);
    setJackpotForm({ type: 'midweek', dcLevel: 3, price: 500, matches: [] });
    setShowJackpotForm(false);
    toast.success('Jackpot prediction published');
  };

  const handleDeleteJackpot = (id: string) => {
    if (confirm('Delete this jackpot prediction?')) {
      deleteJackpot(id);
      getAllJackpots().then(setJackpots);
      toast.success('Jackpot deleted');
    }
  };

  // ─── Pricing Handlers ────────────────────────────────────────
  const startEditTier = (tier: TierConfig) => {
    setEditingTier(tier.id);
    setTierForm({ price2wk: tier.price2wk, price4wk: tier.price4wk });
  };

  const saveTier = (tierId: string) => {
    updatePricingTier(tierId as any, tierForm);
    getPricingTiers().then(setPricingTiers);
    setEditingTier(null);
    toast.success('Pricing updated');
  };

  // ─── Auth Screen ─────────────────────────────────────────────
  if (!isAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/20 rounded-full mx-auto mb-6">
            <Shield className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-display font-bold text-center mb-6">Admin Access</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-4" />
          <button type="submit" className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">Login</button>
        </form>
      </div>
    );
  }



  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase">Admin Panel</h1>
          <p className="text-sm text-zinc-400">Manage tips, jackpots, and pricing</p>
        </div>
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

      {/* Tab Navigation */}
      <div className="flex bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 mb-6">
        {[
          { key: 'tips' as const, label: 'Tips', icon: TrendingUp },
          { key: 'jackpot' as const, label: 'Jackpot', icon: Trophy },
          { key: 'pricing' as const, label: 'Pricing', icon: Settings },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TIPS TAB ═══ */}
      {activeTab === 'tips' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { resetTipForm(); setShowTipForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">
              <Plus className="w-4 h-4" /> Add Tip
            </button>
          </div>

          {/* Tip Form */}
          {showTipForm && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">{editingId ? 'Edit Tip' : 'Add New Tip'}</h3>
              <form onSubmit={handleTipSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Category *</label>
                  <select value={tipForm.category} onChange={e => setTipForm({ ...tipForm, category: e.target.value as TipCategory })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {TIP_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.label || cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">League *</label>
                  <input value={tipForm.league} onChange={e => setTipForm({ ...tipForm, league: e.target.value })} placeholder="e.g. Premier League" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Home Team *</label>
                  <input value={tipForm.homeTeam} onChange={e => setTipForm({ ...tipForm, homeTeam: e.target.value })} placeholder="e.g. Arsenal" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Away Team *</label>
                  <input value={tipForm.awayTeam} onChange={e => setTipForm({ ...tipForm, awayTeam: e.target.value })} placeholder="e.g. Chelsea" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Match Date *</label>
                  <input type="date" value={tipForm.matchDate} onChange={e => setTipForm({ ...tipForm, matchDate: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Prediction *</label>
                  <input value={tipForm.prediction} onChange={e => setTipForm({ ...tipForm, prediction: e.target.value })} placeholder="e.g. Home Win, Over 2.5" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Bookmaker Odds</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-1">Betika</label>
                      <input value={tipForm.oddsBetika} onChange={e => setTipForm({ ...tipForm, oddsBetika: e.target.value, odds: tipForm.odds || e.target.value, bookmaker: tipForm.bookmaker || 'Betika' })} placeholder="e.g. 2.10" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-1">SportPesa</label>
                      <input value={tipForm.oddsSportPesa} onChange={e => setTipForm({ ...tipForm, oddsSportPesa: e.target.value, odds: tipForm.odds || e.target.value })} placeholder="e.g. 2.15" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-1">Betway</label>
                      <input value={tipForm.oddsBetway} onChange={e => setTipForm({ ...tipForm, oddsBetway: e.target.value, odds: tipForm.odds || e.target.value })} placeholder="e.g. 2.05" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Confidence (1-5)</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setTipForm({ ...tipForm, confidence: n })} className={`p-1.5 rounded ${n <= tipForm.confidence ? 'text-gold-400' : 'text-zinc-700'}`}>
                        <Star className={`w-5 h-5 ${n <= tipForm.confidence ? 'fill-gold-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Fixture ID</label>
                  <input type="number" value={tipForm.fixtureId} onChange={e => setTipForm({ ...tipForm, fixtureId: e.target.value })} placeholder="API fixture ID (optional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Reasoning</label>
                  <textarea value={tipForm.reasoning} onChange={e => setTipForm({ ...tipForm, reasoning: e.target.value })} placeholder="Analysis / reasoning..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-24 resize-none" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" className="flex-1 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">{editingId ? 'Update Tip' : 'Publish Tip'}</button>
                  <button type="button" onClick={resetTipForm} className="px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">Cancel</button>
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
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        tip.category === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
                        tip.category === 'vip' ? 'bg-gold-500/20 text-gold-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{CATEGORY_LABELS[tip.category]?.label || tip.category}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-200 truncate">{tip.homeTeam} vs {tip.awayTeam}</p>
                    <p className="text-xs text-emerald-400 font-bold">{tip.prediction} @ {tip.odds}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      tip.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                      tip.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                      tip.result === 'void' ? 'bg-zinc-800 text-zinc-500' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>{tip.result}</span>
                    {tip.result === 'pending' && (
                      <>
                        <button onClick={() => handleResult(tip.id, 'won')} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-all" title="Mark Won"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleResult(tip.id, 'lost')} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all" title="Mark Lost"><X className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                    <button onClick={() => handleEditTip(tip)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 hover:text-white transition-all" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteTip(tip.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ═══ JACKPOT TAB ═══ */}
      {activeTab === 'jackpot' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowJackpotForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-zinc-950 font-bold rounded-xl hover:bg-gold-400 transition-all text-sm">
              <Plus className="w-4 h-4" /> New Jackpot
            </button>
          </div>

          {/* Jackpot Form */}
          {showJackpotForm && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">Create Jackpot Prediction</h3>
              <form onSubmit={handleJackpotSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Jackpot Type</label>
                    <select value={jackpotForm.type} onChange={e => setJackpotForm({ ...jackpotForm, type: e.target.value as JackpotType })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="midweek">Midweek (13 Matches)</option>
                      <option value="mega">Mega (17 Matches)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">DC Level</label>
                    <select value={jackpotForm.dcLevel} onChange={e => setJackpotForm({ ...jackpotForm, dcLevel: parseInt(e.target.value) as DCLevel })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                      {DC_LEVELS.map(dc => <option key={dc} value={dc}>{dc}DC</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Price (KES)</label>
                    <input type="number" value={jackpotForm.price} onChange={e => setJackpotForm({ ...jackpotForm, price: parseInt(e.target.value) || 0 })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>

                {/* Add Match */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                    Matches ({jackpotForm.matches.length}/{jackpotForm.type === 'midweek' ? 13 : 17})
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input value={matchInput.homeTeam} onChange={e => setMatchInput({ ...matchInput, homeTeam: e.target.value })} placeholder="Home team" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                    <input value={matchInput.awayTeam} onChange={e => setMatchInput({ ...matchInput, awayTeam: e.target.value })} placeholder="Away team" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                    <select value={matchInput.pick} onChange={e => setMatchInput({ ...matchInput, pick: e.target.value })} className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option>1X</option><option>X2</option><option>12</option>
                    </select>
                    <button type="button" onClick={addMatchToJackpot} className="px-3 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Match List */}
                  {jackpotForm.matches.length > 0 && (
                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                      {jackpotForm.matches.map((m, i) => (
                        <div key={i} className="flex items-center px-3 py-2 text-sm border-b border-zinc-800/50 last:border-b-0">
                          <span className="w-6 text-zinc-500 text-xs">{i + 1}.</span>
                          <span className="flex-1 text-zinc-300">{m.homeTeam} vs {m.awayTeam}</span>
                          <span className="text-emerald-400 font-bold text-xs w-12 text-center">{m.pick}</span>
                          <button type="button" onClick={() => removeMatchFromJackpot(i)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="flex-1 py-2.5 bg-gold-500 text-zinc-950 font-bold rounded-xl hover:bg-gold-400 transition-all text-sm">Publish Jackpot</button>
                  <button type="button" onClick={() => { setShowJackpotForm(false); setJackpotForm({ type: 'midweek', dcLevel: 3, price: 500, matches: [] }); }} className="px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Jackpot List */}
          <div className="space-y-3">
            {jackpots.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400">No jackpot predictions yet. Click "New Jackpot" to create one.</p>
              </div>
            ) : (
              jackpots.map(j => (
                <div key={j.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gold-400" />
                      <span className="font-bold text-zinc-200">{j.type === 'midweek' ? 'Midweek' : 'Mega'} • {j.dcLevel}DC</span>
                      <span className="text-xs text-zinc-500">KES {j.price.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-zinc-500">{j.matches.length} matches</span>
                      <button onClick={() => handleDeleteJackpot(j.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">{new Date(j.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ═══ PRICING TAB ═══ */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400 mb-4">Edit subscription prices below. Changes are reflected immediately on the public pricing page.</p>
          {pricingTiers.map(tier => (
            <div key={tier.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-base font-bold text-zinc-200">{tier.name}</h4>
                  <p className="text-xs text-zinc-500">{tier.categories.filter(c => c !== 'free').map(c => CATEGORY_LABELS[c]?.label).join(', ')}</p>
                </div>
                {editingTier === tier.id ? (
                  <div className="flex gap-2">
                    <button onClick={() => saveTier(tier.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-all"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingTier(null)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-all"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEditTier(tier)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 hover:text-white transition-all"><Edit className="w-4 h-4" /></button>
                )}
              </div>
              {editingTier === tier.id ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">2 Weeks (KES)</label>
                    <input type="number" value={tierForm.price2wk} onChange={e => setTierForm({ ...tierForm, price2wk: parseInt(e.target.value) || 0 })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">4 Weeks (KES)</label>
                    <input type="number" value={tierForm.price4wk} onChange={e => setTierForm({ ...tierForm, price4wk: parseInt(e.target.value) || 0 })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              ) : (
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-zinc-500">2 Weeks:</span>
                    <span className="ml-2 font-bold text-white">KES {tier.price2wk.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">4 Weeks:</span>
                    <span className="ml-2 font-bold text-white">KES {tier.price4wk.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
