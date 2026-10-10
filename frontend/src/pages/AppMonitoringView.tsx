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
import { Card, CardHeader, RiskBadge, StatusBadge, EmptyState } from '../components/SharedUI';
import { Brand, ThreatAlert } from '../types';

interface AppMonitoringProps {
  activeBrand: Brand | null;
  alerts: ThreatAlert[];
  onInspectAlert: (alert: ThreatAlert) => void;
  onTriggerScan: () => Promise<void>;
  scanning: boolean;
}

export function AppMonitoringView({
  activeBrand,
  alerts,
  onInspectAlert,
  onTriggerScan,
  scanning,
}: AppMonitoringProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const appAlerts = alerts.filter((a) => a.candidate_type === 'mobile_app');

  const filtered = appAlerts.filter((a) => {
    const matchSearch =
      a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.candidate_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              Threat Surface 02
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
              Google Play • Apple App Store
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Suspicious App Store Monitoring</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Surfaces unauthorized APK packages, cloned financial tools, brand combosquats, and rogue publishers impersonating{' '}
            <strong className="text-slate-800">{activeBrand?.name || 'Selected Brand'}</strong>.
          </p>
        </div>

        <button
          onClick={onTriggerScan}
          disabled={scanning}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xs transition ${
            scanning
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-[#991B1B] hover:bg-[#7F1D1D] text-white'
          }`}
        >
          {scanning ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{scanning ? 'Searching Marketplaces...' : 'Execute App Store Scan'}</span>
        </button>
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
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Marketplaces</option>
              <option value="google_play">Google Play</option>
              <option value="apple">Apple App Store</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
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
          title={`Detected Rogue & Lookalike Mobile Apps (${filtered.length})`}
          subtitle="Analyzed against package namespace patterns and verified corporate publishers"
        />

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Malicious Apps Detected"
                description="No package namespace or publisher anomalies found under current filter bounds."
                actionLabel="Run Marketplace Scan"
                onAction={onTriggerScan}
              />
            </div>
          ) : (
            filtered.map((alert) => (
              <div
                key={alert.id}
                onClick={() => onInspectAlert(alert)}
                className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#991B1B] flex items-center justify-center font-bold text-sm border border-slate-200 mt-0.5 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{alert.candidate_name}</span>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {alert.package_id || alert.candidate_identifier}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                        {alert.platform.replace('_', ' ')}
                      </span>
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
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
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
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
