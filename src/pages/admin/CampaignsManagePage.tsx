import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calendar, Gem, Play, Square, Presentation, Upload, X, Image, Video, Sparkles, Gift, Palette, Monitor } from 'lucide-react';
import { adminService, uploadCampaignAsset, type Campaign } from '../../services/adminService';
import { toast } from 'sonner';

function FileDropZone({ label, accept, currentUrl, onUploaded }: {
  label: string;
  accept: string;
  currentUrl: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadCampaignAsset(file);
      onUploaded(url);
      toast.success(`${label} uploaded successfully`);
    } catch (err) {
      toast.error(`Failed to upload ${label}`);
    } finally {
      setUploading(false);
    }
  }, [label, onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isVideo = accept.includes('video');
  const Icon = isVideo ? Video : Image;

  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-400">Uploading...</span>
          </div>
        ) : currentUrl ? (
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs text-zinc-300 truncate flex-1 text-left">{currentUrl}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onUploaded(''); }} className="text-zinc-500 hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="w-6 h-6 text-zinc-500" />
            <span className="text-xs text-zinc-500">Drop file here or <span className="text-emerald-400 font-medium">click to browse</span></span>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }} />
      </div>
      {/* Also allow pasting a URL manually */}
      <input
        type="text"
        value={currentUrl}
        onChange={e => onUploaded(e.target.value)}
        className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
        placeholder="or paste a URL..."
      />
    </div>
  );
}

