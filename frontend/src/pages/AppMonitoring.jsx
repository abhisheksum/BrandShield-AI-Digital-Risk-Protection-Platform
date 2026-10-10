import React, { useState } from 'react';
import { Play, Smartphone, Package, ExternalLink, Filter, Search, Eye } from 'lucide-react';
import { triggerScan } from '../services/api';

export default function AppMonitoring({ activeBrand, alerts, scans, onRefresh, onInspectAlert }) {
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const handleRunAppScan = async () => {
    if (!activeBrand) return;
    setScanning(true);
    try {
      await triggerScan({
        brand_id: activeBrand.id,
        scan_type: 'app_store',
        use_demo_data: true
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to trigger app scan');
    } finally {
      setScanning(false);
    }
  };

  const appAlerts = alerts.filter(a => a.candidate_type === 'mobile_app');
  const filteredAlerts = appAlerts.filter(a => {
    const matchesSearch = a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.candidate_identifier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.publisher_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header and trigger */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-wide">Suspicious Mobile Application Monitoring</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Google Play & iOS App Store
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Detect fake mobile applications, rogue APK distributors, and unauthorized brand clones for <strong className="text-white">{activeBrand?.name || 'Target Brand'}</strong>.
          </p>
        </div>

        <button
          onClick={handleRunAppScan}
          disabled={!activeBrand || scanning}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg ${
            scanning
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          {scanning ? 'Scanning App Stores...' : 'Trigger App Store Scan'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search package ID, app name, or publisher..."
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

      {/* Flagged Applications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Flagged Mobile App Candidates ({filteredAlerts.length})
          </h3>
          <span className="text-xs text-slate-400">
            Verified official package IDs exempted automatically
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Application Title</th>
                <th className="py-3 px-4">Package / Bundle ID</th>
                <th className="py-3 px-4">Publisher Entity</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                      {alert.candidate_name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{alert.description || 'No description'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-indigo-300">{alert.candidate_identifier || 'N/A'}</span>
                    <div className="text-[11px] text-slate-500 capitalize">{alert.platform.replace('_', ' ')}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200 font-medium">{alert.publisher_name || 'Unknown / Unlisted'}</div>
                    <div className="text-[10px] text-amber-400/90 font-medium">Unverified Entity</div>
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
                    No suspicious mobile applications flagged for current filter. Click "Trigger App Store Scan" above.
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
