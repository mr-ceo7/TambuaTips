import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Link as LinkIcon, Image as ImageIcon, Eye, Play, Square } from 'lucide-react';
import { adminService, type AdPost } from '../../services/adminService';
import { toast } from 'sonner';

export function AdsManagePage() {
  const [ads, setAds] = useState<AdPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdPost | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('Promo');
  const [isActive, setIsActive] = useState(true);

  const fetchAds = async () => {
    try {
      const data = await adminService.getAds();
      setAds(data);
    } catch (err) {
      toast.error('Failed to load ad posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleOpenModal = (ad?: AdPost) => {
    if (ad) {
      setEditingAd(ad);
      setTitle(ad.title);
      setImageUrl(ad.image_url || '');
      setLinkUrl(ad.link_url || '');
      setCategory(ad.category);
      setIsActive(ad.is_active);
    } else {
      setEditingAd(null);
      setTitle('');
      setImageUrl('');
      setLinkUrl('');
      setCategory('Promo');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
        toast.error("Title is required");
        return;
    }

    try {
      const payload = {
        title,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        category,
        is_active: isActive
      };

      if (editingAd) {
        await adminService.updateAd(editingAd.id, payload);
        toast.success('Ad updated successfully');
      } else {
        await adminService.createAd(payload);
        toast.success('Ad created successfully');
      }
      setIsModalOpen(false);
      fetchAds();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save ad');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;
    try {
      await adminService.deleteAd(id);
      toast.success('Ad deleted');
      fetchAds();
    } catch (err) {
      toast.error('Failed to delete ad');
    }
  };

  const toggleActive = async (id: number, currentState: boolean) => {
    try {
      await adminService.updateAd(id, { is_active: !currentState });
      toast.success(`Ad ${!currentState ? 'activated' : 'deactivated'}`);
      fetchAds();
    } catch (err) {
      toast.error('Failed to toggle ad status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Manage Ads</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage custom promotional carousel slides</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2 text-sm max-w-fit"
        >
          <Plus className="w-4 h-4" /> Create Ad
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map(ad => (
          <div key={ad.id} className={`bg-zinc-900/60 border ${ad.is_active ? 'border-emerald-500/30' : 'border-zinc-800'} rounded-2xl overflow-hidden shadow-lg transition-all group`}>
            <div className="relative h-48 w-full bg-zinc-800">
               {ad.image_url ? (
                   <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
               ) : (
                   <div className="flex items-center justify-center h-full text-zinc-600">No Image</div>
               )}
               <div className="absolute top-3 left-3 flex gap-2">
                 <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md shadow-sm ${ad.is_active ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300'}`}>
                     {ad.is_active ? 'Active' : 'Inactive'}
                 </span>
                 <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-900/80 text-zinc-300 rounded-md backdrop-blur-sm border border-zinc-700/50">
                     {ad.category}
                 </span>
               </div>
            </div>
            
            <div className="p-5">
              <h3 className="font-bold text-white text-lg leading-tight mb-3 line-clamp-2">{ad.title}</h3>
              
              <div className="flex items-center gap-4 text-xs text-zinc-400 mb-5">
                {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                        <LinkIcon className="w-3.5 h-3.5" /> Target Link
                    </a>
                )}
                <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> {ad.image_url ? 'Has Image' : 'No Header'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
                <button
                    onClick={() => toggleActive(ad.id, ad.is_active)}
                    className={`flex items-center gap-1.5 text-xs font-bold ${ad.is_active ? 'text-zinc-400 hover:text-zinc-200' : 'text-emerald-500 hover:text-emerald-400'} transition-colors`}
                >
                    {ad.is_active ? <><Square className="w-3.5 h-3.5" /> Deactivate</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
                </button>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleOpenModal(ad)} className="text-zinc-400 hover:text-blue-400 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ad.id)} className="text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {ads.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                <Megaphone className="w-12 h-12 mb-4 text-zinc-700" />
                <p>No ad campaigns created yet.</p>
                <button onClick={() => handleOpenModal()} className="mt-4 text-emerald-500 font-medium hover:text-emerald-400">Create your first ad</button>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold font-display">{editingAd ? 'Edit Ad' : 'Create Ad'}</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Title Text</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Get Premium Tips!"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Target Link</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                  placeholder="/tips or https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Category Pill</label>
                    <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-emerald-500 transition-colors"
                    placeholder="Sponsored, Promo, etc"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Status</label>
                    <label className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 cursor-pointer hover:border-zinc-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded-md border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950 bg-zinc-900"
                        />
                        <span className="text-sm font-medium text-zinc-300">Active</span>
                    </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 text-zinc-950 text-sm font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {editingAd ? 'Save Changes' : 'Create Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
