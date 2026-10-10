import React, { useState } from 'react';
import { Plus, Trash2, Shield, Globe, Smartphone, CheckCircle, ExternalLink } from 'lucide-react';
import { createBrand, addOfficialAsset, deleteOfficialAsset, deleteBrand } from '../services/api';

export default function BrandManagement({ brands, activeBrand, onSelectBrand, onRefresh }) {
  const [showNewBrandModal, setShowNewBrandModal] = useState(false);
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  
  // Brand form state
  const [brandForm, setBrandForm] = useState({
    name: '',
    industry: '',
    description: '',
    keywords: '',
    logo_url: ''
  });

  // Asset form state
  const [assetForm, setAssetForm] = useState({
    asset_type: 'social',
    platform: 'twitter',
    identifier: '',
    canonical_url: '',
    publisher_name: '',
    verified: true
  });

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    try {
      await createBrand(brandForm);
      setBrandForm({ name: '', industry: '', description: '', keywords: '', logo_url: '' });
      setShowNewBrandModal(false);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create brand');
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!activeBrand) return;
    try {
      await addOfficialAsset(activeBrand.id, assetForm);
      setAssetForm({
        asset_type: 'social',
        platform: 'twitter',
        identifier: '',
        canonical_url: '',
        publisher_name: '',
        verified: true
      });
      setShowNewAssetModal(false);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add official asset');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Remove this official asset from the exclusion registry?')) return;
    try {
      await deleteOfficialAsset(assetId);
      onRefresh();
    } catch (err) {
      alert('Failed to delete asset');
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm('Delete brand profile and all associated telemetry?')) return;
    try {
      await deleteBrand(brandId);
      onRefresh();
    } catch (err) {
      alert('Failed to delete brand');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Brand & Asset Registry</h2>
          <p className="text-sm text-slate-400 mt-1">
            Register official brand identifiers to configure detection targets and guarantee exclusion of legitimate accounts.
          </p>
        </div>
        <button
          onClick={() => setShowNewBrandModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Register New Brand
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brand List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Registered Brands</h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              {brands.length} Total
            </span>
          </div>

          <div className="space-y-2">
            {brands.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectBrand(b)}
                className={`p-4 rounded-lg cursor-pointer transition border flex items-center justify-between ${
                  activeBrand?.id === b.id
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{b.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{b.industry || 'General Industry'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    {b.official_assets?.length || 0} Assets
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteBrand(b.id); }}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition rounded hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {brands.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                No brands registered yet. Click 'Register New Brand' above.
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Selected Brand Details & Official Assets */}
        <div className="lg:col-span-2 space-y-6">
          {activeBrand ? (
            <>
              {/* Brand Profile Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl">
                        {activeBrand.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{activeBrand.name}</h3>
                        <p className="text-xs text-slate-400">Canonical: <span className="font-mono text-slate-300">{activeBrand.canonical_name}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-850 p-2.5 rounded-lg border border-slate-800">
                    Perceptual Hash: <span className="font-mono text-indigo-300">{activeBrand.logo_hash?.slice(0, 19) || 'Synthetic-Active'}...</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 space-y-1">
                  <div><strong className="text-slate-400">Description:</strong> {activeBrand.description || 'None provided'}</div>
                  <div><strong className="text-slate-400">Keywords:</strong> {activeBrand.keywords || 'None specified'}</div>
                </div>
              </div>

              {/* Exclusion Registry (Official Assets) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Trusted Asset Exclusion Registry
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Assets listed here are automatically exempted from alerts even when high similarity is detected.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewAssetModal(true)}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Official Asset
                  </button>
                </div>

                <div className="divide-y divide-slate-800">
                  {activeBrand.official_assets?.map((asset) => (
                    <div key={asset.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {asset.asset_type === 'social' ? <Globe className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{asset.identifier}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Exempted
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="capitalize">{asset.platform}</span>
                            {asset.publisher_name && <span>• Pub: {asset.publisher_name}</span>}
                            {asset.canonical_url && (
                              <a href={asset.canonical_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-0.5">
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {(!activeBrand.official_assets || activeBrand.official_assets.length === 0) && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No official assets registered yet. Add handles or package IDs to prevent false-positive alerts.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              Select or register a brand to manage its official assets.
            </div>
          )}
        </div>
      </div>

      {/* Register Brand Modal */}
      {showNewBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Register New Brand Target</h3>
            <form onSubmit={handleCreateBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ApexPay"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Financial Services / FinTech"
                  value={brandForm.industry}
                  onChange={(e) => setBrandForm({ ...brandForm, industry: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Description / Bio</label>
                <textarea
                  rows="2"
                  placeholder="Official brand mission and service description used for similarity comparison"
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monitored Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. apex, apexpay, wallet, loan, transfer"
                  value={brandForm.keywords}
                  onChange={(e) => setBrandForm({ ...brandForm, keywords: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewBrandModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Official Asset Modal */}
      {showNewAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Add Official Asset for {activeBrand?.name}</h3>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Type</label>
                  <select
                    value={assetForm.asset_type}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="social">Social Media</option>
                    <option value="mobile_app">Mobile App</option>
                    <option value="domain">Domain / Web</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
                  <select
                    value={assetForm.platform}
                    onChange={(e) => setAssetForm({ ...assetForm, platform: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="twitter">X / Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="google_play">Google Play Store</option>
                    <option value="apple_app_store">Apple App Store</option>
                    <option value="web">Web Domain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Identifier / Handle / Package ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @apexpay or com.apexpay.mobile"
                  value={assetForm.identifier}
                  onChange={(e) => setAssetForm({ ...assetForm, identifier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Canonical URL</label>
                <input
                  type="url"
                  placeholder="https://twitter.com/apexpay"
                  value={assetForm.canonical_url}
                  onChange={(e) => setAssetForm({ ...assetForm, canonical_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Publisher Name</label>
                <input
                  type="text"
                  placeholder="e.g. ApexPay Inc."
                  value={assetForm.publisher_name}
                  onChange={(e) => setAssetForm({ ...assetForm, publisher_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewAssetModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
