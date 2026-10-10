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
import { Card, CardHeader, RiskBadge, StatusBadge, EmptyState } from '../components/SharedUI';
import { Brand, ThreatAlert, ScanAudit } from '../types';

interface OverviewProps {
  brands: Brand[];
  activeBrand: Brand | null;
  alerts: ThreatAlert[];
  scans: ScanAudit[];
  onSelectBrand: (brand: Brand) => void;
  onInspectAlert: (alert: ThreatAlert) => void;
  onNavigateToTab: (tab: any) => void;
  onTriggerScan: () => void;
}

export function OverviewView({
  brands,
  activeBrand,
  alerts,
  scans,
  onInspectAlert,
  onNavigateToTab,
  onTriggerScan,
}: OverviewProps) {
  // Aggregate Metrics
  const totalAssets = activeBrand?.official_assets?.length || 0;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length;
  const lowCount = alerts.filter((a) => a.severity === 'low').length;

  const socialAlerts = alerts.filter((a) => a.candidate_type === 'social_account');
  const appAlerts = alerts.filter((a) => a.candidate_type === 'mobile_app');

  // Risk Distribution Data for Recharts Donut
  const riskDistributionData = [
    { name: 'Critical', value: criticalCount, color: '#DC2626' },
    { name: 'High', value: highCount, color: '#EA580C' },
    { name: 'Medium', value: mediumCount, color: '#D97706' },
    { name: 'Low', value: lowCount, color: '#16A34A' },
  ].filter((d) => d.value > 0);

  // Social vs App Channel Breakdown for Recharts
  const channelData = [
    { name: 'Social Impersonation', count: socialAlerts.length, fill: '#DC2626' },
    { name: 'Suspicious Mobile Apps', count: appAlerts.length, fill: '#991B1B' },
  ];

  // Scan Activity History Chart (last 5 scans)
  const scanHistoryData = scans.slice(0, 6).reverse().map((s, idx) => ({
    name: `Scan #${s.id}`,
    candidates: s.total_candidates,
    alerts: s.alerts_generated,
    exempted: s.exempted_candidates,
  }));

  const recentDetections = alerts.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Scope Alert Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              Real-time Surface Monitoring
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {activeBrand ? activeBrand.name : 'All Brand Entities'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeBrand?.industry || 'Enterprise'} • {totalAssets} Official Monitored Assets • {alerts.length} Active Threat Signals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateToTab('brands')}
            className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            Manage Brand Assets
          </button>
          <button
            onClick={onTriggerScan}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            Run Immediate Surface Scan
          </button>
        </div>
      </div>

      {/* 4 Primary Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monitored Assets */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monitored Assets</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{totalAssets}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Exclusion registry active</span>
            <span className="font-semibold text-emerald-600">100% Protected</span>
          </div>
        </Card>

        {/* KPI 2: Suspicious Social Profiles */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Suspicious Social</span>
            <div className="p-2 rounded-lg bg-red-50 text-[#DC2626]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#DC2626] mt-2">{socialAlerts.length}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>X, Instagram, Telegram</span>
            <button 
              onClick={() => onNavigateToTab('social')} 
              className="font-semibold text-[#DC2626] hover:underline"
            >
              View Feed &rarr;
            </button>
          </div>
        </Card>

        {/* KPI 3: Suspicious Apps */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Suspicious Apps</span>
            <div className="p-2 rounded-lg bg-red-50 text-[#991B1B]">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#991B1B] mt-2">{appAlerts.length}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Play Store & iOS App Store</span>
            <button 
              onClick={() => onNavigateToTab('apps')} 
              className="font-semibold text-[#991B1B] hover:underline"
            >
              Inspect Apps &rarr;
            </button>
          </div>
        </Card>

        {/* KPI 4: Critical & High Risk Alerts */}
        <Card className="p-5 border-l-4 border-l-[#DC2626]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical / High Alerts</span>
            <div className="p-2 rounded-lg bg-red-100 text-[#991B1B]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {criticalCount + highCount}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>{criticalCount} Critical • {highCount} High</span>
            <span className="font-bold text-red-600">Immediate Action</span>
          </div>
        </Card>
      </div>

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
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB', 
                        borderRadius: '8px', 
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No active threat alerts</div>
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB', 
                        borderRadius: '8px', 
                        fontSize: '12px' 
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="candidates" name="Candidates Audited" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="alerts" name="Threat Alerts Generated" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exempted" name="Excluded (Trusted)" fill="#16A34A" radius={[4, 4, 0, 0]} />
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
          title="Recent Threat Detections" 
          subtitle="Top prioritized lookalikes requiring SOC analyst triage"
          action={
            <button
              onClick={() => onNavigateToTab('threats')}
              className="text-xs font-semibold text-[#DC2626] hover:underline flex items-center gap-1"
            >
              <span>View All Threats ({alerts.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        />
        <div className="divide-y divide-slate-100">
          {recentDetections.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="Zero Threat Detections" 
                description="No active impersonation candidates detected for this brand scope. Run a scan to query external vectors."
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
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    alert.candidate_type === 'social_account' 
                      ? 'bg-red-50 text-[#DC2626]' 
                      : 'bg-red-50 text-[#991B1B]'
                  }`}>
                    {alert.candidate_type === 'social_account' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{alert.candidate_name}</span>
                      <span className="text-xs text-slate-500 font-mono">
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

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <RiskBadge severity={alert.severity} score={alert.risk_score} />
                  <StatusBadge status={alert.status} />
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
