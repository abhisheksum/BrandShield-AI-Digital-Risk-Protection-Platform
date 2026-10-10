import React, { useState, useRef } from 'react';
import {
  Shield,
  Building2,
  Upload,
  Users,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { createBrand, addOfficialAsset, uploadBrandLogo } from '../services/api';

interface BrandSetupWizardProps {
  onComplete: (brandId: number, runFirstScan: boolean) => void;
  onEdit: () => void;
}

const STEPS = [
  { id: 1, label: 'Organisation Info', icon: Building2 },
  { id: 2, label: 'Brand Logo', icon: ImageIcon },
  { id: 3, label: 'Social Accounts', icon: Users },
  { id: 4, label: 'Mobile Apps', icon: Smartphone },
  { id: 5, label: 'Review', icon: Check },
];

const PLATFORMS = ['twitter', 'instagram', 'linkedin', 'telegram', 'facebook', 'youtube'];
const APP_STORES = ['google_play', 'apple_app_store'];

export function BrandSetupWizard({ onComplete, onEdit }: BrandSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBrandId, setCreatedBrandId] = useState<number | null>(null);

  // Step 1 data
  const [brandInfo, setBrandInfo] = useState({
    name: '',
    website: '',
    industry: '',
    description: '',
    aliases: '',
  });

  // Step 2 data
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — social accounts
  const [socialAssets, setSocialAssets] = useState<Array<{
    platform: string; identifier: string; canonical_url: string;
  }>>([]);
  const [socialForm, setSocialForm] = useState({ platform: 'twitter', identifier: '', canonical_url: '' });

  // Step 4 — mobile apps
  const [appAssets, setAppAssets] = useState<Array<{
    platform: string; app_name: string; identifier: string; canonical_url: string; publisher_name: string;
  }>>([]);
  const [appForm, setAppForm] = useState({ platform: 'google_play', app_name: '', identifier: '', canonical_url: '', publisher_name: '' });

  const validateBrandInfo = () => {
    if (!brandInfo.name.trim()) {
      setError('Brand name is required');
      return false;
    }
    if (brandInfo.website && !/^https?:\/\//.test(brandInfo.website)) {
      setError('Website must start with http:// or https://');
      return false;
    }
    setError(null);
    return true;
  };

  const handleStep1Submit = async () => {
    if (!validateBrandInfo()) return;
    setLoading(true);
    try {
      const res = await createBrand({
        name: brandInfo.name.trim(),
        website: brandInfo.website.trim() || undefined,
        industry: brandInfo.industry.trim() || undefined,
        description: brandInfo.description.trim() || undefined,
        aliases: brandInfo.aliases.trim() || undefined,
        canonical_name: brandInfo.name.trim().toLowerCase(),
      });
      setCreatedBrandId(res.data.id);
      setStep(2);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create brand. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WEBP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleStep2Submit = async () => {
    if (logoFile && createdBrandId) {
      setLoading(true);
      try {
        await uploadBrandLogo(createdBrandId, logoFile);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Logo upload failed. You can upload it later from Brand Profile.');
        return;
      } finally {
        setLoading(false);
      }
    }
    setStep(3);
    setError(null);
  };

  const addSocial = () => {
    if (!socialForm.identifier.trim()) {
      setError('Handle / username is required');
      return;
    }
    setSocialAssets([...socialAssets, { ...socialForm }]);
    setSocialForm({ platform: 'twitter', identifier: '', canonical_url: '' });
    setError(null);
  };

  const addApp = () => {
    if (!appForm.app_name.trim()) {
      setError('App name is required');
      return;
    }
    setAppAssets([...appAssets, { ...appForm }]);
    setAppForm({ platform: 'google_play', app_name: '', identifier: '', canonical_url: '', publisher_name: '' });
    setError(null);
  };

  const handleStep3Submit = async () => {
    if (socialAssets.length > 0 && createdBrandId) {
      setLoading(true);
      try {
        await Promise.all(
          socialAssets.map((a) =>
            addOfficialAsset(createdBrandId, {
              asset_type: 'social',
              platform: a.platform,
              identifier: a.identifier.trim(),
              canonical_url: a.canonical_url.trim() || undefined,
              verified: false,
            })
          )
        );
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Could not save all official accounts. Review your entries and try again.');
        return;
      } finally {
        setLoading(false);
      }
    }
    setStep(4);
    setError(null);
  };

  const handleStep4Submit = async () => {
    if (appAssets.length > 0 && createdBrandId) {
      setLoading(true);
      try {
        await Promise.all(
          appAssets.map((a) =>
            addOfficialAsset(createdBrandId, {
              asset_type: 'mobile_app',
              platform: a.platform,
              app_name: a.app_name.trim(),
              identifier: a.identifier.trim() || a.app_name.trim(),
              canonical_url: a.canonical_url.trim() || undefined,
              publisher_name: a.publisher_name.trim() || undefined,
              verified: false,
            })
          )
        );
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Could not save all official apps. Review your entries and try again.');
        return;
      } finally {
        setLoading(false);
      }
    }
    if (createdBrandId) setStep(5);
  };

  const platformLabel = (p: string) =>
    ({
      twitter: 'X (Twitter)', instagram: 'Instagram', linkedin: 'LinkedIn',
      telegram: 'Telegram', facebook: 'Facebook', youtube: 'YouTube',
      google_play: 'Google Play', apple_app_store: 'Apple App Store',
    }[p] || p);

  return (
    <div className="min-h-screen bg-[#0B100E] text-slate-100 flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-[#166534] text-white flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <span className="font-extrabold text-slate-900 text-lg">Rakshak</span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                done
                  ? 'bg-[#166534] text-white'
                  : active
                  ? 'bg-[#dcfce7] text-[#166534] border border-[#86efac]'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Error */}
        {error && (
          <div className="m-6 mb-0 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Brand Info ── */}
        {step === 1 && (
          <div>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Step 1 of 5 — Organisation Information</h2>
              <p className="text-sm text-slate-500 mt-1">Tell us about your brand. This information helps calibrate detection.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={brandInfo.name}
                  onChange={(e) => setBrandInfo({ ...brandInfo, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Official Website <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://acmecorp.com"
                  value={brandInfo.website}
                  onChange={(e) => setBrandInfo({ ...brandInfo, website: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Industry <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. FinTech, Healthcare, E-commerce"
                  value={brandInfo.industry}
                  onChange={(e) => setBrandInfo({ ...brandInfo, industry: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Brand Description <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of your organisation and services..."
                  value={brandInfo.description}
                  onChange={(e) => setBrandInfo({ ...brandInfo, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Alternate Names / Abbreviations <span className="text-slate-400 font-normal text-xs">(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme, ACM, Acme Corp"
                  value={brandInfo.aliases}
                  onChange={(e) => setBrandInfo({ ...brandInfo, aliases: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]/20"
                />
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between items-center">
              <span className="text-xs text-slate-400">You can edit these details later.</span>
              <button
                onClick={handleStep1Submit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] text-white text-sm font-bold rounded-xl shadow transition disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? 'Saving…' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Logo ── */}
        {step === 2 && (
          <div>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Step 2 of 5 — Brand Logo</h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload your official logo. Rakshak uses it for visual similarity analysis against candidate findings.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#166534] hover:bg-[#f0fdf4] transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain rounded-xl border border-slate-200 shadow-sm" />
                    <span className="text-sm font-semibold text-[#166534]">Logo selected — click to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Upload className="w-10 h-10" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Click to upload your logo</p>
                      <p className="text-xs mt-1">JPEG, PNG, or WEBP — max 5 MB</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <strong>Note:</strong> The logo is used to calculate a perceptual fingerprint (dHash) for visual matching. This is a mathematical hash, not direct image comparison. Uploading is optional.
              </p>
            </div>
            <div className="p-6 pt-0 flex justify-between items-center">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] text-white text-sm font-bold rounded-xl shadow transition disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? 'Uploading…' : logoFile ? 'Upload & Continue' : 'Skip for now'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Social Accounts ── */}
        {step === 3 && (
          <div>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Step 3 of 5 — Official Social Accounts</h2>
              <p className="text-sm text-slate-500 mt-1">
                Add your legitimate accounts. These will be excluded from impersonation alerts.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* List of added accounts */}
              {socialAssets.length > 0 && (
                <div className="space-y-2">
                  {socialAssets.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#f0fdf4] border border-[#86efac] rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#166534]" />
                        <span className="font-mono font-semibold text-slate-800">{a.identifier}</span>
                        <span className="text-xs text-slate-500 capitalize">{platformLabel(a.platform)}</span>
                      </div>
                      <button onClick={() => setSocialAssets(socialAssets.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Account</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Platform</label>
                    <select
                      value={socialForm.platform}
                      onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>{platformLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Username / Handle <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="@yourbrand"
                      value={socialForm.identifier}
                      onChange={(e) => setSocialForm({ ...socialForm, identifier: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534] font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Profile URL <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="url"
                    placeholder="https://twitter.com/yourbrand"
                    value={socialForm.canonical_url}
                    onChange={(e) => setSocialForm({ ...socialForm, canonical_url: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
                  />
                </div>
                <button
                  type="button"
                  onClick={addSocial}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Account
                </button>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between items-center">
              <button onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleStep3Submit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] text-white text-sm font-bold rounded-xl shadow transition disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? 'Saving…' : socialAssets.length > 0 ? 'Save & Continue' : 'Skip for now'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Mobile Apps ── */}
        {step === 4 && (
          <div>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Step 4 of 5 — Official Mobile Apps</h2>
              <p className="text-sm text-slate-500 mt-1">
                Register official apps to exclude them from suspicious-app findings.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* List of added apps */}
              {appAssets.length > 0 && (
                <div className="space-y-2">
                  {appAssets.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#f0fdf4] border border-[#86efac] rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#166534]" />
                        <span className="font-semibold text-slate-800">{a.app_name}</span>
                        <span className="text-xs text-slate-500">{platformLabel(a.platform)}</span>
                      </div>
                      <button onClick={() => setAppAssets(appAssets.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add App</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Store / Platform</label>
                    <select
                      value={appForm.platform}
                      onChange={(e) => setAppForm({ ...appForm, platform: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
                    >
                      {APP_STORES.map((p) => (
                        <option key={p} value={p}>{platformLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">App Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Mobile Banking"
                      value={appForm.app_name}
                      onChange={(e) => setAppForm({ ...appForm, app_name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Package ID / App ID <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="com.acme.mobile"
                      value={appForm.identifier}
                      onChange={(e) => setAppForm({ ...appForm, identifier: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Publisher / Developer <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="Acme Inc."
                      value={appForm.publisher_name}
                      onChange={(e) => setAppForm({ ...appForm, publisher_name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Store Listing URL <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="url"
                    placeholder="https://play.google.com/store/apps/details?id=..."
                    value={appForm.canonical_url}
                    onChange={(e) => setAppForm({ ...appForm, canonical_url: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
                  />
                </div>
                <button
                  type="button"
                  onClick={addApp}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add App
                </button>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between items-center">
              <button onClick={() => setStep(3)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleStep4Submit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] text-white text-sm font-bold rounded-xl shadow transition disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? 'Finishing…' : appAssets.length > 0 ? 'Complete Setup' : 'Go to Dashboard'}
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="p-7 sm:p-9">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Step 5 of 5 — Review your brand profile</h2>
            <p className="mt-2 text-sm text-slate-600">{brandInfo.name} and the assets below were saved during setup. Review the details before opening your dashboard.</p>
            <div className="mt-5 rounded-xl border border-slate-200 divide-y divide-slate-100">
              <div className="px-4 py-3 flex justify-between gap-4 text-sm"><span className="text-slate-500">Brand</span><span className="font-medium text-slate-800 text-right break-words">{brandInfo.name}</span></div>
              <div className="px-4 py-3 flex justify-between gap-4 text-sm"><span className="text-slate-500">Website</span><span className="min-w-0 text-right font-medium text-slate-800 break-all">{brandInfo.website || 'Not added'}</span></div>
              <div className="px-4 py-3 flex justify-between gap-4 text-sm"><span className="text-slate-500">Industry</span><span className="min-w-0 text-right font-medium text-slate-800 break-words">{brandInfo.industry || 'Not added'}</span></div>
              <div className="px-4 py-3 flex justify-between text-sm"><span className="text-slate-500">Logo</span><span className="font-medium text-slate-800">{logoFile ? 'Uploaded' : 'Not added'}</span></div>
              <div className="px-4 py-3 flex justify-between text-sm"><span className="text-slate-500">Social accounts</span><span className="font-medium text-slate-800">{socialAssets.length} registered</span></div>
              <div className="px-4 py-3 flex justify-between text-sm"><span className="text-slate-500">Mobile apps</span><span className="font-medium text-slate-800">{appAssets.length} registered</span></div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Registering assets does not independently verify ownership. Risk scores prioritize investigation and are not proof of fraud.</p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <button onClick={onEdit} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Edit Brand Profile</button>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button onClick={() => createdBrandId && onComplete(createdBrandId, false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Go to Dashboard</button>
                <button onClick={() => createdBrandId && onComplete(createdBrandId, true)} className="px-4 py-2.5 bg-[#166534] text-white rounded-lg text-sm font-semibold">Run First Scan</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note */}
      <p className="mt-6 text-xs text-slate-400 max-w-md text-center leading-relaxed">
        Registering assets here does not constitute proof of ownership. Assets are used to guide detection
        and prevent your own accounts from appearing in findings.
      </p>
    </div>
  );
}
