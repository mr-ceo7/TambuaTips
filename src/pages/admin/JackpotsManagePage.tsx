import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Trophy, X } from 'lucide-react';
import {
  getAllJackpots, addJackpot, deleteJackpot,
  type JackpotPrediction, type JackpotType, type DCLevel, type JackpotMatch
} from '../../services/tipsService';
import { toast } from 'sonner';
import { TeamWithLogo } from '../../components/TeamLogo';

const DC_LEVELS: DCLevel[] = [3, 4, 5, 6, 7, 10];

export function JackpotsManagePage() {
  const [jackpots, setJackpots] = useState<JackpotPrediction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'midweek' as JackpotType,
    dcLevel: 3 as DCLevel,
    price: 500,
    matches: [] as JackpotMatch[],
  });
  const [matchInput, setMatchInput] = useState({ homeTeam: '', awayTeam: '', pick: '1X' });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = form.type === 'midweek' ? 13 : 17;
    if (form.matches.length !== expected) {
      toast.error(`${form.type === 'midweek' ? 'Midweek' : 'Mega'} jackpot requires exactly ${expected} matches. You have ${form.matches.length}.`);
      return;
    }
    await addJackpot(form);
    loadJackpots();
    setForm({ type: 'midweek', dcLevel: 3, price: 500, matches: [] });
    setShowForm(false);
    toast.success('Jackpot prediction published');
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
          <h3 className="text-lg font-bold text-white mb-4 font-display">Create Jackpot Prediction</h3>
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
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Price (KES)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="admin-input" />
              </div>
            </div>

            {/* Add Match */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">
                Matches ({form.matches.length}/{form.type === 'midweek' ? 13 : 17})
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input value={matchInput.homeTeam} onChange={e => setMatchInput({ ...matchInput, homeTeam: e.target.value })} placeholder="Home team" className="admin-input flex-1" />
                <input value={matchInput.awayTeam} onChange={e => setMatchInput({ ...matchInput, awayTeam: e.target.value })} placeholder="Away team" className="admin-input flex-1" />
                <select value={matchInput.pick} onChange={e => setMatchInput({ ...matchInput, pick: e.target.value })} className="admin-input w-20">
                  <option>1X</option><option>X2</option><option>12</option>
                </select>
                <button type="button" onClick={addMatchToJackpot} className="px-3 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {form.matches.length > 0 && (
                <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
                  {form.matches.map((m, i) => (
                    <div key={i} className="flex items-center px-3 py-2 text-sm border-b border-zinc-800/30 last:border-b-0 hover:bg-zinc-800/20 transition-colors">
                      <span className="w-6 text-zinc-500 text-xs">{i + 1}.</span>
                      <span className="flex-1 text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                        <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-sm" />
                        <span className="text-zinc-500">vs</span>
                        <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-sm" />
                      </span>
                      <span className="text-emerald-400 font-bold text-xs w-12 text-center">{m.pick}</span>
                      <button type="button" onClick={() => removeMatch(i)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" className="flex-1 py-2.5 bg-yellow-500 text-zinc-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm">
                Publish Jackpot
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm({ type: 'midweek', dcLevel: 3, price: 500, matches: [] }); }} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">
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
          jackpots.map(j => (
            <div key={j.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-200">{j.type === 'midweek' ? 'Midweek' : 'Mega'} • {j.dcLevel}DC</span>
                    <p className="text-xs text-zinc-500">KES {j.price.toLocaleString()} • {j.matches.length} matches</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{new Date(j.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => handleDelete(j.id)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
