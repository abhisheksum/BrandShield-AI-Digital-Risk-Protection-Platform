import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  Send,
  Flag,
  FileCheck,
  UserCheck,
  Calendar,
  Layers,
  Smartphone,
  Users,
  RotateCcw,
  Sparkles,
  Info,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import { Card, CardHeader, RiskBadge, StatusBadge, ConfidenceBadge, SourceBadge, EmptyState } from '../components/SharedUI';
import { ThreatAlert, AlertStatus, AlertSeverity, Brand } from '../types';

function getAlertSource(alert: ThreatAlert): 'demo' | 'manual' | 'live' | 'unavailable' {
  const sourceType = alert.structured_evidence?.source_type;
  if (alert.is_demo || sourceType === 'demo_data') return 'demo';
  if (sourceType === 'manual_submission' || sourceType === 'csv_import') return 'manual';
  if (sourceType === 'live_source') return 'live';
  return 'unavailable';
}

interface ThreatDetailsProps {
  alerts: ThreatAlert[];
  brands: Brand[];
  activeBrand: Brand | null;
  onSelectBrand: (brand: Brand) => void;
  selectedAlert: ThreatAlert | null;
  onSelectAlert: (alert: ThreatAlert) => void;
  onUpdateStatus: (
    alertId: number, 
    status: AlertStatus, 
    options?: { investigation_notes?: string; resolution_notes?: string; analyst_name?: string }
  ) => Promise<void>;
}

