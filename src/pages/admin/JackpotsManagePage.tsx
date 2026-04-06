import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Trophy, X, GripVertical, Check, Zap, Edit, ChevronDown, ChevronUp, Award, Copy } from 'lucide-react';
import {
  getAllJackpots, addJackpot, deleteJackpot, updateJackpot,
  type JackpotPrediction, type JackpotType, type DCLevel, type JackpotMatch
} from '../../services/tipsService';
import { toast } from 'sonner';
import { TeamWithLogo } from '../../components/TeamLogo';
import { adminService } from '../../services/adminService';

const DC_LEVELS: DCLevel[] = [3, 4, 5, 6, 7, 10];

export function JackpotsManagePage() {
  const [jackpots, setJackpots] = useState<JackpotPrediction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'midweek' as JackpotType,
    dcLevel: 3 as DCLevel,
    price: 500,
    intPrice: 5.99,
    matches: [] as JackpotMatch[],
    variations: [[]] as string[][],
    notify: false,
    notify_target: 'subscribers',
    notify_channel: 'both',
  });
  const [defaultPrices, setDefaultPrices] = useState({ midweek: 500, mega: 1000, midweekInt: 5, megaInt: 10 });
  const [dcPricesConfig, setDcPricesConfig] = useState<Record<string, Record<string, { local: number, intl: number }>>>({});
  const [matchInput, setMatchInput] = useState({ homeTeam: '', awayTeam: '' });
  const [bulkMatches, setBulkMatches] = useState('');
  const [activeVariation, setActiveVariation] = useState(0);
  const [bulkPicks, setBulkPicks] = useState('');
  const [bulkAllVariations, setBulkAllVariations] = useState('');
  
  // Drag and Drop State
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  useEffect(() => {
    loadJackpots();
    adminService.getSettings().then(s => {
      setDefaultPrices({
        midweek: s.jackpot_midweek_price || 500,
        mega: s.jackpot_mega_price || 1000,
        midweekInt: s.jackpot_midweek_int_price || 5,
        megaInt: s.jackpot_mega_int_price || 10,
      });
      if (s.jackpot_prices_json) {
        try {
          setDcPricesConfig(JSON.parse(s.jackpot_prices_json));
        } catch(e) {}
      }
    }).catch(() => {});
  }, []);

  const loadJackpots = () => {
    getAllJackpots().then(setJackpots);
  };

  const addMatchToJackpot = () => {
    if (!matchInput.homeTeam || !matchInput.awayTeam) {
      toast.error('Fill in both teams');
      return;
    }
    setForm(prev => ({
      ...prev,
      matches: [...prev.matches, { ...matchInput, country: '', countryFlag: '' }],
    }));
    setMatchInput({ homeTeam: '', awayTeam: '' });
  };

  const autoEnrichMatches = async () => {
    if (form.matches.length === 0) return;
    const loadingToastId = toast.loading(`Enriching ${form.matches.length} matches...`);
    try {
      const enriched = await adminService.enrichMatches(form.matches);
      if (enriched && enriched.length > 0) {
        setForm(prev => ({
          ...prev,
          matches: enriched
        }));
        toast.success(`Enriched ${enriched.length} matches!`, { id: loadingToastId });
      } else {
        toast.error('Failed to enrich matches', { id: loadingToastId });
      }
    } catch (err) {
      toast.error('Error enriching matches', { id: loadingToastId });
    }
  };

  const removeMatch = (index: number) => {
    setForm(prev => ({
      ...prev,
      matches: prev.matches.filter((_, i) => i !== index),
      // Also remove that pick index from each variation
      variations: prev.variations.map(v => v.filter((_, i) => i !== index)),
    }));
  };

  const handleBulkMatches = () => {
    const lines = bulkMatches.split('\n').map(l => l.trim()).filter(Boolean);
    const newMatches: JackpotMatch[] = [];
    
    for (const line of lines) {
      if (line.includes(' vs ')) {
        const [home, away] = line.split(/ vs /i).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away });
      } else if (line.includes(' - ')) {
        const [home, away] = line.split(/ - /).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away });
      } else if (line.includes(' v ')) {
        const [home, away] = line.split(/ v /i).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away });
      } else if (line.includes('-')) {
        const [home, away] = line.split(/-/).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away });
      }
    }
    
    if (newMatches.length > 0) {
      setForm(prev => ({
        ...prev,
        matches: [...prev.matches, ...newMatches]
      }));
      setBulkMatches('');
      toast.success(`Imported ${newMatches.length} matches`);
    } else {
      toast.error('Could not parse matches. Ensure format is "Home vs Away"');
    }
  };

  const addVariation = () => {
    setForm(prev => ({
      ...prev,
      variations: [...prev.variations, Array(prev.matches.length).fill('12')],
    }));
    setActiveVariation(form.variations.length);
  };

  const removeVariation = (index: number) => {
    if (form.variations.length <= 1) {
      toast.error('Must have at least 1 variation');
      return;
    }
    setForm(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
    setActiveVariation(Math.max(0, activeVariation - 1));
  };

  const handleBulkPicks = () => {
    if (!bulkPicks.trim() || form.matches.length === 0) return;
    
    const picks = bulkPicks.toUpperCase().split(/[, ]+/).map(p => p.trim()).filter(Boolean);
    
    if (picks.length !== form.matches.length) {
      toast.error(`Expected ${form.matches.length} picks but got ${picks.length}`);
      return;
    }
    
    setForm(prev => {
      const updated = [...prev.variations];
      updated[activeVariation] = picks;
      return { ...prev, variations: updated };
    });
    
    setBulkPicks('');
    toast.success(`Applied ${picks.length} picks to Variation ${activeVariation + 1}`);
  };

  const handleBulkAllVariations = () => {
    if (!bulkAllVariations.trim() || form.matches.length === 0) return;
    
    const lines = bulkAllVariations.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const parsedVariations: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const picks = lines[i].toUpperCase().split(',').map(p => p.trim()).filter(Boolean);
      if (picks.length !== form.matches.length) {
        toast.error(`Line ${i + 1} has ${picks.length} picks but expected ${form.matches.length}`);
        return;
      }
      parsedVariations.push(picks);
    }
    
    if (parsedVariations.length === 0) {
      toast.error('No valid variations found');
      return;
    }
    
    setForm(prev => ({ ...prev, variations: parsedVariations }));
    setActiveVariation(0);
    setBulkAllVariations('');
    toast.success(`Imported ${parsedVariations.length} variations with ${form.matches.length} picks each`);
  };

  const updateVariationPick = (varIndex: number, matchIndex: number, pick: string) => {
    setForm(prev => {
      const updated = prev.variations.map(v => [...v]);
      // Ensure the variation array is long enough
      while (updated[varIndex].length < prev.matches.length) {
        updated[varIndex].push('12');
      }
      updated[varIndex][matchIndex] = pick;
      return { ...prev, variations: updated };
    });
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      setForm(prev => {
        const matches = [...prev.matches];
        const draggedMatch = matches.splice(dragItem.current!, 1)[0];
        matches.splice(dragOverItem.current!, 0, draggedMatch);
        
        // Also reorder picks in each variation
        const variations = prev.variations.map(v => {
          const picks = [...v];
          const draggedPick = picks.splice(dragItem.current!, 1)[0];
          picks.splice(dragOverItem.current!, 0, draggedPick);
          return picks;
        });
        
        return { ...prev, matches, variations };
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = form.type === 'midweek' ? 13 : 17;
    if (form.matches.length !== expected) {
      toast.error(`${form.type === 'midweek' ? 'Midweek' : 'Mega'} jackpot requires exactly ${expected} matches. You have ${form.matches.length}.`);
      return;
    }

    if (form.variations.length === 0) {
      toast.error('Add at least one variation');
      return;
    }

    // Validate each variation has the right number of picks
    for (let i = 0; i < form.variations.length; i++) {
      if (form.variations[i].length !== form.matches.length) {
        toast.error(`Variation ${i + 1} has ${form.variations[i].length} picks but needs ${form.matches.length}`);
        return;
      }
    }
    
    const payload = {
      ...form,
      regional_prices: { international: { price: form.intPrice } }
    };

    if (editingId) {
      await updateJackpot(editingId, payload);
      toast.success('Jackpot updated');
    } else {
      await addJackpot(payload);
      toast.success('Jackpot prediction published');
    }
    loadJackpots();
    resetForm();
  };

  const resetForm = () => {
    setForm({ type: 'midweek', dcLevel: 3, price: defaultPrices.midweek, intPrice: defaultPrices.midweekInt, matches: [], variations: [[]], notify: false, notify_target: 'subscribers', notify_channel: 'both' });
    setEditingId(null);
    setShowForm(false);
    setActiveVariation(0);
  };

  const handleEdit = (j: JackpotPrediction) => {
    setForm({
      type: j.type,
      dcLevel: j.dcLevel,
      price: j.price,
      intPrice: j.regional_prices?.international?.price || 5.99,
      matches: j.matches.map(m => ({ 
        homeTeam: m.homeTeam, 
        awayTeam: m.awayTeam, 
        result: m.result,
        country: m.country,
        countryFlag: m.countryFlag
      })),
      variations: j.variations.length > 0 ? j.variations.map(v => [...v]) : [[]],
      notify: false, notify_target: 'subscribers', notify_channel: 'both',
    });
    setEditingId(j.id);
    setShowForm(true);
    setActiveVariation(0);
  };

  const handleResult = async (id: string, result: string) => {
    await updateJackpot(id, { result });
    loadJackpots();
    toast.success(`Jackpot marked as ${result}`);
  };

  const handleMatchResult = async (jackpot: JackpotPrediction, matchIndex: number, result: string) => {
    const updatedMatches = jackpot.matches.map((m, i) => {
      if (i === matchIndex) {
        return { ...m, result: m.result === result ? undefined : result };
      }
      return m;
    });
    await updateJackpot(jackpot.id, { matches: updatedMatches });
    loadJackpots();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this jackpot prediction?')) return;
    await deleteJackpot(id);
    loadJackpots();
    toast.success('Jackpot deleted');
  };

  const PICK_OPTIONS = ['1X', 'X2', '12', '1', 'X', '2'];

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Jackpot Management</h1>
          <p className="text-sm text-zinc-500 mt-1">{jackpots.length} jackpot predictions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-zinc-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> New Jackpot
        </button>
      </div>

      {/* ─── Jackpot Form ────────────────────────────────── */}
      {showForm && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 font-display">{editingId ? '✏️ Edit Jackpot' : '🏆 Create Jackpot Prediction'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Jackpot Type</label>
                <select value={form.type} onChange={e => {
                  const newType = e.target.value as JackpotType;
                  const custom = dcPricesConfig[newType]?.[String(form.dcLevel)];
                  setForm({ 
                    ...form, 
                    type: newType,
                    price: form.price === 0 ? 0 : (custom?.local || (newType === 'midweek' ? defaultPrices.midweek : defaultPrices.mega)),
                    intPrice: form.price === 0 ? 0 : (custom?.intl || (newType === 'midweek' ? defaultPrices.midweekInt : defaultPrices.megaInt)),
                  });
                }} className="admin-input">
                  <option value="midweek">Midweek (13 Matches)</option>
                  <option value="mega">Mega (17 Matches)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">DC Level</label>
                <select value={form.dcLevel} onChange={e => {
                  const newDc = parseInt(e.target.value) as DCLevel;
                  const custom = dcPricesConfig[form.type]?.[String(newDc)];
                  setForm({ 
                    ...form, 
                    dcLevel: newDc,
                    price: form.price === 0 ? 0 : (custom?.local || (form.type === 'midweek' ? defaultPrices.midweek : defaultPrices.mega)),
                    intPrice: form.price === 0 ? 0 : (custom?.intl || (form.type === 'midweek' ? defaultPrices.midweekInt : defaultPrices.megaInt)),
                  });
                }} className="admin-input">
                  {DC_LEVELS.map(dc => <option key={dc} value={dc}>{dc}DC</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${form.price === 0 ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.price === 0 ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className={`text-sm font-bold ${form.price === 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {form.price === 0 ? '🎁 Free' : '💰 Paid'}
                  </span>
                </label>
                <input type="hidden" />
                <button type="button" onClick={() => {
                  if (form.price === 0) {
                    // Switch to paid — restore defaults
                    setForm({ ...form, price: form.type === 'midweek' ? defaultPrices.midweek : defaultPrices.mega, intPrice: form.type === 'midweek' ? defaultPrices.midweekInt : defaultPrices.megaInt });
                  } else {
                    setForm({ ...form, price: 0, intPrice: 0 });
                  }
                }} className="ml-2 text-[10px] text-zinc-500 hover:text-white transition-colors underline">
                  Toggle
                </button>
              </div>
            </div>
            {form.price > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Local Price (KES)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="admin-input" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1 tracking-wider">Intl Price (USD)</label>
                <input type="number" step="0.01" value={form.intPrice} onChange={e => setForm({ ...form, intPrice: parseFloat(e.target.value) || 0 })} className="admin-input border-blue-500/30 bg-blue-500/5 focus:border-blue-500" />
              </div>
            </div>
            )}

            {/* ─── Matches Section ────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Matches <span className={form.matches.length === (form.type === 'midweek' ? 13 : 17) ? 'text-emerald-400' : ''}>({form.matches.length}/{form.type === 'midweek' ? 13 : 17})</span>
                </label>
              </div>
              
              {/* Manual Row Entry */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input value={matchInput.homeTeam} onChange={e => setMatchInput({ ...matchInput, homeTeam: e.target.value })} placeholder="Home team" className="admin-input flex-1" />
                <input value={matchInput.awayTeam} onChange={e => setMatchInput({ ...matchInput, awayTeam: e.target.value })} placeholder="Away team" className="admin-input flex-1" />
                <button type="button" onClick={addMatchToJackpot} className="px-3 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Bulk Import */}
              <div className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl mb-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Bulk Import Matches</span>
                </div>
                <textarea 
                  value={bulkMatches}
                  onChange={e => setBulkMatches(e.target.value)}
                  placeholder="Paste lines: TeamA vs TeamB"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white h-16 resize-none mb-2"
                />
                <button type="button" onClick={handleBulkMatches} className="w-full py-1.5 bg-zinc-800 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 text-xs font-bold rounded-lg transition-all mb-2">
                  Import Matches
                </button>
                {form.matches.length > 0 && (
                  <button type="button" onClick={autoEnrichMatches} className="w-full py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Auto-Fill Country Data
                  </button>
                )}
              </div>

              {/* Match List */}
              {form.matches.length > 0 && (
                <div className="border border-zinc-800/60 rounded-xl overflow-hidden mb-4">
                  {form.matches.map((m, i) => (
                    <div 
                      key={i} 
                      className="flex items-center px-3 py-2 text-sm border-b border-zinc-800/30 last:border-b-0 hover:bg-zinc-800/20 transition-colors"
                      draggable
                      onDragStart={() => (dragItem.current = i)}
                      onDragEnter={() => (dragOverItem.current = i)}
                      onDragEnd={handleSort}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <GripVertical className="w-4 h-4 text-zinc-600 mr-2 cursor-grab active:cursor-grabbing" />
                      <span className="w-6 text-zinc-500 text-xs">{i + 1}.</span>
                      <span className="flex-1 text-zinc-300 flex flex-col sm:flex-row sm:items-center gap-1 flex-wrap">
                        {m.country && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1 mr-2">
                            {m.countryFlag && (
                              m.countryFlag.startsWith('http')
                                ? <img src={m.countryFlag} alt={m.country || ''} className="w-3.5 h-2.5 object-cover rounded-[2px]" />
                                : <span>{m.countryFlag}</span>
                            )}
                            {m.country}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-sm font-medium" />
                          <span className="text-zinc-500 font-normal mx-1">vs</span>
                          <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-sm font-medium" />
                        </span>
                      </span>
                      <button type="button" onClick={() => removeMatch(i)} className="p-1.5 bg-zinc-800 text-zinc-500 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Variations Section ────────────────────────── */}
            {form.matches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                    <Trophy className="w-3.5 h-3.5 inline mr-1" />
                    Variations ({form.variations.length})
                  </label>
                  <button type="button" onClick={addVariation} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-xs font-bold hover:bg-yellow-500/20 transition-all">
                    <Plus className="w-3 h-3" /> Add Variation
                  </button>
                </div>

                {/* Bulk Import ALL Variations */}
                <div className="p-3 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-xl mb-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Import All Variations at Once</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-2">Paste all variations — one per line, picks comma-separated (e.g. 12,2,X,1,...)</p>
                  <textarea
                    value={bulkAllVariations}
                    onChange={e => setBulkAllVariations(e.target.value)}
                    placeholder={`12,2,2,1,X,2,12,1,X,2,12,X,12\nX,2,12,X,X,1X,1,2,1,12,2,1X,1\nX,X2,2,1X,1X,X,2,2,X,1,2,1,1X\nX2,2,X,X,1,X,12,2,2,2,12,1X,X`}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white font-mono h-24 resize-none mb-2"
                  />
                  <button type="button" onClick={handleBulkAllVariations} className="w-full py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Import All Variations
                  </button>
                </div>

                {/* Variation Tabs */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {form.variations.map((_, vi) => (
                    <button
                      key={vi}
                      type="button"
                      onClick={() => setActiveVariation(vi)}
                      className={`relative group px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeVariation === vi
                          ? 'bg-yellow-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      V{vi + 1}
                      {form.variations.length > 1 && (
                        <span
                          onClick={(e) => { e.stopPropagation(); removeVariation(vi); }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          ×
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Bulk Picks for Active Variation */}
                <div className="p-3 bg-zinc-800/40 border border-yellow-500/20 rounded-xl mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Copy className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Paste Picks for Variation {activeVariation + 1}
                    </span>
                  </div>
                  <textarea 
                    value={bulkPicks}
                    onChange={e => setBulkPicks(e.target.value)}
                    placeholder={`e.g. 12,2,2,1,X,2,12,1,X,2,12,X,12 (${form.matches.length} picks)`}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white h-10 resize-none mb-2"
                  />
                  <button type="button" onClick={handleBulkPicks} className="w-full py-1.5 bg-zinc-800 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 text-xs font-bold rounded-lg transition-all">
                    Apply Picks to V{activeVariation + 1}
                  </button>
                </div>

                {/* Per-match picks for active variation */}
                <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/50 px-3 py-2 flex items-center gap-2 border-b border-zinc-800/60">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Variation {activeVariation + 1} Picks</span>
                  </div>
                  {form.matches.map((m, mi) => {
                    const pick = (form.variations[activeVariation] && form.variations[activeVariation][mi]) || '12';
                    return (
                      <div key={mi} className="flex items-center px-3 py-1.5 text-sm border-b border-zinc-800/30 last:border-b-0 hover:bg-zinc-800/20">
                        <span className="w-6 text-zinc-500 text-xs">{mi + 1}.</span>
                        <span className="flex-1 text-zinc-300 text-xs truncate inline-flex items-center gap-1">
                          <TeamWithLogo teamName={m.homeTeam} size={12} textClassName="text-xs" />
                          <span className="text-zinc-600 mx-0.5">vs</span>
                          <TeamWithLogo teamName={m.awayTeam} size={12} textClassName="text-xs" />
                        </span>
                        <select
                          value={pick}
                          onChange={(e) => updateVariationPick(activeVariation, mi, e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 text-yellow-400 font-bold rounded px-2 py-1 text-xs w-16 text-center focus:border-yellow-500"
                        >
                          {PICK_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!editingId && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-yellow-500" checked={form.notify} onChange={e => setForm({ ...form, notify: e.target.checked })} />
                    <span className="text-sm font-bold text-white">Auto-notify users on publish</span>
                  </label>
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">New</span>
                </div>
                {form.notify && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Target Audience</label>
                      <select value={form.notify_target} onChange={e => setForm({ ...form, notify_target: e.target.value })} className="admin-input text-xs py-1.5 focus:border-yellow-500">
                        <option value="all">Everyone</option>
                        <option value="subscribers">All Subscribers (Paid)</option>
                        <option value="free">Free Users</option>
                        <option value="basic">Basic Tier</option>
                        <option value="standard">Standard Tier</option>
                        <option value="premium">Premium Tier</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Channel</label>
                      <select value={form.notify_channel} onChange={e => setForm({ ...form, notify_channel: e.target.value })} className="admin-input text-xs py-1.5 focus:border-yellow-500">
                        <option value="both">Push + Email</option>
                        <option value="push">Push Notification Only</option>
                        <option value="email">Email Only</option>
                        <option value="all">Push + Email + SMS</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="flex-1 py-2.5 bg-yellow-500 text-zinc-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm">
                {editingId ? 'Update Jackpot' : 'Publish Jackpot'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Jackpot List ────────────────────────────────── */}
      <div className="space-y-3">
        {jackpots.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
            <Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No jackpot predictions yet.</p>
          </div>
        ) : (
          jackpots.map(j => {
            const isExpanded = expandedId === j.id;
            const wonCount = j.matches.filter(m => m.result === 'won').length;
            const lostCount = j.matches.filter(m => m.result === 'lost').length;
            const ppdCount = j.matches.filter(m => m.result === 'postponed').length;
            const markedCount = wonCount + lostCount + ppdCount;

            return (
              <div key={j.id} className={`bg-zinc-900/40 border rounded-xl p-4 transition-all ${
                j.result === 'won' ? 'border-emerald-500/40 bg-emerald-500/5' :
                j.result === 'lost' ? 'border-red-500/40 bg-red-500/5' :
                j.result === 'bonus' ? 'border-yellow-500/40 bg-yellow-500/5' :
                j.result === 'postponed' ? 'border-orange-500/40 bg-orange-500/5' :
                'border-zinc-800/60'
              }`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      j.result === 'won' ? 'bg-emerald-500/20' :
                      j.result === 'lost' ? 'bg-red-500/20' :
                      j.result === 'bonus' ? 'bg-yellow-500/20' :
                      j.result === 'postponed' ? 'bg-orange-500/20' :
                      'bg-yellow-500/10'
                    }`}>
                      <Trophy className={`w-5 h-5 ${
                        j.result === 'won' ? 'text-emerald-400' :
                        j.result === 'lost' ? 'text-red-400' :
                        'text-yellow-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{j.type === 'midweek' ? 'Midweek' : 'Mega'} • {j.dcLevel}DC</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          j.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                          j.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                          j.result === 'bonus' ? 'bg-yellow-500/20 text-yellow-400' :
                          j.result === 'void' ? 'bg-zinc-800 text-zinc-500' :
                          j.result === 'postponed' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>{j.result || 'pending'}</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        KES {j.price.toLocaleString()} • ${(j.regional_prices?.international?.price || 5.99).toLocaleString()} (Intl) • {j.matches.length} matches • {j.variations.length} variations
                        {markedCount > 0 && <span className="ml-1">• <span className="text-emerald-400">{wonCount}W</span>/<span className="text-red-400">{lostCount}L</span>{ppdCount > 0 && <>/<span className="text-orange-400">{ppdCount}P</span></>}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Overall Result Buttons */}
                    {(j.result === 'pending' || !j.result) && (
                      <>
                        <button onClick={() => handleResult(j.id, 'won')} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all" title="Won">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleResult(j.id, 'lost')} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all" title="Lost">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleResult(j.id, 'bonus')} className="p-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-all" title="Bonus">
                          <Award className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleResult(j.id, 'postponed')} className="px-2 py-1 text-[10px] bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-bold" title="Postponed">
                          PPD
                        </button>
                      </>
                    )}
                    {j.result && j.result !== 'pending' && (
                      <button onClick={() => handleResult(j.id, 'pending')} className="px-2 py-1 text-[10px] bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all">
                        Reset
                      </button>
                    )}
                    {/* Expand / Edit / Delete */}
                    <button onClick={() => setExpandedId(isExpanded ? null : j.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all" title="Show Matches">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleEdit(j)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all" title="Edit">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(j.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded: Table with matches × variations */}
                {isExpanded && (
                  <div className="mt-3 border border-zinc-800/60 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-800/50 border-b border-zinc-800/60">
                          <th className="px-3 py-2 text-left text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-8">#</th>
                          <th className="px-3 py-2 text-left text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Match</th>
                          {j.variations.map((_, vi) => (
                            <th key={vi} className="px-2 py-2 text-center text-[10px] text-yellow-400 font-bold uppercase tracking-wider w-14">V{vi + 1}</th>
                          ))}
                          <th className="px-2 py-2 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-20">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {j.matches.map((m, i) => (
                          <tr key={i} className={`border-b border-zinc-800/30 last:border-b-0 transition-colors ${
                            m.result === 'won' ? 'bg-emerald-500/5' : m.result === 'lost' ? 'bg-red-500/5' : m.result === 'postponed' ? 'bg-orange-500/5' : 'hover:bg-zinc-800/20'
                          }`}>
                            <td className="px-3 py-2 text-zinc-500 text-xs">{i + 1}</td>
                            <td className="px-3 py-2">
                              <span className="text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                                <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-xs" />
                                <span className="text-zinc-600 mx-0.5">vs</span>
                                <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-xs" />
                              </span>
                            </td>
                            {j.variations.map((v, vi) => (
                              <td key={vi} className="px-2 py-2 text-center">
                                <span className="text-yellow-400 font-bold text-xs font-mono">{v[i] || '-'}</span>
                              </td>
                            ))}
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => handleMatchResult(j, i, 'won')} 
                                  className={`p-1 rounded transition-all ${
                                    m.result === 'won' ? 'bg-emerald-500/30 text-emerald-400' : 'bg-zinc-800 text-zinc-600 hover:text-emerald-400'
                                  }`} 
                                  title="Won"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleMatchResult(j, i, 'lost')} 
                                  className={`p-1 rounded transition-all ${
                                    m.result === 'lost' ? 'bg-red-500/30 text-red-400' : 'bg-zinc-800 text-zinc-600 hover:text-red-400'
                                  }`} 
                                  title="Lost"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleMatchResult(j, i, 'postponed')} 
                                  className={`px-1 py-0.5 rounded text-[9px] font-bold transition-all ${
                                    m.result === 'postponed' ? 'bg-orange-500/30 text-orange-400' : 'bg-zinc-800 text-zinc-600 hover:text-orange-400'
                                  }`} 
                                  title="Postponed"
                                >
                                  PPD
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
