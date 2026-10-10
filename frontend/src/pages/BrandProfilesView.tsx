import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  ExternalLink, 
  Smartphone, 
  Globe, 
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon,
  Key,
  Shield,
  Search
} from 'lucide-react';
import { Card, CardHeader, EmptyState } from '../components/SharedUI';
import { Brand, OfficialAsset } from '../types';
import { resolveAssetUrl } from '../services/api';

interface BrandProfilesProps {
  brands: Brand[];
  activeBrand: Brand | null;
  onSelectBrand: (brand: Brand) => void;
  onCreateBrand: (data: Partial<Brand>) => Promise<void>;
  onUpdateBrand: (brandId: number, data: Partial<Brand>) => Promise<void>;
  onDeleteBrand: (brandId: number) => Promise<void>;
  onAddAsset: (brandId: number, data: Partial<OfficialAsset>) => Promise<void>;
  onUpdateAsset: (assetId: number, data: Partial<OfficialAsset>) => Promise<void>;
  onDeleteAsset: (assetId: number) => Promise<void>;
  onUploadLogo: (brandId: number, file: File) => Promise<void>;
  onNavigateToScan: (brand: Brand) => void;
}

export function BrandProfilesView({
  brands,
  activeBrand,
  onSelectBrand,
  onCreateBrand,
  onUpdateBrand,
  onDeleteBrand,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onUploadLogo,
  onNavigateToScan,
}: BrandProfilesProps) {
  // Modals
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<OfficialAsset | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Brand Form State
  const [brandForm, setBrandForm] = useState({
    name: '',
    website: '',
    industry: '',
    description: '',
    keywords: '',
    aliases: '',
    logo_url: '',
    // multiple inline assets during creation
    initial_assets: [] as Partial<OfficialAsset>[],
  });

  // Inline asset addition inside Brand Create Modal
  const [inlineAsset, setInlineAsset] = useState({
    asset_type: 'social' as 'social' | 'mobile_app' | 'domain',
    platform: 'twitter',
    identifier: '',
    canonical_url: '',
    publisher_name: '',
  });

  // Asset Form State
  const [assetForm, setAssetForm] = useState({
    asset_type: 'social' as 'social' | 'mobile_app' | 'domain',
    platform: 'twitter',
    identifier: '',
    app_name: '',
    canonical_url: '',
    publisher_name: '',
    publisher_id: '',
    notes: '',
  });

  const validateUrl = (url?: string) => {
    if (!url || !url.trim()) return true;
    try {
      const u = new URL(url.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Open Create Modal
  const openCreateBrandModal = () => {
    setIsEditingBrand(false);
    setUrlError(null);
    setBrandForm({
      name: '',
      website: '',
      industry: '',
      description: '',
      keywords: '',
      aliases: '',
      logo_url: '',
      initial_assets: [],
    });
    setShowBrandModal(true);
  };

  // Open Edit Brand Modal
  const openEditBrandModal = (brand: Brand) => {
    setIsEditingBrand(true);
    setUrlError(null);
    setBrandForm({
      name: brand.name,
      website: brand.website || '',
      industry: brand.industry || '',
      description: brand.description || '',
      keywords: brand.keywords || '',
      aliases: brand.aliases || '',
      logo_url: brand.logo_url || '',
      initial_assets: [],
    });
    setShowBrandModal(true);
  };

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;

    if (brandForm.website && !validateUrl(brandForm.website)) {
      setUrlError('Website must be a valid URL starting with http:// or https://');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditingBrand && activeBrand) {
        await onUpdateBrand(activeBrand.id, {
          name: brandForm.name,
          website: brandForm.website,
          industry: brandForm.industry,
          description: brandForm.description,
          keywords: brandForm.keywords,
          aliases: brandForm.aliases,
        });
      } else {
        await onCreateBrand({
          name: brandForm.name,
          website: brandForm.website,
          industry: brandForm.industry,
          description: brandForm.description,
          keywords: brandForm.keywords,
          aliases: brandForm.aliases,
          official_assets: brandForm.initial_assets as any,
        });
      }
      setShowBrandModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInlineAsset = () => {
    if (!inlineAsset.identifier.trim()) return;
    if (inlineAsset.canonical_url && !validateUrl(inlineAsset.canonical_url)) {
      setUrlError('Asset URL must start with http:// or https://');
      return;
    }
    setUrlError(null);
    setBrandForm({
      ...brandForm,
      initial_assets: [
        ...brandForm.initial_assets,
        {
          ...inlineAsset,
          verified: false,
        },
      ],
    });
    setInlineAsset({
      asset_type: 'social',
      platform: 'twitter',
      identifier: '',
      canonical_url: '',
      publisher_name: '',
    });
  };

  const openAssetModal = (asset?: OfficialAsset) => {
    setUrlError(null);
    if (asset) {
      setEditingAsset(asset);
      setAssetForm({
        asset_type: asset.asset_type,
        platform: asset.platform,
        identifier: asset.identifier,
        app_name: asset.app_name || '',
        canonical_url: asset.canonical_url || '',
        publisher_name: asset.publisher_name || '',
        publisher_id: asset.publisher_id || '',
        notes: asset.notes || '',
      });
    } else {
      setEditingAsset(null);
      setAssetForm({
        asset_type: 'social',
        platform: 'twitter',
        identifier: '',
        app_name: '',
        canonical_url: '',
        publisher_name: '',
        publisher_id: '',
        notes: '',
      });
    }
    setShowAssetModal(true);
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand || !assetForm.identifier.trim()) return;

    if (assetForm.canonical_url && !validateUrl(assetForm.canonical_url)) {
      setUrlError('Canonical URL must start with http:// or https://');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAsset) {
        await onUpdateAsset(editingAsset.id, {
          ...assetForm,
          verified: editingAsset.verified,
        });
      } else {
        await onAddAsset(activeBrand.id, {
          ...assetForm,
          verified: false,
        });
      }
      setShowAssetModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Only JPEG, PNG, WEBP, or GIF images are permitted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setSubmitting(true);
    try {
      await onUploadLogo(activeBrand.id, file);
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              Registered Brand Assets
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
              SQLite Persisted
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Brand Profiles & Exclusion Registry</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Registered assets are treated as claimed official accounts for exclusion. Rakshak does not independently verify ownership, and exact registered matches are excluded from candidate findings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreateBrandModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#DC2626] hover:bg-[#991B1B] text-white rounded-lg text-xs font-semibold shadow-2xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Brand Profile</span>
          </button>
        </div>
      </div>

      {/* Brand Horizontal Selection Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelectBrand(b)}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-2.5 ${
              activeBrand?.id === b.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{b.name}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeBrand?.id === b.id ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {b.official_assets?.length || 0} Assets
            </span>
          </button>
        ))}
      </div>

      {activeBrand && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Brand Metadata Profile Card (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="relative group">
                  {activeBrand.logo_url ? (
                    <img
                      src={resolveAssetUrl(activeBrand.logo_url)}
                      alt={activeBrand.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 text-emerald-400 flex items-center justify-center font-bold text-xl border border-slate-200 shadow-2xs">
                      {activeBrand.name.charAt(0)}
                    </div>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload official brand logo for perceptual hash calculation"
                    className="absolute -bottom-1 -right-1 p-1 bg-white border border-slate-300 rounded-md text-slate-600 hover:text-[#DC2626] shadow-2xs transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditBrandModal(activeBrand)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    title="Edit Brand Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${activeBrand.name}"? This cascades to all assets, scans, and alerts.`)) {
                        onDeleteBrand(activeBrand.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-red-50 transition"
                    title="Delete Brand Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg text-slate-900">{activeBrand.name}</h3>
                <span className="text-xs text-slate-500 font-medium">
                  {activeBrand.industry || 'General Industry'}
                </span>
                {activeBrand.website && (
                  <div className="mt-1">
                    <a
                      href={activeBrand.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#DC2626] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{activeBrand.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block">Description</span>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {activeBrand.description || 'No corporate description registered.'}
                  </p>
                </div>

                {activeBrand.aliases && (
                  <div>
                    <span className="font-semibold text-slate-700 block">Official Aliases & Trade Names</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeBrand.aliases.split(',').map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          {a.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-slate-700 block">Monitored Keywords</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(activeBrand.keywords || '').split(',').filter(Boolean).map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-mono border border-slate-200">
                        {k.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {activeBrand.logo_hash && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Perceptual Logo Hash (dHash)
                    </span>
                    <span className="font-mono text-[11px] text-slate-700 truncate block mt-0.5">
                      {activeBrand.logo_hash}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => onNavigateToScan(activeBrand)}
                  className="w-full py-2 px-3 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Select Brand & Trigger Scan</span>
                </button>
              </div>
            </Card>
          </div>

          {/* Official Assets & Exclusion Registry (Right 8 cols) */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader
                title={`Official Exclusion Registry (${activeBrand.official_assets?.length || 0})`}
                subtitle="Registered assets are excluded from candidate findings. Registration does not verify ownership."
                action={
                  <button
                    onClick={() => openAssetModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] hover:bg-[#991B1B] text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Official Asset</span>
                  </button>
                }
              />

              <div className="divide-y divide-slate-100">
                {!activeBrand.official_assets || activeBrand.official_assets.length === 0 ? (
                  <div className="p-12">
                    <EmptyState
                      title="No Official Assets Registered"
                      description="Register official handles, store listings, and package IDs to exclude matching candidates from findings."
                      actionLabel="Register First Asset"
                      onAction={() => openAssetModal()}
                    />
                  </div>
                ) : (
                  activeBrand.official_assets.map((asset) => (
                    <div key={asset.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5 shrink-0">
                          {asset.asset_type === 'mobile_app' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : asset.asset_type === 'domain' ? (
                            <Globe className="w-4 h-4" />
                          ) : (
                            <Users className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 font-mono">
                              {asset.identifier}
                            </span>
                            {asset.app_name && (
                              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {asset.app_name}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Registered · ownership not verified</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="capitalize font-semibold text-slate-700">{asset.platform.replace('_', ' ')}</span>
                            {asset.publisher_name && (
                              <>
                                <span>•</span>
                                <span>Publisher: <strong className="text-slate-800">{asset.publisher_name}</strong></span>
                              </>
                            )}
                            {asset.canonical_url && (
                              <>
                                <span>•</span>
                                <a
                                  href={asset.canonical_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#DC2626] hover:underline inline-flex items-center gap-0.5 font-medium"
                                >
                                  <span>Canonical Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </>
                            )}
                          </div>

                          {asset.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-1">
                              &bull; {asset.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => openAssetModal(asset)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                          title="Edit Registered Asset"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${asset.identifier}" from exclusion registry?`)) {
                              onDeleteAsset(asset.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-red-50 transition"
                          title="Delete from exclusion registry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Brand Create / Edit Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isEditingBrand ? 'Edit Brand Profile' : 'Register New Brand Profile'}
                </h3>
                <p className="text-xs text-slate-500">Persisted securely in backend SQLite registry.</p>
              </div>
              <button onClick={() => setShowBrandModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBrandSubmit} className="p-6 space-y-4 overflow-y-auto">
              {urlError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ApexPay Global"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Official Website URL</label>
                  <input
                    type="url"
                    placeholder="https://apexpay.com"
                    value={brandForm.website}
                    onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Industry Sector</label>
                  <input
                    type="text"
                    placeholder="e.g. FinTech / Mobile Banking"
                    value={brandForm.industry}
                    onChange={(e) => setBrandForm({ ...brandForm, industry: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Official Aliases & Trade Names</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Pay, Apex Wallet, APX"
                    value={brandForm.aliases}
                    onChange={(e) => setBrandForm({ ...brandForm, aliases: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Description</label>
                <textarea
                  rows={2}
                  placeholder="Official public mission and service offerings..."
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Keywords for Threat Scanners (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. apexpay, apex, wallet, crypto, sendmoney"
                  value={brandForm.keywords}
                  onChange={(e) => setBrandForm({ ...brandForm, keywords: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              {/* Inline Asset Addition (only during new brand creation) */}
              {!isEditingBrand && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Initial Verified Assets ({brandForm.initial_assets.length})
                    </span>
                    <span className="text-[11px] text-slate-400">Added directly to exclusion registry</span>
                  </div>

                  {brandForm.initial_assets.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {brandForm.initial_assets.map((ast, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
                          <span className="font-mono font-semibold text-slate-800">{ast.identifier}</span>
                          <span className="text-[11px] text-slate-500 capitalize">{ast.platform}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={inlineAsset.platform}
                        onChange={(e) => setInlineAsset({ ...inlineAsset, platform: e.target.value })}
                        className="bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700"
                      >
                        <option value="twitter">X / Twitter</option>
                        <option value="instagram">Instagram</option>
                        <option value="telegram">Telegram</option>
                        <option value="google_play">Google Play</option>
                        <option value="apple_app_store">Apple App Store</option>
                        <option value="web">Web Domain</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Handle or Package ID"
                        value={inlineAsset.identifier}
                        onChange={(e) => setInlineAsset({ ...inlineAsset, identifier: e.target.value })}
                        className="bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Canonical URL (https://...)"
                        value={inlineAsset.canonical_url}
                        onChange={(e) => setInlineAsset({ ...inlineAsset, canonical_url: e.target.value })}
                        className="flex-1 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddInlineAsset}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold shrink-0"
                      >
                        + Add Asset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  {submitting ? 'Saving...' : isEditingBrand ? 'Update Profile' : 'Create Brand & Assets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Create / Edit Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingAsset ? 'Edit Whitelisted Asset' : 'Add Whitelisted Official Asset'}
                </h3>
                <p className="text-xs text-slate-500">
                  Added to the exclusion registry for {activeBrand?.name}.
                </p>
              </div>
              <button onClick={() => setShowAssetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssetSubmit} className="p-6 space-y-4">
              {urlError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Asset Type *</label>
                  <select
                    value={assetForm.asset_type}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="social">Social Media Handle</option>
                    <option value="mobile_app">Mobile App Package</option>
                    <option value="domain">Canonical Domain</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Platform *</label>
                  <select
                    value={assetForm.platform}
                    onChange={(e) => setAssetForm({ ...assetForm, platform: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="twitter">X / Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="telegram">Telegram</option>
                    <option value="google_play">Google Play</option>
                    <option value="apple_app_store">Apple App Store</option>
                    <option value="web">Web Domain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Identifier / Handle / Package ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @apexpay or com.apexpay.mobile or apexpay.com"
                  value={assetForm.identifier}
                  onChange={(e) => setAssetForm({ ...assetForm, identifier: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              {assetForm.asset_type === 'mobile_app' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Official App Title</label>
                  <input
                    type="text"
                    placeholder="e.g. ApexPay Mobile Banking"
                    value={assetForm.app_name}
                    onChange={(e) => setAssetForm({ ...assetForm, app_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Canonical Web URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={assetForm.canonical_url}
                  onChange={(e) => setAssetForm({ ...assetForm, canonical_url: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Developer / Publisher Name</label>
                <input
                  type="text"
                  placeholder="e.g. ApexPay Global Inc."
                  value={assetForm.publisher_name}
                  onChange={(e) => setAssetForm({ ...assetForm, publisher_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Internal Notes & Context</label>
                <input
                  type="text"
                  placeholder="e.g. Main corporate account"
                  value={assetForm.notes}
                  onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  {submitting ? 'Whitelisting...' : editingAsset ? 'Update Asset' : 'Save to Exclusion Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
