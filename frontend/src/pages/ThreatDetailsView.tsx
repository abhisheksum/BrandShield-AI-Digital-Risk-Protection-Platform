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
import { Card, CardHeader, RiskBadge, StatusBadge, ConfidenceBadge, EmptyState } from '../components/SharedUI';
import { ThreatAlert, AlertStatus, AlertSeverity, Brand } from '../types';

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
  const signalConfigs = [
    { key: 'name_similarity', label: 'Name & Typosquat Similarity', weight: '30%' },
    { key: 'logo_similarity', label: 'Logo Visual Similarity', weight: '25%' },
    { key: 'description_similarity', label: 'Description & Bio Overlap', weight: '20%' },
    { key: 'publisher_mismatch', label: 'Identity / Publisher Conflict', weight: '15%' },
    { key: 'suspicious_indicators', label: 'Phishing / Scam Behavioral Flags', weight: '10%' },
  ];

  return (
    <div className="space-y-6">
      {/* Unified Threat Center Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
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
            <span>{alerts.filter((a) => a.severity === 'critical').length} Critical Threats</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{alerts.filter((a) => a.status === 'new' || a.status === 'under_investigation').length} In Queue</span>
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
                title="No Threats Found"
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
                        ? 'bg-red-50/70 border-red-300 shadow-sm'
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

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-medium text-slate-700">
                          {alert.platform.replace('_', ' ')}
                        </span>
                        {brand && (
                          <span className="text-slate-400">
                            • {brand.name}
                          </span>
                        )}
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
              {/* Active Threat Overview Card */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-slate-900 truncate">{active.candidate_name}</h3>
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {active.candidate_identifier}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span className="capitalize font-semibold text-slate-800">
                        {active.platform.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>Target Brand: <strong className="text-slate-900">{brands.find((b) => b.id === active.brand_id)?.name || 'Brand'}</strong></span>
                      {active.publisher_name && (
                        <>
                          <span>•</span>
                          <span>Publisher: <strong className="text-slate-700">{active.publisher_name}</strong></span>
                        </>
                      )}
                      {active.candidate_url && (
                        <>
                          <span>•</span>
                          <a
                            href={active.candidate_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#DC2626] hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>Live Evidence Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <RiskBadge severity={active.severity} score={active.risk_score} />
                      <StatusBadge status={active.status} />
                    </div>
                    <ConfidenceBadge confidence={active.confidence} />
                  </div>
                </div>

                {/* Recommended Action Advisory Banner */}
                {active.recommended_action && (
                  <div className="mt-4 p-3 bg-red-50/70 border border-red-200 rounded-lg flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-red-950 uppercase tracking-wide block">
                        Recommended Security Response
                      </span>
                      <p className="text-xs text-red-900 mt-0.5 font-medium">
                        {active.recommended_action}
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Remediation Action Buttons */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 mt-4">
                  <div className="text-xs font-semibold text-slate-700">Analyst Workflow:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={updating || active.status === 'under_investigation'}
                      onClick={() => handleStatusChange('under_investigation')}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Investigate
                    </button>
                    <button
                      disabled={updating || active.status === 'confirmed_impersonation'}
                      onClick={() => handleStatusChange('confirmed_impersonation')}
                      className="px-3 py-1.5 bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Confirm Impersonation
                    </button>
                    <button
                      disabled={updating || active.status === 'takedown_requested'}
                      onClick={() => handleStatusChange('takedown_requested')}
                      className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
                    >
                      Request Takedown
                    </button>
                    <button
                      disabled={updating || active.status === 'resolved'}
                      onClick={() => handleStatusChange('resolved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Resolve
                    </button>
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

              {/* False Positive Confirmation Modal */}
              {showDismissModal && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">Dismiss as False Positive</h4>
                    <button
                      onClick={() => setShowDismissModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Record justification for whitelisting or dismissing this detection. This will timestamp the dismissal in SQLite audit records.
                  </p>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="E.g., Verified authorized regional marketing partner or brand affiliate..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#DC2626]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDismissModal(false)}
                      className="px-3 py-1 text-xs text-slate-600 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleStatusChange('false_positive')}
                      className="px-3 py-1 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-900"
                    >
                      Confirm Dismissal
                    </button>
                  </div>
                </div>
              )}

              {/* Multi-Signal Scoring Vector Breakdown */}
              <Card>
                <CardHeader
                  title="Multi-Signal Risk Scoring Vector"
                  subtitle="Configurable multi-signal algorithm with dynamic weight rebalancing (Heuristic score, not a verified probability)"
                />
                <div className="p-6 space-y-4">
                  {signalConfigs.map((cfg) => {
                    const signal = signals[cfg.key as keyof typeof signals] as any;
                    const score = signal ? signal.score ?? signal.raw_similarity ?? 0 : 0;
                    const available = signal ? signal.available : false;
                    const explanation = signal?.explanation || signal?.notes;

                    return (
                      <div key={cfg.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {cfg.label} <span className="text-slate-400 font-normal">({cfg.weight})</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {available ? `${score.toFixed(0)} / 100` : 'Signal Omitted / N/A'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              score >= 80 ? 'bg-[#DC2626]' : score >= 50 ? 'bg-[#EA580C]' : 'bg-[#16A34A]'
                            }`}
                            style={{ width: `${available ? score : 0}%` }}
                          />
                        </div>
                        {explanation && (
                          <div className="text-[11px] text-slate-500 italic pl-1">
                            &bull; {explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 italic">
                    Note: Name similarity alone is capped at 74.0 (High) to prevent critical false alarms without corroborating visual, publisher, or linguistic proof.
                  </div>
                </div>
              </Card>

              {/* Evidence-Based Linguistic & Anomaly Reasons */}
              <Card>
                <CardHeader
                  title="Evidence Proof & Automated Telemetry"
                  subtitle="Rule-based linguistic anomalies, typosquatting patterns, and threat flags"
                />
                <div className="p-6 space-y-2.5">
                  {!active.structured_evidence?.reasons || active.structured_evidence.reasons.length === 0 ? (
                    <div className="text-xs text-slate-400">No automated linguistic flags attached.</div>
                  ) : (
                    active.structured_evidence.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{r}</span>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold uppercase text-slate-400 block">Candidate Type</span>
                      <span className="font-semibold text-slate-800 mt-1 capitalize block">
                        {active.candidate_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold uppercase text-slate-400 block">Confidence Level</span>
                      <span className="font-semibold text-slate-800 mt-1 capitalize block">
                        {active.confidence || 'Medium'} Coverage
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

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
