import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Activity, Globe, Smartphone, ArrowUpRight } from 'lucide-react';

export default function OverviewDashboard({ brands, activeBrand, alerts, scans, onSelectBrand, onInspectAlert }) {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved' || a.status === 'false_positive').length;

  const socialCount = alerts.filter(a => a.candidate_type === 'social_account').length;
  const appCount = alerts.filter(a => a.candidate_type === 'mobile_app').length;

  return (
    <div className="space-y-6">
      {/* Platform Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">SOC Telemetry Active</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Digital Risk Threat Landscape</h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitoring active threat surfaces for <strong className="text-white">{activeBrand?.name || 'All Registered Brands'}</strong>.
          </p>
        </div>

        {brands.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold">Active Scope:</span>
            <select
              value={activeBrand?.id || ''}
              onChange={(e) => {
                const b = brands.find(item => item.id === parseInt(e.target.value));
                if (b) onSelectBrand(b);
              }}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:border-indigo-500 focus:outline-none"
            >
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Critical Threat Alerts</div>
            <div className="text-3xl font-extrabold text-red-400 mt-1">{criticalCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Immediate triage needed</div>
          </div>
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">High Threat Alerts</div>
            <div className="text-3xl font-extrabold text-amber-400 mt-1">{highCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Substantial mimicry detected</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Impersonations</div>
            <div className="text-3xl font-extrabold text-white mt-1">{socialCount + appCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span className="text-indigo-400 font-semibold">{socialCount}</span> Social • <span className="text-emerald-400 font-semibold">{appCount}</span> Mobile Apps
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Triage & Resolved</div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{resolvedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Remediated / Verified FP</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Highest Risk Alerts Triage List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Top Priority Impersonation Alerts</h3>
            <span className="text-xs text-slate-400 font-mono">Sorted by Risk Score</span>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                onClick={() => onInspectAlert(alert)}
                className="p-3.5 bg-slate-800/40 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {alert.candidate_type === 'social_account' ? <Globe className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{alert.candidate_name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{alert.candidate_identifier}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                      {alert.structured_evidence?.reasons?.[0] || alert.description || 'Elevated risk indicators detected'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs text-slate-500">Risk Score</div>
                    <div className="text-sm font-extrabold text-white">{alert.risk_score}</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">
                No active threats detected. Trigger a scan from the Social or App Monitoring tab.
              </div>
            )}
          </div>
        </div>

        {/* Scan Audit Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Recent Scan Audits</h3>
            <span className="text-xs text-slate-400">{scans.length} Executed</span>
          </div>

          <div className="space-y-3">
            {scans.slice(0, 5).map((scan) => (
              <div key={scan.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white capitalize">{scan.scan_type.replace('_', ' ')} Scan</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {scan.status}
                  </span>
                </div>
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Candidates evaluated: {scan.total_candidates}</span>
                  <span className="text-amber-400 font-semibold">{scan.alerts_generated} alerts</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {new Date(scan.created_at).toLocaleString()} {scan.is_demo ? '• Demo Fixture' : '• Live'}
                </div>
              </div>
            ))}

            {scans.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">
                No scan history logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
