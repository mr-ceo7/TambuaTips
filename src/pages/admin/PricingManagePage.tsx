import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Star } from 'lucide-react';
import { getPricingTiers, updatePricingTier, addPricingTier, deletePricingTier, type TierConfig, CATEGORY_LABELS } from '../../services/pricingService';
import type { TipCategory } from '../../services/tipsService';
import { toast } from 'sonner';

const TIP_CATEGORIES: TipCategory[] = ['free', '2+', '4+', 'gg', '10+', 'vip'];

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  basic: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
  standard: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
  premium: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400' },
};

export function PricingManagePage() {
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState({ price2wk: 0, price4wk: 0, int2wk: 0, int4wk: 0 });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({
    tier_id: '', name: '', description: '',
    price2wk: 99, price4wk: 199,
    categories: ['free'] as TipCategory[],
    popular: false,
  });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = () => {
    getPricingTiers().then(setTiers);
  };

  const startEdit = (tier: TierConfig) => {
    setEditingTier(tier.id);
    const rp = tier.regional_prices?.international || {};
    setTierForm({ 
      price2wk: tier.price2wk, 
      price4wk: tier.price4wk,
      int2wk: rp.price_2wk || 0,
      int4wk: rp.price_4wk || 0
    });
  };

  const saveEdit = async (tierId: string) => {
    const originalTier = tiers.find(t => t.id === tierId);
    if (!originalTier) return;
    
    const updatedRegionalPrices = {
      ...(originalTier.regional_prices || {}),
      international: { price_2wk: tierForm.int2wk, price_4wk: tierForm.int4wk }
    };
    
    await updatePricingTier(tierId, {
      price2wk: tierForm.price2wk,
      price4wk: tierForm.price4wk,
      regional_prices: updatedRegionalPrices
    });
    loadTiers();
    setEditingTier(null);
    toast.success('Pricing updated');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.tier_id || !newForm.name) {
      toast.error('Tier ID and Name are required');
      return;
    }
    const result = await addPricingTier(newForm as any);
    if (result) {
      loadTiers();
      setShowNewForm(false);
      setNewForm({ tier_id: '', name: '', description: '', price2wk: 99, price4wk: 199, categories: ['free'], popular: false });
      toast.success('New plan created');
    }
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm(`Delete the ${tierId} plan?`)) return;
    const success = await deletePricingTier(tierId);
    if (success) {
      loadTiers();
      toast.success('Plan deleted');
    }
  };

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Pricing Plans</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage subscription pricing. Changes reflect immediately.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* ─── New Tier Form ───────────────────────────────── */}
      {showNewForm && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 font-display">Create Subscription Plan</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Tier ID <span className="text-emerald-400">*</span></label>
              <input value={newForm.tier_id} onChange={e => setNewForm({ ...newForm, tier_id: e.target.value })} placeholder="e.g. gold-plan" className="admin-input" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Display Name <span className="text-emerald-400">*</span></label>
              <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="e.g. Gold VIP" className="admin-input" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">2 Weeks Price (KES)</label>
              <input type="number" value={newForm.price2wk} onChange={e => setNewForm({ ...newForm, price2wk: parseInt(e.target.value) || 0 })} className="admin-input" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">4 Weeks Price (KES)</label>
              <input type="number" value={newForm.price4wk} onChange={e => setNewForm({ ...newForm, price4wk: parseInt(e.target.value) || 0 })} className="admin-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">Included Categories</label>
              <div className="flex flex-wrap gap-2">
                {TIP_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const cats = newForm.categories.includes(cat)
                        ? newForm.categories.filter(c => c !== cat)
                        : [...newForm.categories, cat];
                      setNewForm({ ...newForm, categories: cats });
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                      newForm.categories.includes(cat) ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]?.label || cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" id="isPopularNew" checked={newForm.popular} onChange={e => setNewForm({ ...newForm, popular: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
              <label htmlFor="isPopularNew" className="text-sm text-zinc-300">Highlight as "Popular"</label>
            </div>
            <div className="sm:col-span-2 flex gap-3 mt-2">
              <button type="submit" className="flex-1 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">Create Plan</button>
              <button type="button" onClick={() => setShowNewForm(false)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Tier Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {tiers.map(tier => {
          const colors = TIER_COLORS[tier.id] || { bg: 'bg-zinc-900/60', border: 'border-zinc-800/60', text: 'text-zinc-400' };
          return (
            <div key={tier.id} className={`${colors.bg} border ${colors.border} rounded-2xl p-5 transition-all hover:scale-[1.01]`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-lg font-bold ${colors.text} font-display`}>{tier.name}</h4>
                    {tier.popular && (
                      <span className="bg-emerald-500 text-emerald-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Popular</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {tier.categories.filter(c => c !== 'free').map(c => CATEGORY_LABELS[c]?.label).join(', ')}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {editingTier === tier.id ? (
                    <>
                      <button onClick={() => saveEdit(tier.id)} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTier(null)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(tier)} className="p-1.5 bg-zinc-800/60 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tier.id)} className="p-1.5 bg-zinc-800/60 text-zinc-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingTier === tier.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Local 2W (KES)</label>
                      <input type="number" value={tierForm.price2wk} onChange={e => setTierForm({ ...tierForm, price2wk: parseInt(e.target.value) || 0 })} className="admin-input py-1.5 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Local 4W (KES)</label>
                      <input type="number" value={tierForm.price4wk} onChange={e => setTierForm({ ...tierForm, price4wk: parseInt(e.target.value) || 0 })} className="admin-input py-1.5 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Intl 2W (USD)</label>
                      <input type="number" step="0.01" value={tierForm.int2wk} onChange={e => setTierForm({ ...tierForm, int2wk: parseFloat(e.target.value) || 0 })} className="admin-input py-1.5 px-3 text-sm border-blue-500/30 bg-blue-500/5 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Intl 4W (USD)</label>
                      <input type="number" step="0.01" value={tierForm.int4wk} onChange={e => setTierForm({ ...tierForm, int4wk: parseFloat(e.target.value) || 0 })} className="admin-input py-1.5 px-3 text-sm border-blue-500/30 bg-blue-500/5 focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end justify-between bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Local Prices (KES)</span>
                      <div className="flex gap-4 mt-1">
                        <div><span className="text-white font-bold">{tier.price2wk.toLocaleString()}</span> <span className="text-[10px] text-zinc-500">/ 2W</span></div>
                        <div><span className="text-white font-bold">{tier.price4wk.toLocaleString()}</span> <span className="text-[10px] text-zinc-500">/ 4W</span></div>
                      </div>
                    </div>
                  </div>
                  
                  {(tier.regional_prices?.international?.price_2wk || tier.regional_prices?.international?.price_4wk) && (
                    <div className="flex items-end justify-between bg-blue-500/5 p-2.5 rounded-xl border border-blue-500/20">
                      <div>
                        <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Intl Override (USD)</span>
                        <div className="flex gap-4 mt-1">
                          {tier.regional_prices.international.price_2wk && <div><span className="text-white font-bold">${tier.regional_prices.international.price_2wk}</span> <span className="text-[10px] text-zinc-500">/ 2W</span></div>}
                          {tier.regional_prices.international.price_4wk && <div><span className="text-white font-bold">${tier.regional_prices.international.price_4wk}</span> <span className="text-[10px] text-zinc-500">/ 4W</span></div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
