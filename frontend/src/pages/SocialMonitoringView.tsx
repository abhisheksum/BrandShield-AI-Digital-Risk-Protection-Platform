import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Play, 
  Filter, 
  ExternalLink, 
  Eye, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw,
  Plus,
  Upload,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  FileSpreadsheet,
  Link as LinkIcon
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

interface SocialMonitoringProps {
  activeBrand: Brand | null;
  alerts: ThreatAlert[];
  scans: ScanAudit[];
  onInspectAlert: (alert: ThreatAlert) => void;
  onTriggerScan: (useDemoData?: boolean) => Promise<void>;
  onSubmitManualCandidate: (candidate: any) => Promise<void>;
  onImportCsv: (file: File) => Promise<void>;
  scanning: boolean;
}

export function SocialMonitoringView({
  activeBrand,
  alerts,
  scans,
  onInspectAlert,
  onTriggerScan,
  onSubmitManualCandidate,
  onImportCsv,
  scanning,
}: SocialMonitoringProps) {
  // Search, Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'risk_score_desc' | 'risk_score_asc' | 'date_desc' | 'date_asc'>('risk_score_desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Candidate Form
  const [manualForm, setManualForm] = useState({
    candidate_name: '',
    platform: 'twitter',
    candidate_identifier: '',
    candidate_url: '',
    description: '',
    publisher_name: '',
    is_unverified_new_account: true,
  });

  // Filter only social accounts
  const socialAlerts = alerts.filter((a) => a.candidate_type === 'social_account');
  const latestSocialScan = scans.find((scan) => scan.scan_type === 'social' || scan.scan_type === 'all');
  const socialSource = Object.entries(latestSocialScan?.source_summary || {})
    .find(([name, source]) => `${name} ${source.collector_name}`.toLowerCase().includes('social'))?.[1];

  // Filter & Search logic
  const filtered = socialAlerts.filter((a) => {
    const matchSearch =
      a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.candidate_identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.structured_evidence?.reasons || []).some((r) => r.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchPlatform = platformFilter === 'all' || a.platform.toLowerCase() === platformFilter.toLowerCase();
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchSearch && matchPlatform && matchSeverity && matchStatus;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'risk_score_desc') return b.risk_score - a.risk_score;
    if (sortBy === 'risk_score_asc') return a.risk_score - b.risk_score;
    if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return 0;
  });

  // Pagination slicing
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginatedAlerts = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand) return;
    setFormError(null);

    // Exclusion check: prevent user from submitting registered official handles
    const isExempt = (activeBrand.official_assets || []).some(
      (asset) =>
        asset.identifier.toLowerCase().replace('@', '') ===
        manualForm.candidate_identifier.toLowerCase().replace('@', '')
    );

    if (isExempt) {
      setFormError(`"${manualForm.candidate_identifier}" is already in your Exclusion Registry as a verified asset.`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitManualCandidate({
        ...manualForm,
        brand_id: activeBrand.id,
      });
      setShowManualModal(false);
      setManualForm({
        candidate_name: '',
        platform: 'twitter',
        candidate_identifier: '',
        candidate_url: '',
        description: '',
        publisher_name: '',
        is_unverified_new_account: true,
      });
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to submit candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;

    setSubmitting(true);
    try {
      await onImportCsv(file);
      setShowCsvModal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to import CSV');
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              Social Monitoring
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
              Candidate review
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Social Media Impersonation Monitoring</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Rakshak scores profiles you submit manually or import from CSV. It does not search all of Instagram or other social platforms. Live social APIs are not configured; explicit demo scans use synthetic candidates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Submission</span>
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import CSV / JSON</span>
          </button>

          <button
            onClick={() => void onTriggerScan(false)}
            disabled={scanning}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition ${
              scanning
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#DC2626] hover:bg-[#991B1B] text-white'
            }`}
          >
            {scanning ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{scanning ? 'Running scan...' : 'Check Social Source'}</span>
          </button>
          <button
            onClick={() => void onTriggerScan(true)}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Run Social Demo
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search handle, profile name, or scam reasons..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#DC2626] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Platform filter */}
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Channels</option>
              <option value="twitter">X (Twitter)</option>
              <option value="instagram">Instagram</option>
              <option value="telegram">Telegram</option>
              <option value="linkedin">LinkedIn</option>
            </select>

            {/* Severity filter */}
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="confirmed_impersonation">Confirmed Impersonation</option>
              <option value="takedown_requested">Takedown Requested</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>

            {/* Sorting */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#DC2626]"
              >
                <option value="risk_score_desc">Highest Risk First</option>
                <option value="risk_score_asc">Lowest Risk First</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Candidate Feed Table */}
      <Card>
        <CardHeader
          title={`Detected Social Candidates (${sorted.length})`}
          subtitle="Evaluated against official handles in exclusion registry with explainable mathematical scoring"
        />

        <div className="divide-y divide-slate-100">
          {paginatedAlerts.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title={socialAlerts.length ? 'No candidates match these filters' : !latestSocialScan ? 'Social scan has not run' : latestSocialScan.status === 'failed' || socialSource?.status !== 'completed' ? 'Social source did not return results' : (socialSource?.candidates_count ?? 0) === 0 ? 'Social source returned no candidates' : socialSource?.candidates_evaluated == null ? 'Detailed scan counts were not recorded' : 'No new qualifying social findings'}
                description={socialAlerts.length
                  ? 'Change or clear the current filters to review saved social findings.'
                  : !latestSocialScan
                  ? 'Submit profiles manually, import a CSV, or run an explicitly labelled demo scan. Live social platform discovery is not configured.'
                  : latestSocialScan.status === 'failed' || socialSource?.status !== 'completed'
                  ? socialSource?.message || 'The latest social scan failed or the source is unavailable. Manual submission and CSV import remain available.'
                  : (socialSource?.candidates_count ?? 0) === 0
                  ? 'The latest scan completed but the selected source returned zero candidate records. This does not mean the platform is clear.'
                  : socialSource?.candidates_evaluated == null
                  ? `The source returned ${socialSource?.candidates_count ?? 0} candidates. This older scan record does not contain detailed evaluation and exclusion counts.`
                  : `The latest scan evaluated ${socialSource?.candidates_evaluated ?? 0} candidates, excluded ${socialSource?.official_assets_excluded ?? 0} registered official assets, and generated ${socialSource?.findings_generated ?? 0} new findings. Existing duplicate findings are not added again.`}
                actionLabel="Check Social Source"
                onAction={() => void onTriggerScan(false)}
              />
            </div>
          ) : (
            paginatedAlerts.map((alert) => (
              <article
                key={alert.id}
                onClick={() => onInspectAlert(alert)}
                className="p-5 hover:bg-slate-50/70 transition flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 mt-0.5 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{alert.candidate_name}</span>
                      <span className="font-mono text-xs text-slate-500 font-medium break-all">{alert.candidate_identifier}</span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                        {alert.platform}
                      </span>
                      <SourceBadge source={getAlertSource(alert)} />
                    </div>

                    {/* Threat Badges (Homoglyphs, Combosquat, Character mutations) */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {alert.structured_evidence?.homoglyphs_detected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Homoglyph Attack
                        </span>
                      )}
                      {alert.structured_evidence?.combosquat_detected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                          Combosquatting
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        Discovered: {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Reasons / Explainable Evidence Snippet */}
                    {alert.structured_evidence?.reasons && alert.structured_evidence.reasons.length > 0 && (
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5 max-w-2xl">
                        {alert.structured_evidence.reasons.slice(0, 2).map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                      title="Inspect Profile URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => onInspectAlert(alert)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
                  >
                    Examine Evidence
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {sorted.length > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} candidates
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Manual Candidate Submission Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Submit Suspect Social Candidate</h3>
                <p className="text-xs text-slate-500">
                  Target Brand: <strong className="text-slate-800">{activeBrand?.name}</strong>
                </p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Platform *</label>
                  <select
                    value={manualForm.platform}
                    onChange={(e) => setManualForm({ ...manualForm, platform: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="twitter">X / Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Example Brand Support Desk"
                    value={manualForm.candidate_name}
                    onChange={(e) => setManualForm({ ...manualForm, candidate_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Account Handle / Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @redshield_helpdesk"
                  value={manualForm.candidate_identifier}
                  onChange={(e) => setManualForm({ ...manualForm, candidate_identifier: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Profile URL</label>
                <input
                  type="url"
                  placeholder="https://twitter.com/redshield_helpdesk"
                  value={manualForm.candidate_url}
                  onChange={(e) => setManualForm({ ...manualForm, candidate_url: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bio / Public Description</label>
                <textarea
                  rows={2}
                  placeholder="Urgent account recovery, click link bit.ly/unlock to restore..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unverifiedCheck"
                  checked={manualForm.is_unverified_new_account}
                  onChange={(e) => setManualForm({ ...manualForm, is_unverified_new_account: e.target.checked })}
                  className="accent-[#DC2626] w-4 h-4"
                />
                <label htmlFor="unverifiedCheck" className="text-xs text-slate-700 cursor-pointer">
                  Unverified new profile without official credentials
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  {submitting ? 'Scoring Risk...' : 'Submit & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV / JSON Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Import Candidates (CSV / JSON)</h3>
                <p className="text-xs text-slate-500">Bulk audit candidate lists against Brand Exclusion Registry</p>
              </div>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">Select CSV File</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Required headers: candidate_name, platform, candidate_identifier. Optional: candidate_url, description, is_unverified_new_account
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="mt-3 px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
                >
                  {submitting ? 'Auditing Batch...' : 'Choose File to Import'}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed bg-[#F8FAFC] p-3 rounded border border-slate-200">
                <strong>Exclusion Policy:</strong> Rows containing handles or URLs matching your registered official assets are exempt and will NOT generate alerts.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
