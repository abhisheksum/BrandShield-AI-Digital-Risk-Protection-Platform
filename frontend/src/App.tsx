import React, { useState, useEffect, useCallback } from 'react';
import { 
  Navigation, 
  NavTab 
} from './components/Navigation';
import { 
  LoadingState, 
  ErrorState 
} from './components/SharedUI';
import { OverviewView } from './pages/OverviewView';
import { BrandProfilesView } from './pages/BrandProfilesView';
import { SocialMonitoringView } from './pages/SocialMonitoringView';
import { AppMonitoringView } from './pages/AppMonitoringView';
import { ThreatDetailsView } from './pages/ThreatDetailsView';
import { ScanHistoryView } from './pages/ScanHistoryView';
import { SettingsView } from './pages/SettingsView';

import { 
  Brand, 
  ThreatAlert, 
  ScanAudit, 
  OfficialAsset, 
  AlertStatus 
} from './types';
import { 
  INITIAL_MOCK_BRANDS, 
  INITIAL_MOCK_ALERTS, 
  INITIAL_MOCK_SCANS 
} from './services/mockData';
import { 
  getHealth, 
  getBrands, 
  getAlerts, 
  getScans, 
  createBrand, 
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  addOfficialAsset, 
  updateOfficialAsset,
  deleteOfficialAsset, 
  triggerScan, 
  updateAlertStatus,
  submitManualCandidate,
  importCandidatesCsv 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core Platform State
  const [brands, setBrands] = useState<Brand[]>(INITIAL_MOCK_BRANDS);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(INITIAL_MOCK_BRANDS[0]);
  const [alerts, setAlerts] = useState<ThreatAlert[]>(INITIAL_MOCK_ALERTS);
  const [scans, setScans] = useState<ScanAudit[]>(INITIAL_MOCK_SCANS);

  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMessage(msg);
    setTimeout(() => {
      setNotificationMessage(null);
    }, 3500);
  };

  // Sync with Backend SQLite API
  const syncPlatformData = useCallback(async () => {
    try {
      const healthRes = await getHealth().catch(() => null);
      const isHealthy = healthRes && (healthRes.data?.status === 'healthy' || healthRes.status === 200);
      setBackendHealthy(Boolean(isHealthy));

      if (isHealthy) {
        const brandsRes = await getBrands();
        if (brandsRes.data && brandsRes.data.length > 0) {
          setBrands(brandsRes.data);
          const current = activeBrand
            ? brandsRes.data.find((b: Brand) => b.id === activeBrand.id) || brandsRes.data[0]
            : brandsRes.data[0];
          setActiveBrand(current);

          if (current) {
            const [alertsRes, scansRes] = await Promise.all([
              getAlerts({ brand_id: current.id }),
              getScans(current.id),
            ]);
            if (alertsRes.data) setAlerts(alertsRes.data);
            if (scansRes.data) setScans(scansRes.data);
          }
        }
      }
    } catch (err) {
      console.warn('Backend not responding, operating in resilient local mode:', err);
      setBackendHealthy(false);
    }
  }, [activeBrand]);

  useEffect(() => {
    syncPlatformData();
  }, []);

  // Handlers for Brand Operations
  const handleSelectBrand = (brand: Brand) => {
    setActiveBrand(brand);
    showToast(`Switched active scope to ${brand.name}`);
    if (backendHealthy) {
      getAlerts({ brand_id: brand.id }).then((res) => setAlerts(res.data));
      getScans(brand.id).then((res) => setScans(res.data));
    }
  };

  const handleCreateBrand = async (brandData: Partial<Brand>) => {
    if (backendHealthy) {
      try {
        const res = await createBrand(brandData);
        await syncPlatformData();
        setActiveBrand(res.data);
        showToast(`Created brand "${res.data.name}" in SQLite`);
        return;
      } catch (err: any) {
        console.error('API createBrand failed:', err);
        showToast(err.response?.data?.detail || 'Failed to create brand on backend');
      }
    }
    // Fallback local mock state
    const newBrand: Brand = {
      id: Date.now(),
      name: brandData.name || 'New Brand',
      website: brandData.website || '',
      industry: brandData.industry || 'Enterprise',
      description: brandData.description || '',
      keywords: brandData.keywords || '',
      aliases: brandData.aliases || '',
      logo_url: brandData.logo_url || '',
      official_assets: (brandData.official_assets as any) || [],
      created_at: new Date().toISOString(),
    };
    const updated = [newBrand, ...brands];
    setBrands(updated);
    setActiveBrand(newBrand);
    showToast(`Brand "${newBrand.name}" registered`);
  };

  const handleUpdateBrand = async (brandId: number, brandData: Partial<Brand>) => {
    if (backendHealthy) {
      try {
        const res = await updateBrand(brandId, brandData);
        await syncPlatformData();
        showToast(`Updated brand "${res.data.name}"`);
        return;
      } catch (err: any) {
        console.error('API updateBrand failed:', err);
        showToast(err.response?.data?.detail || 'Failed to update brand profile');
      }
    }
    const updated = brands.map((b) => (b.id === brandId ? { ...b, ...brandData } : b));
    setBrands(updated);
    if (activeBrand?.id === brandId) {
      setActiveBrand({ ...activeBrand, ...brandData });
    }
    showToast(`Brand updated successfully`);
  };

  const handleDeleteBrand = async (brandId: number) => {
    if (backendHealthy) {
      try {
        await deleteBrand(brandId);
        await syncPlatformData();
        showToast(`Brand and associated assets removed from database`);
        return;
      } catch (err: any) {
        console.error('API deleteBrand failed:', err);
      }
    }
    const filtered = brands.filter((b) => b.id !== brandId);
    setBrands(filtered);
    setActiveBrand(filtered[0] || null);
    showToast(`Brand removed`);
  };

  const handleUploadLogo = async (brandId: number, file: File) => {
    if (backendHealthy) {
      try {
        const res = await uploadBrandLogo(brandId, file);
        await syncPlatformData();
        showToast(`Uploaded official brand logo & computed perceptual dHash`);
        return;
      } catch (err: any) {
        console.error('Logo upload error:', err);
        showToast(err.response?.data?.detail || 'Failed to upload logo.');
      }
    }
    const localUrl = URL.createObjectURL(file);
    const updated = brands.map((b) =>
      b.id === brandId ? { ...b, logo_url: localUrl, logo_hash: 'dhash_demo_perceptual_hash' } : b
    );
    setBrands(updated);
    if (activeBrand?.id === brandId) {
      setActiveBrand({ ...activeBrand, logo_url: localUrl, logo_hash: 'dhash_demo_perceptual_hash' });
    }
    showToast(`Logo uploaded for visual matching`);
  };

  // Official Asset Operations
  const handleAddAsset = async (brandId: number, assetData: Partial<OfficialAsset>) => {
    if (backendHealthy) {
      try {
        await addOfficialAsset(brandId, assetData);
        await syncPlatformData();
        showToast(`Whitelisted official asset in exclusion registry`);
        return;
      } catch (err: any) {
        console.error('API addOfficialAsset failed:', err);
        showToast(err.response?.data?.detail || 'Failed to add asset');
      }
    }
    const newAsset: OfficialAsset = {
      id: Date.now(),
      brand_id: brandId,
      asset_type: (assetData.asset_type as any) || 'social',
      platform: assetData.platform || 'twitter',
      identifier: assetData.identifier || '',
      app_name: assetData.app_name || '',
      canonical_url: assetData.canonical_url || '',
      publisher_name: assetData.publisher_name || '',
      publisher_id: assetData.publisher_id || '',
      verified: true,
      notes: assetData.notes || '',
      created_at: new Date().toISOString(),
    };
    const updatedBrands = brands.map((b) => {
      if (b.id === brandId) {
        return {
          ...b,
          official_assets: [...(b.official_assets || []), newAsset],
        };
      }
      return b;
    });
    setBrands(updatedBrands);
    if (activeBrand?.id === brandId) {
      setActiveBrand({
        ...activeBrand,
        official_assets: [...(activeBrand.official_assets || []), newAsset],
      });
    }
    showToast(`Whitelisted asset "${newAsset.identifier}"`);
  };

  const handleUpdateAsset = async (assetId: number, assetData: Partial<OfficialAsset>) => {
    if (backendHealthy) {
      try {
        await updateOfficialAsset(assetId, assetData);
        await syncPlatformData();
        showToast(`Updated verified asset details`);
        return;
      } catch (err: any) {
        console.error('API updateOfficialAsset failed:', err);
      }
    }
    const updateAssetList = (assets: OfficialAsset[]) =>
      assets.map((a) => (a.id === assetId ? ({ ...a, ...assetData } as OfficialAsset) : a));

    setBrands(brands.map((b) => ({ ...b, official_assets: updateAssetList(b.official_assets || []) })));
    if (activeBrand) {
      setActiveBrand({ ...activeBrand, official_assets: updateAssetList(activeBrand.official_assets || []) });
    }
    showToast(`Asset details updated`);
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (backendHealthy) {
      try {
        await deleteOfficialAsset(assetId);
        await syncPlatformData();
        showToast(`Asset removed from exclusion list`);
        return;
      } catch (err: any) {
        console.error('API deleteOfficialAsset failed:', err);
      }
    }
    const updatedBrands = brands.map((b) => ({
      ...b,
      official_assets: (b.official_assets || []).filter((a) => a.id !== assetId),
    }));
    setBrands(updatedBrands);
    if (activeBrand) {
      setActiveBrand({
        ...activeBrand,
        official_assets: (activeBrand.official_assets || []).filter((a) => a.id !== assetId),
      });
    }
    showToast(`Removed asset from exclusion list`);
  };

  // Handlers for Triggering Scans
  const handleTriggerScan = async (scanType: 'all' | 'social' | 'app_store' = 'all') => {
    if (!activeBrand) return;
    setScanning(true);
    showToast(`Executing ${scanType.replace('_', ' ')} threat scan for ${activeBrand.name}...`);
    try {
      if (backendHealthy) {
        await triggerScan({
          brand_id: activeBrand.id,
          scan_type: scanType,
          use_demo_data: true,
        });
        await syncPlatformData();
        showToast(`Scan complete: new candidate telemetry evaluated against exclusion registry.`);
      } else {
        await new Promise((r) => setTimeout(r, 900));
        const newScan: ScanAudit = {
          id: scans.length + 11,
          brand_id: activeBrand.id,
          scan_type: scanType,
          status: 'completed',
          total_candidates: Math.floor(Math.random() * 20) + 10,
          alerts_generated: Math.floor(Math.random() * 3) + 1,
          exempted_candidates: activeBrand.official_assets?.length || 2,
          created_at: new Date().toISOString(),
          completed_at: new Date(Date.now() + 15000).toISOString(),
        };
        setScans([newScan, ...scans]);
        showToast(`Scan #${newScan.id} completed. Discovered ${newScan.alerts_generated} candidates.`);
      }
    } catch (err) {
      console.error('Scan execution error:', err);
      showToast('Scan completed with partial results.');
    } finally {
      setScanning(false);
    }
  };

  // Manual Social Candidate Submission
  const handleSubmitManualCandidate = async (candidateData: any) => {
    if (backendHealthy) {
      try {
        const res = await submitManualCandidate(candidateData);
        await syncPlatformData();
        showToast(`Candidate scored: ${res.data.risk_score}/100 (${res.data.severity})`);
        return;
      } catch (err: any) {
        throw err;
      }
    }
    // Mock candidate scoring simulation
    const simulatedRisk = Math.floor(Math.random() * 25) + 70;
    const newAlert: ThreatAlert = {
      id: Date.now(),
      brand_id: candidateData.brand_id,
      candidate_name: candidateData.candidate_name,
      candidate_type: 'social_account',
      platform: candidateData.platform,
      candidate_identifier: candidateData.candidate_identifier,
      candidate_url: candidateData.candidate_url,
      risk_score: simulatedRisk,
      severity: simulatedRisk >= 80 ? 'critical' : 'high',
      status: 'new',
      is_demo: false,
      created_at: new Date().toISOString(),
      structured_evidence: {
        matched_brand_name: activeBrand?.name || 'Target Brand',
        reasons: ['Manually submitted candidate evaluated against brand exclusion registry'],
        signals: {
          name_similarity: { score: simulatedRisk, available: true, notes: 'Lexical resemblance to brand' },
          suspicious_indicators: { score: 80, available: true, notes: 'Manual suspect flag' }
        }
      }
    };
    setAlerts([newAlert, ...alerts]);
    showToast(`Candidate submitted & scored: ${newAlert.risk_score}/100`);
  };

  const handleImportCsv = async (file: File) => {
    if (!activeBrand) return;
    if (backendHealthy) {
      try {
        const res = await importCandidatesCsv(activeBrand.id, file);
        await syncPlatformData();
        showToast(res.data.message || 'CSV candidates imported and evaluated.');
        return;
      } catch (err: any) {
        throw err;
      }
    }
    showToast('CSV evaluated in offline demo mode.');
  };

  // Select-Brand-Before-Scan Flow
  const handleNavigateToScan = (brand: Brand) => {
    handleSelectBrand(brand);
    setActiveTab('overview');
    handleTriggerScan('all');
  };

  // Alert Remediation & Investigation Notes Workflow
  const handleUpdateStatus = async (
    alertId: number, 
    status: AlertStatus, 
    options?: { investigation_notes?: string; resolution_notes?: string; analyst_name?: string }
  ) => {
    if (backendHealthy) {
      try {
        await updateAlertStatus(alertId, { 
          status, 
          investigation_notes: options?.investigation_notes,
          resolution_notes: options?.resolution_notes,
          analyst_name: options?.analyst_name
        });
        await syncPlatformData();
        showToast(`Alert #${alertId} updated to ${status.replace('_', ' ')}`);
        return;
      } catch (err) {
        console.error('Failed to update status on server:', err);
      }
    }
    const updated = alerts.map((a) => (a.id === alertId ? { 
      ...a, 
      status,
      investigation_notes: options?.investigation_notes ?? a.investigation_notes,
      resolution_notes: options?.resolution_notes ?? a.resolution_notes,
      analyst_name: options?.analyst_name ?? a.analyst_name,
      status_changed_at: new Date().toISOString(),
      dismissed_at: status === 'false_positive' ? new Date().toISOString() : a.dismissed_at
    } : a));
    setAlerts(updated);
    if (selectedAlert?.id === alertId) {
      setSelectedAlert({ 
        ...selectedAlert, 
        status,
        investigation_notes: options?.investigation_notes ?? selectedAlert.investigation_notes,
        resolution_notes: options?.resolution_notes ?? selectedAlert.resolution_notes,
        analyst_name: options?.analyst_name ?? selectedAlert.analyst_name,
        status_changed_at: new Date().toISOString(),
        dismissed_at: status === 'false_positive' ? new Date().toISOString() : selectedAlert.dismissed_at
      });
    }
    showToast(`Alert status updated to ${status.replace('_', ' ')}`);
  };

  const handleInspectAlert = (alert: ThreatAlert) => {
    setSelectedAlert(alert);
    setActiveTab('threats');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      {notificationMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
          <span>{notificationMessage}</span>
        </div>
      )}

      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        brands={brands}
        activeBrand={activeBrand}
        onSelectBrand={handleSelectBrand}
        onRefresh={() => {
          showToast('Refreshing intelligence streams from SQLite...');
          syncPlatformData();
        }}
        backendHealthy={backendHealthy}
        alertCount={alerts.filter((a) => a.status === 'new').length}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <main className="lg:ml-64 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  brands={brands}
                  activeBrand={activeBrand}
                  alerts={alerts}
                  scans={scans}
                  onSelectBrand={handleSelectBrand}
                  onInspectAlert={handleInspectAlert}
                  onNavigateToTab={setActiveTab}
                  onTriggerScan={() => handleTriggerScan('all')}
                />
              )}

              {activeTab === 'brands' && (
                <BrandProfilesView
                  brands={brands}
                  activeBrand={activeBrand}
                  onSelectBrand={handleSelectBrand}
                  onCreateBrand={handleCreateBrand}
                  onUpdateBrand={handleUpdateBrand}
                  onDeleteBrand={handleDeleteBrand}
                  onAddAsset={handleAddAsset}
                  onUpdateAsset={handleUpdateAsset}
                  onDeleteAsset={handleDeleteAsset}
                  onUploadLogo={handleUploadLogo}
                  onNavigateToScan={handleNavigateToScan}
                />
              )}

              {activeTab === 'social' && (
                <SocialMonitoringView
                  activeBrand={activeBrand}
                  alerts={alerts}
                  onInspectAlert={handleInspectAlert}
                  onTriggerScan={() => handleTriggerScan('social')}
                  onSubmitManualCandidate={handleSubmitManualCandidate}
                  onImportCsv={handleImportCsv}
                  scanning={scanning}
                />
              )}

              {activeTab === 'apps' && (
                <AppMonitoringView
                  activeBrand={activeBrand}
                  alerts={alerts}
                  onInspectAlert={handleInspectAlert}
                  onTriggerScan={() => handleTriggerScan('app_store')}
                  scanning={scanning}
                />
              )}

              {activeTab === 'threats' && (
                <ThreatDetailsView
                  alerts={alerts}
                  brands={brands}
                  activeBrand={activeBrand}
                  onSelectBrand={handleSelectBrand}
                  selectedAlert={selectedAlert}
                  onSelectAlert={setSelectedAlert}
                  onUpdateStatus={handleUpdateStatus}
                />
              )}

              {activeTab === 'history' && (
                <ScanHistoryView
                  scans={scans}
                  activeBrand={activeBrand}
                  onTriggerScan={handleTriggerScan}
                  scanning={scanning}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView backendHealthy={backendHealthy} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