function ToggleSwitch({ label, icon: Icon, checked, onChange }: {
  label: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 cursor-pointer hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 ${checked ? 'text-emerald-400' : 'text-zinc-500'}`} />
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export function CampaignsManagePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  // Form State
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [incentiveType, setIncentiveType] = useState('extra_days');
  const [incentiveValue, setIncentiveValue] = useState(15);
  const [assetVideoUrl, setAssetVideoUrl] = useState('');
  const [assetImageUrl, setAssetImageUrl] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [isActive, setIsActive] = useState(true);

  // New visual config state
  const [themeColorHex, setThemeColorHex] = useState('');
  const [useSplashScreen, setUseSplashScreen] = useState(false);
  const [useFloatingBadge, setUseFloatingBadge] = useState(false);
  const [useParticleEffects, setUseParticleEffects] = useState(false);
  const [useCustomIcons, setUseCustomIcons] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const data = await adminService.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleOpenModal = (c?: Campaign) => {
    if (c) {
      setEditingCampaign(c);
      setSlug(c.slug);
      setTitle(c.title);
      setDescription(c.description || '');
      setStartDate(c.start_date.split('.')[0]);
      setEndDate(c.end_date.split('.')[0]);
      setIncentiveType(c.incentive_type);
      setIncentiveValue(c.incentive_value);
      setAssetVideoUrl(c.asset_video_url || '');
      setAssetImageUrl(c.asset_image_url || '');
      setOgImageUrl(c.og_image_url || '');
      setBannerText(c.banner_text || '');
      setIsActive(c.is_active);
      setThemeColorHex(c.theme_color_hex || '');
      setUseSplashScreen(c.use_splash_screen || false);
      setUseFloatingBadge(c.use_floating_badge || false);
      setUseParticleEffects(c.use_particle_effects || false);
      setUseCustomIcons(c.use_custom_icons || false);
    } else {
      setEditingCampaign(null);
      setSlug('');
      setTitle('');
      setDescription('');
      
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      
      setStartDate(now.toISOString().slice(0, 16));
      setEndDate(nextWeek.toISOString().slice(0, 16));
      
      setIncentiveType('extra_days');
      setIncentiveValue(15);
      setAssetVideoUrl('');
      setAssetImageUrl('');
      setOgImageUrl('');
      setBannerText('');
      setIsActive(true);
      setThemeColorHex('');
      setUseSplashScreen(false);
      setUseFloatingBadge(false);
      setUseParticleEffects(false);
      setUseCustomIcons(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !startDate || !endDate) {
        toast.error("Please fill all required fields");
        return;
    }

    try {
      const payload = {
        slug,
        title,
        description: description || null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        incentive_type: incentiveType,
        incentive_value: incentiveValue,
        asset_video_url: assetVideoUrl || null,
        asset_image_url: assetImageUrl || null,
        og_image_url: ogImageUrl || null,
        banner_text: bannerText || null,
        is_active: isActive,
        theme_color_hex: themeColorHex || null,
        use_splash_screen: useSplashScreen,
        use_floating_badge: useFloatingBadge,
        use_particle_effects: useParticleEffects,
        use_custom_icons: useCustomIcons,
      };

      if (editingCampaign) {
        await adminService.updateCampaign(editingCampaign.id, payload);
        toast.success('Campaign updated successfully');
      } else {
        await adminService.createCampaign(payload);
        toast.success('Campaign created successfully');
      }
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save campaign');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await adminService.deleteCampaign(id);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  const toggleActive = async (id: number, currentState: boolean) => {
    try {
      await adminService.updateCampaign(id, { is_active: !currentState });
      toast.success(`Campaign ${!currentState ? 'activated' : 'deactivated'}`);
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to toggle campaign status');
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
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Manage Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Schedule and configure dynamic promotional campaigns</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2 text-sm max-w-fit"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.map(c => {
          const featureCount = [c.use_splash_screen, c.use_floating_badge, c.use_particle_effects, c.use_custom_icons].filter(Boolean).length;
          return (
          <div key={c.id} className={`bg-zinc-900/60 border ${c.is_active ? 'border-emerald-500/30' : 'border-zinc-800'} rounded-2xl overflow-hidden shadow-lg transition-all group p-5`}>
            
            <div className="flex justify-between items-start mb-4">
                <div>
                   <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-md shadow-sm mb-2 ${c.is_active ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                   </span>
                   <h3 className="font-bold text-white text-lg leading-tight">{c.title}</h3>
                   <div className="text-xs text-zinc-500 font-mono mt-1">/{c.slug}</div>
                </div>
                <div className="text-right flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">
                    <Gem className="w-3.5 h-3.5" />
                    {c.incentive_type === 'extra_days' ? `+${c.incentive_value} Days` : `${c.incentive_value}% Off`}
                </div>
            </div>
            
            <div className="space-y-3 mb-4 text-sm">
                <div className="flex items-center gap-3 text-zinc-400">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <div>
                        <div className="text-xs">Start: <span className="text-zinc-200">{new Date(c.start_date).toLocaleString()}</span></div>
                        <div className="text-xs">End: <span className="text-zinc-200">{new Date(c.end_date).toLocaleString()}</span></div>
                    </div>
                </div>
                {c.banner_text && (
                   <div className="text-xs bg-zinc-950 p-2 rounded text-zinc-300 border border-zinc-800">
                      <strong>Banner:</strong> {c.banner_text}
                   </div>
                )}
            </div>

            {/* Visual Features badges */}
            {featureCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {c.use_splash_screen && <span className="text-[9px] font-bold uppercase bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">Splash</span>}
                {c.use_floating_badge && <span className="text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">Badge</span>}
                {c.use_particle_effects && <span className="text-[9px] font-bold uppercase bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">Particles</span>}
                {c.use_custom_icons && <span className="text-[9px] font-bold uppercase bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded-full">Icons</span>}
                {c.theme_color_hex && (
                  <span className="text-[9px] font-bold uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.theme_color_hex }} />
                    Theme
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
              <button
                  onClick={() => toggleActive(c.id, c.is_active)}
                  className={`flex items-center gap-1.5 text-xs font-bold ${c.is_active ? 'text-zinc-400 hover:text-zinc-200' : 'text-emerald-500 hover:text-emerald-400'} transition-colors`}
              >
                  {c.is_active ? <><Square className="w-3.5 h-3.5" /> Deactivate</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
              </button>
              <div className="flex items-center gap-3">
                  <button onClick={() => handleOpenModal(c)} className="text-zinc-400 hover:text-blue-400 transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </div>
          </div>
          );
        })}

        {campaigns.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                <Presentation className="w-12 h-12 mb-4 text-zinc-700" />
                <p>No campaigns created yet.</p>
                <button onClick={() => handleOpenModal()} className="mt-4 text-emerald-500 font-medium hover:text-emerald-400">Launch a campaign</button>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl">
            <div className="sticky top-0 bg-zinc-900/90 backdrop-blur-md p-4 sm:p-6 border-b border-zinc-800 z-10">
              <h2 className="text-xl font-bold font-display">{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Campaign Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="e.g. Easter Special 15 Years"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="e.g. easter-15"
                    />
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  placeholder="A short description of this campaign..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Start Date *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">End Date *</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
              </div>

              <div className="p-4 bg-zinc-950/50 border border-emerald-500/20 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-emerald-400 mb-2">Incentive Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Type</label>
                        <select 
                            value={incentiveType}
                            onChange={(e) => setIncentiveType(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        >
                            <option value="extra_days">+ Extra Days (Subscriptions)</option>
                            <option value="discount">% Discount (Subscriptions)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Value</label>
                        <input
                        type="number"
                        required
                        value={incentiveValue}
                        onChange={e => setIncentiveValue(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="e.g. 15"
                        />
                    </div>
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Top Banner Text</label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={e => setBannerText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="🐰 Easter Special: Celebrating 15 Years of Wins!"
                />
              </div>

              {/* Assets with File Upload */}
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Media Assets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileDropZone
                      label="Campaign Video"
                      accept="video/*"
                      currentUrl={assetVideoUrl}
                      onUploaded={setAssetVideoUrl}
                    />
                    <FileDropZone
                      label="Campaign Image"
                      accept="image/*"
                      currentUrl={assetImageUrl}
                      onUploaded={setAssetImageUrl}
                    />
                  </div>
                  <FileDropZone
                    label="Social Share (OG) Image"
                    accept="image/*"
                    currentUrl={ogImageUrl}
                    onUploaded={setOgImageUrl}
                  />
              </div>

              {/* Visual Effects Toggles */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Visual Effects</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ToggleSwitch label="Splash Screen" icon={Monitor} checked={useSplashScreen} onChange={setUseSplashScreen} />
                  <ToggleSwitch label="Floating Badge" icon={Gift} checked={useFloatingBadge} onChange={setUseFloatingBadge} />
                  <ToggleSwitch label="Particle Effects" icon={Sparkles} checked={useParticleEffects} onChange={setUseParticleEffects} />
                  <ToggleSwitch label="Custom Icons" icon={Gem} checked={useCustomIcons} onChange={setUseCustomIcons} />
                </div>
              </div>

              {/* Theme Color Picker */}
              <div className="pt-2 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3"><Palette className="w-4 h-4" /> Theme Color</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={themeColorHex || '#10b981'}
                    onChange={e => setThemeColorHex(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-zinc-700 bg-transparent"
                  />
                  <input
                    type="text"
                    value={themeColorHex}
                    onChange={e => setThemeColorHex(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="#EAB308 (leave blank for default)"
                  />
                  {themeColorHex && (
                    <button type="button" onClick={() => setThemeColorHex('')} className="text-xs text-zinc-500 hover:text-red-400">Clear</button>
                  )}
                </div>
              </div>

              <div>
                  <ToggleSwitch label="Campaign Active" icon={Play} checked={isActive} onChange={setIsActive} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
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
                  {editingCampaign ? 'Save Changes' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
