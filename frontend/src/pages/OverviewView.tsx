import React from 'react';
import { 
  ShieldAlert, 
  Smartphone, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Activity, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Card, CardHeader, RiskBadge, StatusBadge, SourceBadge, EmptyState } from '../components/SharedUI';
import { Brand, ThreatAlert, ScanAudit } from '../types';

function getAlertSource(alert: ThreatAlert): 'demo' | 'manual' | 'live' | 'unavailable' {
  const sourceType = alert.structured_evidence?.source_type;
  if (alert.is_demo || sourceType === 'demo_data') return 'demo';
  if (sourceType === 'manual_submission' || sourceType === 'csv_import') return 'manual';
  if (sourceType === 'live_source') return 'live';
  return 'unavailable';
}

interface OverviewProps {
  brands: Brand[];
  activeBrand: Brand | null;
  alerts: ThreatAlert[];
  scans: ScanAudit[];
  onSelectBrand: (brand: Brand) => void;
  onInspectAlert: (alert: ThreatAlert) => void;
  onNavigateToTab: (tab: any) => void;
  onTriggerScan: () => void;
  onTriggerSocialScan: () => void;
  onTriggerAppScan: () => void;
}

export function OverviewView({
  brands,
  activeBrand,
  alerts,
  scans,
  onInspectAlert,
  onNavigateToTab,
  onTriggerScan,
  onTriggerSocialScan,
  onTriggerAppScan,
}: OverviewProps) {
  // Aggregate Metrics
  const totalAssets = activeBrand?.official_assets?.length || 0;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length;
  const lowCount = alerts.filter((a) => a.severity === 'low').length;

  const getSourceResults = (kind: 'social' | 'app_store') => scans.flatMap((scan) => {
    if (scan.scan_type !== kind && scan.scan_type !== 'all') return [];
    const entry = Object.entries(scan.source_summary || {}).find(([name, source]) => {
      const sourceName = `${name} ${source.collector_name}`.toLowerCase();
      return kind === 'social'
        ? sourceName.includes('social')
        : sourceName.includes('apple') || sourceName.includes('appstore');
    });
    return entry ? [entry[1]] : [];
  });
  const socialScans = getSourceResults('social');
  const appScans = getSourceResults('app_store');
  const socialCandidatesScanned = socialScans.reduce((total, source) => total + source.candidates_count, 0);
  const appCandidatesScanned = appScans.reduce((total, source) => total + source.candidates_count, 0);
  const sourceSummaryLabel = (source: NonNullable<typeof socialScans>[number]) =>
    `${source.is_demo ? 'demo data' : source.status === 'completed' ? 'live source response' : source.status.replaceAll('_', ' ')}`;
  const findingsRequiringReview = alerts.filter((alert) => alert.status === 'new' || alert.status === 'under_investigation').length;

  // Risk Distribution Data for Recharts Donut
  const riskDistributionData = [
    { name: 'Critical', value: criticalCount, color: '#F87171' },
    { name: 'High', value: highCount, color: '#FB923C' },
    { name: 'Medium', value: mediumCount, color: '#FBBF24' },
    { name: 'Low', value: lowCount, color: '#34D399' },
  ].filter((d) => d.value > 0);

  // Scan Activity History Chart (last 5 scans)
  const scanHistoryData = scans.slice(0, 6).reverse().map((s, idx) => ({
    name: `Scan #${s.id}`,
    candidates: s.total_candidates,
    alerts: s.alerts_generated,
    exempted: s.official_assets_excluded ?? s.exempted_candidates ?? null,
  }));

  const recentDetections = alerts.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Scope Alert Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Brand Protection Overview
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {activeBrand ? activeBrand.name : 'All Brand Entities'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeBrand?.industry || 'Organisation'} • {totalAssets} registered official assets • {alerts.length} findings
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigateToTab('brands')}
            className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            Manage Brand Assets
          </button>
          <button onClick={onTriggerSocialScan} className="px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white rounded-lg text-xs font-semibold shadow-xs transition">Scan Social Media</button>
          <button onClick={onTriggerAppScan} className="px-4 py-2 border border-[#166534] text-[#166534] hover:bg-emerald-50 rounded-lg text-xs font-semibold transition">Scan App Stores</button>
        </div>
      </div>

      {scans.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-900">
          <strong>Ready for your first scan.</strong> Apple App Store searches use Apple’s public search API. Social profiles are submitted or imported manually; demo scans use clearly labelled synthetic records.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600" aria-label="Source status">
        <span><strong className="text-slate-800">Apple App Store:</strong> live search when reachable</span>
        <span><strong className="text-slate-800">Social profiles:</strong> manual or CSV import</span>
        <span><strong className="text-slate-800">Demo mode:</strong> synthetic records</span>
      </div>

      {/* Summary metrics are derived from persisted scans, findings and official assets. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Social candidates scanned</span>
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-400"><Users className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{socialScans.length ? socialCandidatesScanned : '—'}</div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            {socialScans.length ? `${socialScans.length} scan${socialScans.length === 1 ? '' : 's'} · latest ${sourceSummaryLabel(socialScans[0])}` : 'No social scan recorded'}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">App candidates scanned</span>
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-400"><Smartphone className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{appScans.length ? appCandidatesScanned : '—'}</div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            {appScans.length ? `${appScans.length} scan${appScans.length === 1 ? '' : 's'} · latest ${sourceSummaryLabel(appScans[0])}` : 'No app scan recorded'}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Findings requiring review</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-400"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{findingsRequiringReview}</div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">New or under investigation</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Official assets registered</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-400"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{totalAssets}</div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">In the current brand exclusion registry</div>
        </Card>
      </div>
      <p className="-mt-4 text-[11px] text-slate-500">Channel candidate totals use dedicated scans; combined scans remain grouped in scan history.</p>

      {/* Visual Analytics Row: Risk Distribution Donut & Social vs App Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Donut */}
        <Card className="lg:col-span-1">
          <CardHeader 
            title="Severity Distribution" 
            subtitle="Risk breakdown by weighted engine score" 
          />
          <div className="p-5">
            {riskDistributionData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#111916', 
                        borderColor: '#29372F',
                        color: '#F3F6F4',
                        borderRadius: '8px', 
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No findings recorded yet</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span className="text-slate-600">Critical ({criticalCount})</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                <span className="text-slate-600">High ({highCount})</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <span className="text-slate-600">Medium ({mediumCount})</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="text-slate-600">Low ({lowCount})</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Social vs App & Scan Activity */}
        <Card className="lg:col-span-2">
          <CardHeader 
            title="Scan Activity & Discovery Flow" 
            subtitle="Candidates audited vs actionable threat alerts generated"
            action={
              <button 
                onClick={() => onNavigateToTab('history')}
                className="text-xs font-semibold text-[#DC2626] hover:underline"
              >
                View Full Audit Log &rarr;
              </button>
            }
          />
          <div className="p-5">
            {scanHistoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scanHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#29372F" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A3B1A8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#A3B1A8' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#111916', 
                        borderColor: '#29372F',
                        color: '#F3F6F4',
                        borderRadius: '8px', 
                        fontSize: '12px' 
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#A3B1A8' }} />
                    <Bar dataKey="candidates" name="Candidates audited" fill="#7E9186" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="alerts" name="Findings created" fill="#F87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exempted" name="Official assets excluded" fill="#34D399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">No scan history available</div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Detections List */}
      <Card>
        <CardHeader 
          title="Recent findings" 
          subtitle="Highest review-priority candidates from the current brand scope"
          action={
            <button
              onClick={() => onNavigateToTab('threats')}
              className="text-xs font-semibold text-[#DC2626] hover:underline flex items-center gap-1"
            >
              <span>View all findings ({alerts.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        />
        <div className="divide-y divide-slate-100">
          {recentDetections.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No findings to review yet" 
                description="Run the Apple App Store search or submit/import social profiles. Social monitoring does not search entire platforms."
                actionLabel="Execute Scan Now"
                onAction={onTriggerScan}
              />
            </div>
          ) : (
            recentDetections.map((alert) => (
              <div 
                key={alert.id}
                onClick={() => onInspectAlert(alert)}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg mt-0.5 bg-slate-100 text-slate-400">
                    {alert.candidate_type === 'social_account' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{alert.candidate_name}</span>
                      <span className="text-xs text-slate-500 font-mono break-all">
                        {alert.candidate_identifier}
                      </span>
                      {alert.structured_evidence?.homoglyphs_detected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-[#991B1B]">
                          Homoglyph Substitution
                        </span>
                      )}
                      {alert.structured_evidence?.combosquat_detected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                          Combosquat
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="capitalize font-semibold text-slate-700">{alert.platform}</span>
                      <span>•</span>
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      {alert.publisher_name && (
                        <>
                          <span>•</span>
                          <span>Pub: {alert.publisher_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-center">
                  <RiskBadge severity={alert.severity} score={alert.risk_score} />
                  <StatusBadge status={alert.status} />
                  <SourceBadge source={getAlertSource(alert)} />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectAlert(alert);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                  >
                    <ArrowUpRight className="w-4 h-4" />
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
