import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Trophy, X, GripVertical, Check, Zap, Edit, ChevronDown, ChevronUp, Award } from 'lucide-react';
import {
  getAllJackpots, addJackpot, deleteJackpot, updateJackpot,
  type JackpotPrediction, type JackpotType, type DCLevel, type JackpotMatch
} from '../../services/tipsService';
import { toast } from 'sonner';
import { TeamWithLogo } from '../../components/TeamLogo';

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
  });
  const [matchInput, setMatchInput] = useState({ homeTeam: '', awayTeam: '', pick: '1X' });
  const [bulkMatches, setBulkMatches] = useState('');
  const [bulkPicks, setBulkPicks] = useState('');
  
  // Drag and Drop State
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  useEffect(() => {
    loadJackpots();
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
      matches: [...prev.matches, { ...matchInput }],
    }));
    setMatchInput({ homeTeam: '', awayTeam: '', pick: '1X' });
  };

  const removeMatch = (index: number) => {
    setForm(prev => ({
      ...prev,
      matches: prev.matches.filter((_, i) => i !== index),
    }));
  };

  const handleBulkMatches = () => {
    const lines = bulkMatches.split('\n').map(l => l.trim()).filter(Boolean);
    const newMatches: JackpotMatch[] = [];
    
    for (const line of lines) {
      if (line.includes(' vs ')) {
        const [home, away] = line.split(/ vs /i).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away, pick: '12' });
      } else if (line.includes(' - ')) {
        const [home, away] = line.split(/ - /).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away, pick: '12' });
      } else if (line.includes(' v ')) {
        const [home, away] = line.split(/ v /i).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away, pick: '12' });
      } else if (line.includes('-')) {
        const [home, away] = line.split(/-/).map(s => s.trim());
        newMatches.push({ homeTeam: home, awayTeam: away, pick: '12' });
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

  const handleBulkPicks = () => {
    if (!bulkPicks.trim() || form.matches.length === 0) return;
    
    const picks = bulkPicks.toUpperCase().split(/[, ]+/).map(p => p.trim()).filter(Boolean);
    
    if (picks.length > form.matches.length) {
      toast.error(`Provided ${picks.length} picks but only have ${form.matches.length} matches!`);
      return;
    }
    
    setForm(prev => {
      const updated = [...prev.matches];
      picks.forEach((p, idx) => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], pick: p };
        }
      });
      return { ...prev, matches: updated };
    });
    
    setBulkPicks('');
    toast.success(`Applied ${picks.length} picks!`);
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      setForm(prev => {
        const matches = [...prev.matches];
        const draggedItemContent = matches.splice(dragItem.current!, 1)[0];
        matches.splice(dragOverItem.current!, 0, draggedItemContent);
        return { ...prev, matches };
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
    setForm({ type: 'midweek', dcLevel: 3, price: 500, intPrice: 5.99, matches: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (j: JackpotPrediction) => {
    setForm({
      type: j.type,
      dcLevel: j.dcLevel,
      price: j.price,
      intPrice: j.regional_prices?.international?.price || 5.99,
      matches: j.matches.map(m => ({ ...m })),
    });
    setEditingId(j.id);
    setShowForm(true);
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
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as JackpotType })} className="admin-input">
                  <option value="midweek">Midweek (13 Matches)</option>
                  <option value="mega">Mega (17 Matches)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">DC Level</label>
                <select value={form.dcLevel} onChange={e => setForm({ ...form, dcLevel: parseInt(e.target.value) as DCLevel })} className="admin-input">
                  {DC_LEVELS.map(dc => <option key={dc} value={dc}>{dc}DC</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Local Price (KES)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="admin-input" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1 tracking-wider">Intl Price (USD)</label>
                <input type="number" step="0.01" value={form.intPrice} onChange={e => setForm({ ...form, intPrice: parseFloat(e.target.value) || 0 })} className="admin-input border-blue-500/30 bg-blue-500/5 focus:border-blue-500" />
              </div>
            </div>

            {/* Add Match */}
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
                <select value={matchInput.pick} onChange={e => setMatchInput({ ...matchInput, pick: e.target.value })} className="admin-input w-20">
                  <option>1X</option><option>X2</option><option>12</option>
                  <option>1</option><option>X</option><option>2</option>
                </select>
                <button type="button" onClick={addMatchToJackpot} className="px-3 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Bulk Importers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
                <div>
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
                  <button type="button" onClick={handleBulkMatches} className="w-full py-1.5 bg-zinc-800 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 text-xs font-bold rounded-lg transition-all">
                    Import Matches
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Apply Variation Picks</span>
                  </div>
                  <textarea 
                    value={bulkPicks}
                    onChange={e => setBulkPicks(e.target.value)}
                    placeholder="e.g. 12,2,2,1,X,2,12..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white h-16 resize-none mb-2"
                  />
                  <button type="button" onClick={handleBulkPicks} disabled={form.matches.length === 0} className="w-full py-1.5 bg-zinc-800 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 disabled:opacity-50 text-xs font-bold rounded-lg transition-all">
                    Apply Picks Sequence
                  </button>
                </div>
              </div>

              {form.matches.length > 0 && (
                <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
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
                      <span className="flex-1 text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                        <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-sm font-medium" />
                        <span className="text-zinc-500 font-normal mx-1">vs</span>
                        <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-sm font-medium" />
                      </span>
                      <select 
                        value={m.pick} 
                        onChange={(e) => {
                          const newMatches = [...form.matches];
                          newMatches[i].pick = e.target.value;
                          setForm({...form, matches: newMatches});
                        }} 
                        className="bg-zinc-900 border border-zinc-700 text-yellow-400 font-bold rounded px-2 py-1 text-xs w-16 text-center mr-3 focus:border-yellow-500"
                      >
                         <option>1X</option><option>X2</option><option>12</option>
                         <option>1</option><option>X</option><option>2</option>
                      </select>
                      <button type="button" onClick={() => removeMatch(i)} className="p-1.5 bg-zinc-800 text-zinc-500 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
            const markedCount = wonCount + lostCount;

            return (
              <div key={j.id} className={`bg-zinc-900/40 border rounded-xl p-4 transition-all ${
                j.result === 'won' ? 'border-emerald-500/40 bg-emerald-500/5' :
                j.result === 'lost' ? 'border-red-500/40 bg-red-500/5' :
                j.result === 'bonus' ? 'border-yellow-500/40 bg-yellow-500/5' :
                'border-zinc-800/60'
              }`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      j.result === 'won' ? 'bg-emerald-500/20' :
                      j.result === 'lost' ? 'bg-red-500/20' :
                      j.result === 'bonus' ? 'bg-yellow-500/20' :
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
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>{j.result || 'pending'}</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        KES {j.price.toLocaleString()} • ${(j.regional_prices?.international?.price || 5.99).toLocaleString()} (Intl) • {j.matches.length} matches
                        {markedCount > 0 && <span className="ml-1">• <span className="text-emerald-400">{wonCount}W</span>/<span className="text-red-400">{lostCount}L</span></span>}
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

                {/* Expanded Match List with per-match results */}
                {isExpanded && (
                  <div className="mt-3 border border-zinc-800/60 rounded-xl overflow-hidden">
                    {j.matches.map((m, i) => (
                      <div key={i} className={`flex items-center px-3 py-2 text-sm border-b border-zinc-800/30 last:border-b-0 transition-colors ${
                        m.result === 'won' ? 'bg-emerald-500/5' : m.result === 'lost' ? 'bg-red-500/5' : 'hover:bg-zinc-800/20'
                      }`}>
                        <span className="w-6 text-zinc-500 text-xs">{i + 1}.</span>
                        <span className="flex-1 text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                          <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-sm" />
                          <span className="text-zinc-500 mx-1">vs</span>
                          <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-sm" />
                        </span>
                        <span className="text-yellow-400 font-bold text-xs w-10 text-center mr-2">{m.pick}</span>
                        {/* Per-match result buttons */}
                        <div className="flex items-center gap-1">
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
                        </div>
                      </div>
                    ))}
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
