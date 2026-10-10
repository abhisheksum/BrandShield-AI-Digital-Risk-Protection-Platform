import React, { useState } from 'react';
import { 
  Smartphone, 
  Search, 
  Play, 
  Package, 
  ExternalLink, 
  RotateCcw, 
  ShieldAlert, 
  Layers
} from 'lucide-react';
import { Card, CardHeader, RiskBadge, StatusBadge, SourceBadge, EmptyState } from '../components/SharedUI';
import { Brand, ScanAudit, ThreatAlert } from '../types';

function getAlertSource(alert: ThreatAlert): 'demo' | 'manual' | 'live' | 'unavailable' {
  const sourceType = alert.structured_evidence?.source_type;
  if (alert.is_demo || sourceType === 'demo_data') return 'demo';
  if (sourceType === 'manual_submission' || sourceType === 'csv_import') return 'manual';
  if (sourceType === 'live_source') return 'live';
  return 'unavailable';
}

interface AppMonitoringProps {
  activeBrand: Brand | null;
  alerts: ThreatAlert[];
  scans: ScanAudit[];
  onInspectAlert: (alert: ThreatAlert) => void;
  onTriggerScan: (useDemoData?: boolean) => Promise<void>;
  scanning: boolean;
}

export function AppMonitoringView({
  activeBrand,
  alerts,
  scans,
  onInspectAlert,
  onTriggerScan,
  scanning,
}: AppMonitoringProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const appAlerts = alerts.filter((a) => a.candidate_type === 'mobile_app');
  const latestAppScan = scans.find((scan) => scan.scan_type === 'app_store' || scan.scan_type === 'all');
  const appSource = Object.entries(latestAppScan?.source_summary || {})
    .find(([name, source]) => `${name} ${source.collector_name}`.toLowerCase().includes('apple') || `${name} ${source.collector_name}`.toLowerCase().includes('appstore'))?.[1];

  const filtered = appAlerts.filter((a) => {
    const matchSearch =
      a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.candidate_identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.publisher_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStore = storeFilter === 'all' || a.platform.toLowerCase().includes(storeFilter.toLowerCase());
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    return matchSearch && matchStore && matchSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              App Monitoring
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
              Apple App Store live • Google Play demo only
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Suspicious App Store Monitoring</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Live app searches use Apple's iTunes Search API in the configured country. Google Play is not connected and appears only in explicitly selected synthetic demo scans. A similar name or different publisher alone does not prove malicious intent.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void onTriggerScan(false)}
            disabled={scanning}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xs transition ${
              scanning
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#991B1B] hover:bg-[#7F1D1D] text-white'
            }`}
          >
            {scanning ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{scanning ? 'Running scan...' : 'Search Apple App Store'}</span>
          </button>
          <button
            onClick={() => void onTriggerScan(true)}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Run App Demo
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search app title, package ID, or publisher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#DC2626] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="min-w-0 flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Marketplaces</option>
              <option value="google_play">Google Play</option>
              <option value="apple">Apple App Store</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="min-w-0 flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* App List */}
      <Card>
        <CardHeader
          title={`App candidates to review (${filtered.length})`}
          subtitle="Publisher and namespace signals inform review priority; a score is not proof of malicious intent."
        />

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={appAlerts.length ? 'No candidates match these filters' : !latestAppScan ? 'App scan has not run' : latestAppScan.status === 'failed' || appSource?.status !== 'completed' ? 'App Store source did not return results' : (appSource?.candidates_count ?? 0) === 0 ? 'App Store source returned no candidates' : appSource?.candidates_evaluated == null ? 'Detailed scan counts were not recorded' : 'No new qualifying app findings'}
                description={appAlerts.length
                  ? 'Change or clear the current filters to review saved app findings.'
                  : !latestAppScan
                  ? 'Run a live Apple App Store search or an explicitly labelled synthetic demo scan. Google Play is not connected.'
                  : latestAppScan.status === 'failed' || appSource?.status !== 'completed'
                  ? appSource?.message || 'The latest app scan failed or the source is unavailable. Check the source status in Scan History.'
                  : (appSource?.candidates_count ?? 0) === 0
                  ? 'The latest scan completed but the selected source returned zero candidate records. This does not mean the marketplace is clear.'
                  : appSource?.candidates_evaluated == null
                  ? `The source returned ${appSource?.candidates_count ?? 0} candidates. This older scan record does not contain detailed evaluation and exclusion counts.`
                  : `The latest scan evaluated ${appSource?.candidates_evaluated ?? 0} candidates, excluded ${appSource?.official_assets_excluded ?? 0} registered official assets, and generated ${appSource?.findings_generated ?? 0} new findings. Existing duplicate findings are not added again.`}
                actionLabel="Search Apple App Store"
                onAction={() => void onTriggerScan(false)}
              />
            </div>
          ) : (
            filtered.map((alert) => (
              <article
                key={alert.id}
                onClick={() => onInspectAlert(alert)}
                className="p-5 hover:bg-slate-50/70 transition flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#991B1B] flex items-center justify-center font-bold text-sm border border-slate-200 mt-0.5 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-bold text-sm text-slate-900">{alert.candidate_name}</span>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded break-all">
                        {alert.package_id || alert.candidate_identifier}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                        {alert.platform.replace('_', ' ')}
                      </span>
                      <SourceBadge source={getAlertSource(alert)} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                      {alert.publisher_name && (
                        <span>
                          Publisher: <strong className="text-slate-800">{alert.publisher_name}</strong>
                        </span>
                      )}
                      <span>•</span>
                      <span>Discovered: {new Date(alert.created_at).toLocaleDateString()}</span>
                    </div>

                    {alert.structured_evidence?.reasons && (
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                        {alert.structured_evidence.reasons.slice(0, 2).map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 break-words">
                      <strong className="text-slate-800">Registered app comparison:</strong>{' '}
                      {activeBrand?.official_assets?.some((asset) => asset.asset_type === 'mobile_app') ? (
                        activeBrand.official_assets.filter((asset) => asset.asset_type === 'mobile_app').map((asset) => `${asset.app_name || asset.identifier}${asset.publisher_name ? ` · ${asset.publisher_name}` : ''}`).join('; ')
                      ) : 'No official mobile app is registered for comparison.'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 self-end xl:self-center">
                  <RiskBadge severity={alert.severity} score={alert.risk_score} />
                  <StatusBadge status={alert.status} />
                  {alert.candidate_url && (
                    <a
                      href={alert.candidate_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                      title="Open App Store Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => onInspectAlert(alert)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
                  >
                    Examine Risk
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
