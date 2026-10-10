import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, AlertTriangle, Eye, CheckCircle2, Clock } from 'lucide-react';

export default function AlertInvestigation({ alerts, onInspectAlert, onStatusUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filtered = alerts.filter(a => {
    const matchesSearch = a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.candidate_identifier || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white tracking-wide">Threat Alert Triage & Investigation</h2>
        <p className="text-sm text-slate-400 mt-1">
          Review mathematical risk scoring evidence, inspect homoglyphs, and manage formal remediation workflows (takedown requests, false-positive exemptions).
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search candidate name or handle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2.5 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="confirmed_impersonation">Confirmed Impersonation</option>
            <option value="takedown_requested">Takedown Requested</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Triage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {alert.severity} Risk
                </span>
                <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {alert.risk_score} / 100
                </span>
              </div>

              <h4 className="text-base font-bold text-white mt-3">{alert.candidate_name}</h4>
              <p className="text-xs font-mono text-indigo-300 mt-0.5">{alert.candidate_identifier || 'No Identifier'}</p>

              <div className="text-xs text-slate-400 mt-2 line-clamp-2">
                {alert.structured_evidence?.reasons?.[0] || alert.description || 'Elevated risk parameters detected'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <select
                value={alert.status}
                onChange={(e) => onStatusUpdate(alert.id, e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="new">New</option>
                <option value="under_investigation">Investigating</option>
                <option value="confirmed_impersonation">Confirmed</option>
                <option value="takedown_requested">Takedown</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False Positive</option>
              </select>

              <button
                onClick={() => onInspectAlert(alert)}
                className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-medium transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Evidence
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-xl">
            No alerts match the chosen search & triage filters.
          </div>
        )}
      </div>
    </div>
  );
}
