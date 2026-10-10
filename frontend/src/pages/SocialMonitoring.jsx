import React, { useState } from 'react';
import { Play, ShieldAlert, CheckCircle2, AlertOctagon, ExternalLink, Filter, Search, Eye } from 'lucide-react';
import { triggerScan } from '../services/api';

export default function SocialMonitoring({ activeBrand, alerts, scans, onRefresh, onInspectAlert }) {
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const handleRunSocialScan = async () => {
    if (!activeBrand) return;
    setScanning(true);
    try {
      await triggerScan({
        brand_id: activeBrand.id,
        scan_type: 'social',
        use_demo_data: true
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to trigger social scan');
    } finally {
      setScanning(false);
    }
  };

  const socialAlerts = alerts.filter(a => a.candidate_type === 'social_account');
  const filteredAlerts = socialAlerts.filter(a => {
    const matchesSearch = a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.candidate_identifier || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header and trigger */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-wide">Social Media Impersonation Monitoring</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              X, Instagram, LinkedIn
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Detect typosquat handles, homoglyphs, and unauthorized customer support scams targeting <strong className="text-white">{activeBrand?.name || 'Target Brand'}</strong>.
          </p>
        </div>

        <button
          onClick={handleRunSocialScan}
          disabled={!activeBrand || scanning}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg ${
            scanning
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          {scanning ? 'Scanning Social Sources...' : 'Trigger Social Scan'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search candidate handle or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2.5 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Candidates & Impersonation Alert Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Flagged Social Impersonation Candidates ({filteredAlerts.length})
          </h3>
          <span className="text-xs text-slate-400">
            Protected against verified handles via Exclusion Registry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Candidate Profile</th>
                <th className="py-3 px-4">Platform / Handle</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Primary Flag</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{alert.candidate_name}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{alert.description || 'No description'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-indigo-300">{alert.candidate_identifier || 'N/A'}</span>
                    <div className="text-[11px] text-slate-500 capitalize">{alert.platform}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                    {alert.risk_score}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">
                    {alert.structured_evidence?.reasons?.[0] || 'High name similarity'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] capitalize bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {alert.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onInspectAlert(alert)}
                      className="inline-flex items-center gap-1 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white px-2.5 py-1.5 rounded transition font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}

              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No social impersonation alerts found for current filter. Click "Trigger Social Scan" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
