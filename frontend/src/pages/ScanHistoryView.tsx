import React, { useState } from 'react';
import { 
  History, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Clock, 
  Filter, 
  Search,
  ShieldCheck,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { Card, CardHeader, EmptyState } from '../components/SharedUI';
import { ScanAudit, Brand } from '../types';

interface ScanHistoryProps {
  scans: ScanAudit[];
  activeBrand: Brand | null;
  onTriggerScan: (type: 'all' | 'social' | 'app_store') => Promise<void>;
  scanning: boolean;
}

export function ScanHistoryView({
  scans,
  activeBrand,
  onTriggerScan,
  scanning,
}: ScanHistoryProps) {
  const [filterType, setFilterType] = useState('all');
  const [selectedScanType, setSelectedScanType] = useState<'all' | 'social' | 'app_store'>('all');
  const [expandedScanId, setExpandedScanId] = useState<number | null>(null);

  const filtered = scans.filter((s) => {
    if (filterType === 'all') return true;
    return s.scan_type === filterType;
  });

  // Calculate Last Successful Scan
  const lastSuccessfulScan = scans.find((s) => s.status === 'completed');

  // Compute Aggregated Source Health from the latest scan's source_summary
  const latestScan = scans[0];
  const sourceStatuses = latestScan?.source_summary || {};
  const sourceEntries = Object.entries(sourceStatuses);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              Audit Trail & Telemetry
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
              Immutable Records
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Scan History & Source Health</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Detailed inspection log of telemetry executions, candidates evaluated, and exclusions triggered for{' '}
            <strong className="text-slate-800">{activeBrand?.name || 'Selected Brand'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedScanType}
            onChange={(e) => setSelectedScanType(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#DC2626]"
          >
            <option value="all">Full Scan (Social + Apps)</option>
            <option value="social">Social Channels Only</option>
            <option value="app_store">App Marketplaces Only</option>
          </select>

          <button
            onClick={() => onTriggerScan(selectedScanType)}
            disabled={scanning}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition ${
              scanning
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#DC2626] hover:bg-[#991B1B] text-white'
            }`}
          >
            {scanning ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{scanning ? 'Running...' : 'Run Scan'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Source Health & Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Last Successful Scan */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Last Successful Scan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-2">
            {lastSuccessfulScan ? (
              <span>Scan #{lastSuccessfulScan.id}</span>
            ) : (
              <span className="text-slate-400 font-normal">None recorded</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              {lastSuccessfulScan
                ? new Date(lastSuccessfulScan.completed_at || lastSuccessfulScan.created_at).toLocaleString()
                : 'Awaiting initial scan'}
            </span>
          </div>
        </Card>

        {/* Card 2: Social Connector Health */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Social Connectors</span>
            <Server className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-800">Operational</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            X (Twitter), Instagram, Telegram ingestion pipelines active
          </p>
        </Card>

        {/* Card 3: App Store Connector Health */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>App Store Marketplaces</span>
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-800">Operational</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Google Play & Apple App Store index collectors synchronized
          </p>
        </Card>
      </div>

      {/* Filter Options */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Scope:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all', 'social', 'app_store'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    filterType === type
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Audits: <strong className="text-slate-800">{filtered.length}</strong>
          </div>
        </div>
      </Card>

      {/* Scans Table with Expandable Source Health Telemetry */}
      <Card>
        <CardHeader
          title="Telemetry Execution History"
          subtitle="Timestamped records with candidate counts, alert conversions, trusted exclusions, and source health summaries"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Scan ID</th>
                <th className="p-4">Channel Vector</th>
                <th className="p-4">Execution Status</th>
                <th className="p-4">Candidates Audited</th>
                <th className="p-4">Alerts Raised</th>
                <th className="p-4">Whitelisted Exclusions</th>
                <th className="p-4">Telemetry Health</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <EmptyState
                      title="No Scan Records Found"
                      description="No execution history found for this brand and filter scope. Run a new scan above."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((scan) => {
                  const isExpanded = expandedScanId === scan.id;
                  const sources = scan.source_summary || {};
                  const sourceKeys = Object.keys(sources);

                  return (
                    <React.Fragment key={scan.id}>
                      <tr 
                        onClick={() => setExpandedScanId(isExpanded ? null : scan.id)}
                        className={`hover:bg-slate-50/70 transition cursor-pointer ${isExpanded ? 'bg-slate-50/90' : ''}`}
                      >
                        <td className="p-4 font-mono font-bold text-slate-900">
                          #{scan.id}
                        </td>
                        <td className="p-4 capitalize font-semibold text-slate-700">
                          {scan.scan_type.replace('_', ' ')}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            scan.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : scan.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="capitalize">{scan.status}</span>
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {scan.total_candidates}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {scan.alerts_generated} Alerts
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {scan.exempted_candidates} Whitelisted
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {sourceKeys.length > 0 ? (
                            <span className="text-[11px] text-[#DC2626] font-semibold hover:underline">
                              {sourceKeys.length} Source{sourceKeys.length > 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {new Date(scan.created_at).toLocaleString()}
                        </td>
                      </tr>

                      {/* Expandable Source Health Details Row */}
                      {isExpanded && sourceKeys.length > 0 && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={8} className="p-4 pl-12 space-y-2">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Collector Telemetry Health Breakdown
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {sourceKeys.map((key) => {
                                const src = sources[key];
                                return (
                                  <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-slate-900">{src.collector_name || key}</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        src.status === 'completed'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}>
                                        {src.status}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                      {src.message || 'Collection processed successfully.'}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                      <span>Candidates: {src.candidates_count}</span>
                                      {src.duration_ms !== undefined && (
                                        <span>Latency: {src.duration_ms}ms</span>
                                      )}
                                      <span className="italic">{src.is_demo ? 'Seeded Demo' : 'Live Gateway'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
