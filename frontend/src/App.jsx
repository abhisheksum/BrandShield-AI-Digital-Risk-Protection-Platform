import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Building2, 
  Globe, 
  Smartphone, 
  AlertTriangle, 
  RefreshCw,
  Bell
} from 'lucide-react';

import OverviewDashboard from './pages/OverviewDashboard';
import BrandManagement from './pages/BrandManagement';
import SocialMonitoring from './pages/SocialMonitoring';
import AppMonitoring from './pages/AppMonitoring';
import AlertInvestigation from './pages/AlertInvestigation';
import EvidenceModal from './components/EvidenceModal';

import { getBrands, getAlerts, getScans, updateAlertStatus, createBrand, addOfficialAsset } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlertForEvidence, setSelectedAlertForEvidence] = useState(null);

  // Initialize and load brands/alerts/scans
  const loadData = async () => {
    try {
      setLoading(true);
      const brandsRes = await getBrands();
      let currentBrands = brandsRes.data;

      // Seed default demo brand if completely empty on first launch
      if (currentBrands.length === 0) {
        const seedBrandRes = await createBrand({
          name: 'ApexPay',
          industry: 'Financial Technology / Global Banking',
          description: 'Official infrastructure and digital wallet services for next-generation mobile payments.',
          keywords: 'apexpay, apex, wallet, crypto, send money, payment',
          logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80'
        });
        const createdB = seedBrandRes.data;
        // Register official legitimate assets in exclusion registry
        await addOfficialAsset(createdB.id, {
          asset_type: 'social',
          platform: 'twitter',
          identifier: '@apexpay',
          canonical_url: 'https://twitter.com/apexpay',
          publisher_name: 'ApexPay Inc.',
          verified: true
        });
        await addOfficialAsset(createdB.id, {
          asset_type: 'mobile_app',
          platform: 'google_play',
          identifier: 'com.apexpay.mobile',
          canonical_url: 'https://play.google.com/store/apps/details?id=com.apexpay.mobile',
          publisher_name: 'ApexPay Technologies Inc.',
          verified: true
        });
        const freshBrands = await getBrands();
        currentBrands = freshBrands.data;
      }

      setBrands(currentBrands);
      const selected = activeBrand ? currentBrands.find(b => b.id === activeBrand.id) || currentBrands[0] : currentBrands[0];
      setActiveBrand(selected);

      if (selected) {
        const [alertsRes, scansRes] = await Promise.all([
          getAlerts({ brand_id: selected.id }),
          getScans(selected.id)
        ]);
        setAlerts(alertsRes.data);
        setScans(scansRes.data);
      }
    } catch (err) {
      console.error('Error fetching telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectBrand = (brand) => {
    setActiveBrand(brand);
    // Refresh alerts for new brand
    getAlerts({ brand_id: brand.id }).then(res => setAlerts(res.data));
    getScans(brand.id).then(res => setScans(res.data));
  };

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      const res = await updateAlertStatus(alertId, { status: newStatus });
      setAlerts(prev => prev.map(a => a.id === alertId ? res.data : a));
      if (selectedAlertForEvidence?.id === alertId) {
        setSelectedAlertForEvidence(res.data);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      {/* Top Security Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">BrandShield<span className="text-indigo-400">AI</span></span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                  v1.0.0 SOC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Digital Risk Protection & Impersonation Defense</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>FastAPI Engine Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview Dashboard
          </button>

          <button
            onClick={() => setActiveTab('brands')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'brands'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Brands & Exclusion Assets
          </button>

          <button
            onClick={() => setActiveTab('social')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'social'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Globe className="w-4 h-4" />
            Social Monitoring
          </button>

          <button
            onClick={() => setActiveTab('apps')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'apps'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            App Store Monitoring
          </button>

          <button
            onClick={() => setActiveTab('investigation')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'investigation'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Alert Triage & Evidence ({alerts.length})
          </button>
        </div>

        {/* Dynamic Page Views */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <OverviewDashboard
              brands={brands}
              activeBrand={activeBrand}
              alerts={alerts}
              scans={scans}
              onSelectBrand={handleSelectBrand}
              onInspectAlert={setSelectedAlertForEvidence}
            />
          )}

          {activeTab === 'brands' && (
            <BrandManagement
              brands={brands}
              activeBrand={activeBrand}
              onSelectBrand={handleSelectBrand}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'social' && (
            <SocialMonitoring
              activeBrand={activeBrand}
              alerts={alerts}
              scans={scans}
              onRefresh={loadData}
              onInspectAlert={setSelectedAlertForEvidence}
            />
          )}

          {activeTab === 'apps' && (
            <AppMonitoring
              activeBrand={activeBrand}
              alerts={alerts}
              scans={scans}
              onRefresh={loadData}
              onInspectAlert={setSelectedAlertForEvidence}
            />
          )}

          {activeTab === 'investigation' && (
            <AlertInvestigation
              alerts={alerts}
              onInspectAlert={setSelectedAlertForEvidence}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </div>
      </div>

      {/* Structured Evidence Investigation Modal */}
      {selectedAlertForEvidence && (
        <EvidenceModal
          alert={selectedAlertForEvidence}
          onClose={() => setSelectedAlertForEvidence(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