export function ThreatDetailsView({
  alerts,
  brands,
  activeBrand,
  onSelectBrand,
  selectedAlert,
  onSelectAlert,
  onUpdateStatus,
}: ThreatDetailsProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');

  // Analyst Action Form States
  const [analystName, setAnalystName] = useState('SOC Lead Analyst');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);

  // Filter Computation
  const filteredAlerts = useMemo(() => {
    const now = Date.now();
    return alerts.filter((a) => {
      // 1. Brand filter
      if (selectedBrandFilter !== 'all' && a.brand_id !== Number(selectedBrandFilter)) {
        return false;
      }
      // 2. Platform filter
      if (platformFilter !== 'all') {
        if (platformFilter === 'mobile_app' && a.candidate_type !== 'mobile_app') return false;
        if (platformFilter === 'social_account' && a.candidate_type !== 'social_account') return false;
        if (platformFilter !== 'mobile_app' && platformFilter !== 'social_account') {
          if (!a.platform.toLowerCase().includes(platformFilter.toLowerCase())) return false;
        }
      }
      // 3. Severity filter
      if (severityFilter !== 'all' && a.severity !== severityFilter) {
        return false;
      }
      // 4. Status filter
      if (statusFilter !== 'all' && a.status !== statusFilter) {
        return false;
      }
      // 5. Date filter
      if (dateFilter !== 'all') {
        const alertTime = new Date(a.created_at).getTime();
        const diffHours = (now - alertTime) / (1000 * 3600);
        if (dateFilter === '24h' && diffHours > 24) return false;
        if (dateFilter === '7d' && diffHours > 24 * 7) return false;
        if (dateFilter === '30d' && diffHours > 24 * 30) return false;
      }
      // 6. Search text
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = a.candidate_name?.toLowerCase().includes(query);
        const matchId = a.candidate_identifier?.toLowerCase().includes(query);
        const matchPub = a.publisher_name?.toLowerCase().includes(query);
        const matchDesc = a.structured_evidence?.reasons?.some((r) => r.toLowerCase().includes(query));
        if (!matchName && !matchId && !matchPub && !matchDesc) return false;
      }
      return true;
    });
  }, [alerts, selectedBrandFilter, platformFilter, severityFilter, statusFilter, dateFilter, searchTerm]);

  const active = selectedAlert || filteredAlerts[0] || null;
  const activeBrandRecord = active ? brands.find((brand) => brand.id === active.brand_id) : null;

  // Sync active alert fields into investigation editor
  React.useEffect(() => {
    if (active) {
      setInvestigationNotes(active.investigation_notes || '');
      setResolutionNotes(active.resolution_notes || '');
      if (active.analyst_name) {
        setAnalystName(active.analyst_name);
      }
    }
  }, [active?.id]);

  const handleStatusChange = async (newStatus: AlertStatus) => {
    if (!active) return;
    setUpdating(true);
    try {
      await onUpdateStatus(active.id, newStatus, {
        analyst_name: analystName,
        investigation_notes: investigationNotes,
        resolution_notes: resolutionNotes,
      });
      setShowDismissModal(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!active) return;
    setUpdating(true);
    try {
      await onUpdateStatus(active.id, active.status, {
        analyst_name: analystName,
        investigation_notes: investigationNotes,
        resolution_notes: resolutionNotes,
      });
    } finally {
      setUpdating(false);
    }
  };

  // Structured Signals & Weights
  const signals = active?.structured_evidence?.signals || {};
  const missingSignals = active?.structured_evidence?.missing_signals || [];
  const relevantOfficialAssets = active
    ? (activeBrandRecord?.official_assets || []).filter((asset) =>
      asset.asset_type === 'domain' || asset.asset_type === (active.candidate_type === 'mobile_app' ? 'mobile_app' : 'social')
    )
    : [];
  const signalConfigs = [
    { key: 'name_similarity', label: 'Name & Typosquat Similarity' },
    { key: 'logo_similarity', label: 'Logo Visual Similarity' },
    { key: 'description_similarity', label: 'Description & Bio Overlap' },
    { key: 'publisher_mismatch', label: 'Identity / Publisher Conflict' },
    { key: 'suspicious_indicators', label: 'Phishing / Scam Behavioral Flags' },
  ];

  return (
    <div className="space-y-6">
      {/* Unified Threat Center Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Unified Threat Center
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Cross-Channel Impersonation & Rogue App Detection</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Multi-Channel Threat Intelligence & Remediation</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Correlate social media impersonators and unauthorized mobile app listings against registered official brand assets with transparent heuristic scoring and analyst investigation tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#DC2626] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{alerts.filter((a) => a.severity === 'critical').length} Critical priority</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{alerts.filter((a) => a.status === 'new' || a.status === 'under_investigation').length} In review queue</span>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search threat candidate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#DC2626]"
            />
          </div>

          {/* Brand Scope Filter */}
          <div>
            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Platform / Channel Filter */}
          <div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Channels</option>
              <option value="social_account">All Social Profiles</option>
              <option value="mobile_app">All Mobile Apps</option>
              <option value="twitter">X / Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="telegram">Telegram</option>
              <option value="google_play">Google Play</option>
              <option value="apple_app_store">Apple App Store</option>
            </select>
          </div>

          {/* Risk Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (80-100)</option>
              <option value="high">High (65-79)</option>
              <option value="medium">Medium (45-64)</option>
              <option value="low">Low (0-44)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="confirmed_impersonation">Confirmed Impersonation</option>
              <option value="takedown_requested">Takedown Requested</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Dates</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Filtered Candidate List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Threat Queue ({filteredAlerts.length})
            </span>
            {(searchTerm || selectedBrandFilter !== 'all' || platformFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBrandFilter('all');
                  setPlatformFilter('all');
                  setSeverityFilter('all');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
                className="text-[11px] text-[#DC2626] hover:underline font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[780px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <EmptyState
                title="No findings to review"
                description="No detection records match your current filter parameters."
              />
            ) : (
              filteredAlerts.map((alert) => {
                const isSelected = active?.id === alert.id;
                const isApp = alert.candidate_type === 'mobile_app';
                const brand = brands.find((b) => b.id === alert.brand_id);

                return (
                  <div
                    key={alert.id}
                    onClick={() => onSelectAlert(alert)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isApp ? (
                            <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {alert.candidate_name}
                          </h4>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5 pl-5">
                          {alert.candidate_identifier}
                        </div>
                      </div>
                      <RiskBadge severity={alert.severity} score={alert.risk_score} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-y-2 text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="capitalize font-medium text-slate-700">
                          {alert.platform.replace('_', ' ')}
                        </span>
                        {brand && (
                          <span className="text-slate-400">
                            • {brand.name}
                          </span>
                        )}
                        <SourceBadge source={getAlertSource(alert)} />
                      </div>
                      <StatusBadge status={alert.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Evidence & Analyst Investigation Studio */}
        <div className="lg:col-span-7">
          {!active ? (
            <Card className="p-12 text-center">
              <EmptyState
                title="Select a Threat to Triage"
                description="Choose an alert from the queue to view explainable mathematical scoring vectors, source evidence, and log analyst notes."
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Finding identity, priority, provenance and current review state */}
              <Card className="p-6">
                <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100">
                  <RiskBadge severity={active.severity} score={active.risk_score} />
                  <StatusBadge status={active.status} />
                  <ConfidenceBadge confidence={active.confidence} />
                  <SourceBadge source={getAlertSource(active)} />
                </div>

                <div className="pt-4 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 break-words">{active.candidate_name}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1.5">
                    <span className="capitalize font-semibold text-slate-800">{active.platform.replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span>Target brand: <strong className="text-slate-900">{activeBrandRecord?.name || 'Brand'}</strong></span>
                    {active.publisher_name && <span>Publisher: <strong className="text-slate-700">{active.publisher_name}</strong></span>}
                    {active.candidate_identifier && <span className="font-mono break-all">ID: {active.candidate_identifier}</span>}
                    {active.candidate_url && (
                      <a
                        href={active.candidate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Open candidate URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    This score sets review priority. Verify the source and evidence before treating the candidate as impersonation.
                  </p>
                </div>
              </Card>

              {/* Reasons, evidence gaps and official asset comparison */}
              <Card>
                <CardHeader
                  title="Reasons for review"
                  subtitle="Recorded signals explain the score; they do not establish malicious intent."
                />
                <div className="p-6 space-y-5">
                  {active.structured_evidence?.reasons?.length ? (
                    <div className="space-y-2">
                      {active.structured_evidence.reasons.map((reason, index) => (
                        <div key={index} className="flex items-start gap-2.5 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">No reason details were recorded for this finding.</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <section className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence gaps</h4>
                      {missingSignals.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                          {missingSignals.map((signalKey) => (
                            <li key={signalKey}>{signalConfigs.find((config) => config.key === signalKey)?.label || signalKey.replaceAll('_', ' ')}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No missing-signal list was returned for this finding.</p>
                      )}
                    </section>
                    <section className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Uncertainty</h4>
                      <p className="mt-2 text-xs text-slate-600">Confidence describes available evidence coverage. Review the source and context before taking action.</p>
                    </section>
                  </div>

                  <section className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Official asset comparison</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Candidate</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 break-words">{active.candidate_name}</div>
                        <div className="mt-1 text-xs font-mono text-slate-500 break-all">{active.candidate_identifier || 'No identifier recorded'}</div>
                        {active.publisher_name && <div className="mt-1 text-xs text-slate-500">Publisher: {active.publisher_name}</div>}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Registered official identity</div>
                        {relevantOfficialAssets.length ? (
                          <ul className="mt-1 space-y-2">
                            {relevantOfficialAssets.map((asset) => (
                              <li key={asset.id} className="text-xs text-slate-700 break-words">
                                <span className="font-semibold">{asset.app_name || asset.platform}</span>
                                <span className="block font-mono text-slate-500 break-all">{asset.identifier}</span>
                                {asset.publisher_name && <span className="block text-slate-500">Publisher: {asset.publisher_name}</span>}
                                <span className="block text-slate-400">{asset.verified ? 'Verified record' : 'Verification pending'}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">No matching official app, social profile or domain is registered for comparison.</p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </Card>

              {/* Contributing score signals */}
              <Card>
                <CardHeader
                  title="Contributing signals"
                  subtitle="Heuristic evidence scores and active weights returned for this finding. This is not a probability."
                />
                <div className="p-6 space-y-4">
                  {signalConfigs.map((config) => {
                    const signal = signals[config.key as keyof typeof signals] as any;
                    const score = signal ? signal.score ?? signal.raw_similarity ?? 0 : 0;
                    const available = signal ? signal.available : false;
                    const explanation = signal?.explanation || signal?.notes;
                    const weight = active.structured_evidence?.weights_used?.[config.key];

                    return (
                      <div key={config.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-slate-800">
                            {config.label} <span className="text-slate-400 font-normal">({weight !== undefined ? `${Math.round(weight * 100)}% active weight` : 'weight not reported'})</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {available ? `${score.toFixed(0)} / 100` : 'Not available'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              score >= 80 ? 'bg-[#DC2626]' : score >= 50 ? 'bg-[#EA580C]' : 'bg-[#16A34A]'
                            }`}
                            style={{ width: `${available ? Math.max(0, Math.min(100, score)) : 0}%` }}
                          />
                        </div>
                        {explanation && <div className="text-[11px] text-slate-500 pl-1">{explanation}</div>}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Raw evidence is available on demand for analysts */}
              <Card className="overflow-hidden">
                <details>
                  <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                    Raw technical details and source record
                  </summary>
                  <div className="border-t border-slate-100 p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div><span className="text-slate-500">Source type: </span><span className="text-slate-700">{active.structured_evidence?.source_type || 'Not reported'}</span></div>
                      <div><span className="text-slate-500">Candidate type: </span><span className="text-slate-700">{active.candidate_type}</span></div>
                      <div className="break-all"><span className="text-slate-500">Candidate URL: </span><span className="text-slate-700">{active.candidate_url || 'Not provided'}</span></div>
                      <div><span className="text-slate-500">Finding ID: </span><span className="font-mono text-slate-700">{active.id}</span></div>
                    </div>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">{JSON.stringify(active.structured_evidence || {}, null, 2)}</pre>
                  </div>
                </details>
              </Card>

              {/* Analyst actions follow the evidence review */}
              <Card className="p-5 space-y-4">
                {active.recommended_action && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wide block">Suggested next step</span>
                      <p className="text-xs text-amber-100 mt-0.5 font-medium">{active.recommended_action}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="text-xs font-semibold text-slate-700">Review status and next actions</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={updating || active.status === 'under_investigation'}
                      onClick={() => handleStatusChange('under_investigation')}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >Investigate</button>
                    <button
                      disabled={updating || active.status === 'confirmed_impersonation'}
                      onClick={() => handleStatusChange('confirmed_impersonation')}
                      className="px-3 py-1.5 bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >Confirm Impersonation</button>
                    <button
                      disabled={updating || active.status === 'takedown_requested'}
                      onClick={() => handleStatusChange('takedown_requested')}
                      className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
                    >Request Takedown</button>
                    <button
                      disabled={updating || active.status === 'resolved'}
                      onClick={() => handleStatusChange('resolved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >Resolve</button>
                    <button
                      disabled={updating || active.status === 'false_positive'}
                      onClick={() => setShowDismissModal(true)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>False Positive</span>
                    </button>
                  </div>
                </div>
              </Card>

              {showDismissModal && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">Dismiss as False Positive</h4>
                    <button onClick={() => setShowDismissModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold">Cancel</button>
                  </div>
                  <p className="text-xs text-slate-600">Record why this candidate should be dismissed. The decision and timestamp are saved to the audit record.</p>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(event) => setResolutionNotes(event.target.value)}
                    placeholder="Add the reason for dismissing this finding..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#DC2626]"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowDismissModal(false)} className="px-3 py-1 text-xs text-slate-600 font-medium">Cancel</button>
                    <button onClick={() => handleStatusChange('false_positive')} className="px-3 py-1 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-900">Confirm Dismissal</button>
                  </div>
                </div>
              )}

              {/* Analyst Investigation Log & Audit Notes Studio */}
              <Card>
                <CardHeader
                  title="Analyst Investigation Log"
                  subtitle="Persist SOC analyst notes, investigator identity, and remediation history directly to SQLite"
                />
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                        Investigating Analyst Name
                      </label>
                      <input
                        type="text"
                        value={analystName}
                        onChange={(e) => setAnalystName(e.target.value)}
                        placeholder="E.g., Senior SOC Analyst Alpha"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                        Status History & Timestamps
                      </label>
                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between">
                        <span>Created: {new Date(active.created_at).toLocaleDateString()}</span>
                        {active.status_changed_at && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            Updated: {new Date(active.status_changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Investigation & Reverse-Engineering Notes
                    </label>
                    <textarea
                      rows={3}
                      value={investigationNotes}
                      onChange={(e) => setInvestigationNotes(e.target.value)}
                      placeholder="Add observations: WHOIS registration data, phishing infrastructure linkage, payload URLs..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#DC2626]"
                    />
                  </div>

                  {active.dismissed_at && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                      <span>Dismissed as False Positive on {new Date(active.dismissed_at).toLocaleString()}</span>
                      <span className="font-semibold">Audit Record Preserved</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      disabled={updating}
                      onClick={handleSaveNotes}
                      className="px-4 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>{updating ? 'Saving Audit Record...' : 'Save Investigation Log to SQLite'}</span>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
