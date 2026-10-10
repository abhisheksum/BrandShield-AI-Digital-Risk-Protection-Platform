import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Navigation, 
  NavTab 
} from './components/Navigation';
import { OverviewView } from './pages/OverviewView';
import { BrandProfilesView } from './pages/BrandProfilesView';
import { SocialMonitoringView } from './pages/SocialMonitoringView';
import { AppMonitoringView } from './pages/AppMonitoringView';
import { ThreatDetailsView } from './pages/ThreatDetailsView';
import { ScanHistoryView } from './pages/ScanHistoryView';
import { SettingsView } from './pages/SettingsView';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { BrandSetupWizard } from './pages/BrandSetupWizard';

import {
  AppUser,
  Brand,
  ThreatAlert,
  ScanAudit,
  OfficialAsset,
  AlertStatus
} from './types';
import { getMe } from './services/api';
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
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>(() =>
    localStorage.getItem('rakshak_token') ? 'login' : 'landing'
  );
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try { return JSON.parse(localStorage.getItem('rakshak_user') || 'null') as AppUser | null; } catch { return null; }
  });
  const [needsBrandSetup, setNeedsBrandSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core Platform State
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const activeBrandIdRef = useRef<number | null>(null);
  const brandDataRequestRef = useRef(0);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [scans, setScans] = useState<ScanAudit[]>([]);

  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [scanning, setScanning] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    setNotificationMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setNotificationMessage(null);
      toastTimeoutRef.current = null;
    }, 3500);
  };

  const setActiveBrandScope = (brand: Brand | null) => {
    activeBrandIdRef.current = brand?.id ?? null;
    brandDataRequestRef.current += 1;
    setActiveBrand(brand);
    setAlerts([]);
    setScans([]);
  };

  const refreshBrandData = useCallback(async (brandId: number) => {
    const requestId = ++brandDataRequestRef.current;
    const [alertsRes, scansRes] = await Promise.all([
      getAlerts({ brand_id: brandId }),
      getScans(brandId),
    ]);
    // Ignore a slow response after the user has switched to another brand.
    if (activeBrandIdRef.current !== brandId || brandDataRequestRef.current !== requestId) return;
    setAlerts(alertsRes.data || []);
    setScans(scansRes.data || []);
  }, []);

  // Sync with the API, selecting and refreshing the requested brand by ID.
  const syncPlatformData = useCallback(async (preferredBrandId?: number): Promise<Brand | null> => {
    try {
      const healthRes = await getHealth().catch(() => null);
      const isHealthy = healthRes && (healthRes.data?.status === 'healthy' || healthRes.status === 200);
      setBackendHealthy(Boolean(isHealthy));

      if (!isHealthy) return null;

      const brandsRes = await getBrands();
      const nextBrands: Brand[] = brandsRes.data || [];
      setBrands(nextBrands);
      if (nextBrands.length === 0) {
        setActiveBrandScope(null);
        setNeedsBrandSetup(true);
        return null;
      }

      setNeedsBrandSetup(false);
      const current = preferredBrandId !== undefined
        ? nextBrands.find((brand) => brand.id === preferredBrandId)
        : nextBrands.find((brand) => brand.id === activeBrandIdRef.current) || nextBrands[0];
      if (!current) {
        setActiveBrandScope(null);
        return null;
      }
      if (activeBrandIdRef.current !== current.id) setActiveBrandScope(current);
      else setActiveBrand(current);
      await refreshBrandData(current.id);
      return current;
    } catch (err) {
      console.warn('Rakshak backend is unavailable; saved results could not be refreshed:', err);
      setBackendHealthy(false);
      return null;
    }
  }, [refreshBrandData]);

  useEffect(() => {
    if (!localStorage.getItem('rakshak_token')) return;
    getMe().then((res) => {
      setCurrentUser(res.data);
      return syncPlatformData();
    }).catch(() => {
      localStorage.removeItem('rakshak_token');
      localStorage.removeItem('rakshak_user');
      setCurrentUser(null);
      setAuthMode('landing');
    });
  }, [syncPlatformData]);

  // Handlers for Brand Operations
  const handleSelectBrand = (brand: Brand) => {
    setActiveBrandScope(brand);
    showToast(`Switched active scope to ${brand.name}`);
    if (backendHealthy) {
      refreshBrandData(brand.id).catch((err) => {
        console.error('Failed to load selected brand data:', err);
        showToast('Could not load this brand’s findings. Check the backend connection and retry.');
      });
    } else {
      showToast('Backend unavailable. Reconnect the Rakshak API to load saved findings and scan history.');
    }
  };

  const handleCreateBrand = async (brandData: Partial<Brand>) => {
    if (backendHealthy) {
      try {
        const res = await createBrand(brandData);
        const createdBrand = await syncPlatformData(res.data.id);
        if (!createdBrand) throw new Error('Brand was created, but its saved data could not be loaded. Reconnect the backend and refresh.');
        showToast(`Created brand "${createdBrand.name}" in SQLite`);
        return;
      } catch (err: any) {
        console.error('API createBrand failed:', err);
        showToast(err.response?.data?.detail || err.message || 'Failed to create brand on backend');
      }
    }
    throw new Error('Rakshak needs an available backend to save brand profiles. Reconnect the backend and retry.');
  };

  const handleUpdateBrand = async (brandId: number, brandData: Partial<Brand>) => {
    if (backendHealthy) {
      try {
        const res = await updateBrand(brandId, brandData);
        await syncPlatformData(brandId);
        showToast(`Updated brand "${res.data.name}"`);
        return;
      } catch (err: any) {
        console.error('API updateBrand failed:', err);
        showToast(err.response?.data?.detail || 'Failed to update brand profile');
      }
    }
    throw new Error('Rakshak needs an available backend to update brand profiles.');
  };

  const handleDeleteBrand = async (brandId: number) => {
    if (backendHealthy) {
      try {
        await deleteBrand(brandId);
        const preferredBrandId = activeBrandIdRef.current === brandId ? undefined : activeBrandIdRef.current ?? undefined;
        await syncPlatformData(preferredBrandId);
        showToast(`Brand and associated assets removed from database`);
        return;
      } catch (err: any) {
        console.error('API deleteBrand failed:', err);
      }
    }
    throw new Error('Rakshak needs an available backend to remove brand profiles.');
  };

  const handleUploadLogo = async (brandId: number, file: File) => {
    if (backendHealthy) {
      try {
        await uploadBrandLogo(brandId, file);
        await syncPlatformData(brandId);
        showToast(`Uploaded official brand logo & computed perceptual dHash`);
        return;
      } catch (err: any) {
        console.error('Logo upload error:', err);
        showToast(err.response?.data?.detail || 'Failed to upload logo.');
      }
    }
    throw new Error('Rakshak needs an available backend to store the official logo.');
  };

  // Official Asset Operations
  const handleAddAsset = async (brandId: number, assetData: Partial<OfficialAsset>) => {
    if (backendHealthy) {
      try {
        await addOfficialAsset(brandId, assetData);
        await syncPlatformData(brandId);
        showToast(`Whitelisted official asset in exclusion registry`);
        return;
      } catch (err: any) {
        console.error('API addOfficialAsset failed:', err);
        showToast(err.response?.data?.detail || 'Failed to add asset');
      }
    }
    throw new Error('Rakshak needs an available backend to register official assets.');
  };

  const handleUpdateAsset = async (assetId: number, assetData: Partial<OfficialAsset>) => {
    if (backendHealthy) {
      try {
        await updateOfficialAsset(assetId, assetData);
        await syncPlatformData(activeBrandIdRef.current ?? undefined);
        showToast(`Updated verified asset details`);
        return;
      } catch (err: any) {
        console.error('API updateOfficialAsset failed:', err);
      }
    }
    throw new Error('Rakshak needs an available backend to update official assets.');
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (backendHealthy) {
      try {
        await deleteOfficialAsset(assetId);
        await syncPlatformData(activeBrandIdRef.current ?? undefined);
        showToast(`Asset removed from exclusion list`);
        return;
      } catch (err: any) {
        console.error('API deleteOfficialAsset failed:', err);
      }
    }
    throw new Error('Rakshak needs an available backend to remove official assets.');
  };

  // Handlers for Triggering Scans
  const handleTriggerScan = async (
    scanType: 'all' | 'social' | 'app_store' = 'all',
    useDemoData = false,
    requestedBrand?: Brand,
  ) => {
    const targetBrand = requestedBrand || brands.find((brand) => brand.id === activeBrandIdRef.current) || activeBrand;
    if (!targetBrand) {
      showToast('Select or register a brand before starting a scan.');
      return;
    }
    if (!backendHealthy) {
      showToast('Scan unavailable: reconnect the Rakshak backend (check the API service and VITE_API_URL), then retry. No scan results were created.');
      return;
    }

    setScanning(true);
    showToast(`Executing ${useDemoData ? 'explicit demo' : 'configured live-source'} ${scanType.replace('_', ' ')} scan for ${targetBrand.name}...`);
    try {
      const response = await triggerScan({
        brand_id: targetBrand.id,
        scan_type: scanType,
        use_demo_data: useDemoData,
      });
      const scan = response.data;
      const sourceDetails = Object.entries(scan.source_summary || {}).map(([name, value]: [string, any]) =>
        `${value.collector_name || name}: ${value.status}${value.is_demo ? ' (DEMO)' : ''}, ${value.candidates_count ?? 0} candidates`
      ).join('; ') || 'No source status returned';
      await syncPlatformData(scan.brand_id);
      const provenance = scan.is_demo
        ? 'DEMO data'
        : useDemoData
        ? 'demo mode requested; no synthetic source data returned'
        : 'live-source request';
      showToast(
        `Scan ${scan.status} · ${provenance} · ${scan.candidates_evaluated ?? 0} evaluated · ${scan.alerts_generated ?? 0} findings · ${scan.official_assets_excluded ?? 0} official assets excluded · ${sourceDetails}`
      );
    } catch (err: any) {
      console.error('Scan execution error:', err);
      const detail = err.response?.data?.detail;
      showToast(detail
        ? `Scan failed: ${detail}`
        : 'Scan failed: cannot reach the Rakshak backend. Check the API service and VITE_API_URL, reconnect, and retry. No synthetic results were used.');
    } finally {
      setScanning(false);
    }
  };

  // Manual Social Candidate Submission
  const handleSubmitManualCandidate = async (candidateData: any) => {
    if (backendHealthy) {
      const res = await submitManualCandidate(candidateData);
      await syncPlatformData(candidateData.brand_id);
      showToast(`Candidate scored: ${res.data.risk_score}/100 (${res.data.severity})`);
      return;
    }
    throw new Error('Manual candidates require the backend scoring service.');
  };

  const handleImportCsv = async (file: File) => {
    const brandId = activeBrandIdRef.current;
    if (!brandId) return;
    if (backendHealthy) {
      const res = await importCandidatesCsv(brandId, file);
      await syncPlatformData(brandId);
      showToast(res.data.message || 'CSV candidates imported and evaluated.');
      return;
    }
    throw new Error('CSV import requires the backend scoring service.');
  };

  // Select-Brand-Before-Scan Flow
  const handleNavigateToScan = (brand: Brand) => {
    handleSelectBrand(brand);
    setActiveTab('overview');
    void handleTriggerScan('all', false, brand);
  };

  const handleCompleteBrandSetup = async (brandId: number, runFirstScan: boolean) => {
    setNeedsBrandSetup(false);
    setActiveTab('overview');
    const createdBrand = await syncPlatformData(brandId);
    if (runFirstScan && createdBrand) await handleTriggerScan('all', false, createdBrand);
    else if (runFirstScan) showToast('Brand was saved. Reconnect the backend to load it and run the first scan.');
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

  const handleAuthSuccess = async (_token: string, user: AppUser) => {
    setCurrentUser(user);
    setAuthMode('landing');
    try {
      const response = await getBrands();
      if (!response.data?.length) setNeedsBrandSetup(true);
      else setNeedsBrandSetup(false);
      await syncPlatformData();
    } catch {
      setNeedsBrandSetup(true);
      showToast('Could not load your brand profile. Check that the Rakshak backend is running.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rakshak_token');
    localStorage.removeItem('rakshak_user');
    setCurrentUser(null);
    setBrands([]);
    setActiveBrandScope(null);
    setNeedsBrandSetup(false);
    setAuthMode('landing');
  };

  if (!currentUser) {
    if (authMode === 'login' || authMode === 'register') {
      return <AuthPage mode={authMode} onSuccess={handleAuthSuccess} onBack={() => setAuthMode('landing')} onSwitchMode={setAuthMode} />;
    }
    return <LandingPage onLogin={() => setAuthMode('login')} onRegister={() => setAuthMode('register')} />;
  }

  if (needsBrandSetup) {
    return <BrandSetupWizard
      onComplete={handleCompleteBrandSetup}
      onEdit={async () => { setNeedsBrandSetup(false); setActiveTab('brands'); await syncPlatformData(); }}
    />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      {notificationMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
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
          void syncPlatformData();
        }}
        backendHealthy={backendHealthy}
        alertCount={alerts.filter((a) => a.status === 'new').length}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      currentUser={currentUser}
      onLogout={handleLogout}
      />

      <main className="lg:ml-64 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
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
                  onTriggerSocialScan={() => handleTriggerScan('social')}
                  onTriggerAppScan={() => handleTriggerScan('app_store')}
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
                  scans={scans}
                  onInspectAlert={handleInspectAlert}
                  onTriggerScan={(useDemoData = false) => handleTriggerScan('social', useDemoData)}
                  onSubmitManualCandidate={handleSubmitManualCandidate}
                  onImportCsv={handleImportCsv}
                  scanning={scanning}
                />
              )}

              {activeTab === 'apps' && (
                <AppMonitoringView
                  activeBrand={activeBrand}
                  alerts={alerts}
                  scans={scans}
                  onInspectAlert={handleInspectAlert}
                  onTriggerScan={(useDemoData = false) => handleTriggerScan('app_store', useDemoData)}
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
        </div>
      </main>
    </div>
  );
}
