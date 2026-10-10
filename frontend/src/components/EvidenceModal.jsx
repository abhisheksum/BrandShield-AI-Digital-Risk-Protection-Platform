import React from 'react';
import { X, AlertTriangle, ShieldCheck, Info, ExternalLink } from 'lucide-react';

export default function EvidenceModal({ alert, onClose, onStatusUpdate }) {
  if (!alert) return null;

  const evidence = alert.structured_evidence || {};
  const signals = evidence.signals || {};
  const reasons = evidence.reasons || [];
  const missing = evidence.missing_signals || [];

  const signalMeta = [
    { key: 'name_similarity', label: 'Name & Typosquat Similarity', weight: '30%' },
    { key: 'logo_similarity', label: 'Logo & Visual Similarity', weight: '25%' },
    { key: 'description_similarity', label: 'Description & Bio Overlap', weight: '20%' },
    { key: 'publisher_mismatch', label: 'Publisher / Account Mismatch', weight: '15%' },
    { key: 'suspicious_indicators', label: 'Suspicious Behavior Indicators', weight: '10%' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${
              alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-wide">{alert.candidate_name}</h3>
                {alert.is_demo ? (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Synthetic Fixture
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Telemetry
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Platform: <span className="text-slate-200 capitalize font-medium">{alert.platform}</span> • Type: <span className="text-slate-200 font-medium">{alert.candidate_type}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Calculated Risk Score</div>
                <div className="text-3xl font-extrabold text-white mt-1">
                  {alert.risk_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
              </div>
              <div className={`text-sm font-bold uppercase px-3 py-1.5 rounded-md ${
                alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {alert.severity} Risk
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-lg">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Triage Status</div>
              <div className="mt-2">
                <select
                  value={alert.status}
                  onChange={(e) => onStatusUpdate(alert.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="new">New</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="confirmed_impersonation">Confirmed Impersonation</option>
                  <option value="takedown_requested">Takedown Requested</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positive</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-lg">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Target Canonical Link</div>
              <div className="mt-2 truncate">
                {alert.candidate_url ? (
                  <a
                    href={alert.candidate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1.5 underline truncate"
                  >
                    <span className="truncate">{alert.candidate_url}</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">No URL provided</span>
                )}
              </div>
            </div>
          </div>

          {/* Explainable Signals Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Explainable Risk Signal Matrix
            </h4>
            <div className="space-y-3">
              {signalMeta.map(({ key, label, weight }) => {
                const sig = signals[key] || {};
                const isAvailable = sig.available !== false;
                const rawScore = sig.raw_score !== null && sig.raw_score !== undefined ? sig.raw_score : 0;
                const contribution = sig.effective_contribution || 0;

                return (
                  <div key={key} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{label}</span>
                        <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          Weight: {weight}
                        </span>
                        {!isAvailable && (
                          <span className="text-xs text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Signal Unavailable (Weight Rebalanced)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {sig.explanation || 'No observation available'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      {isAvailable ? (
                        <>
                          <div>
                            <div className="text-xs text-slate-400">Signal Score</div>
                            <div className="text-sm font-bold text-slate-200">{rawScore}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Contribution</div>
                            <div className="text-sm font-bold text-indigo-400">+{contribution} pts</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500 italic">Excluded from penalty</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Impersonation Indicators */}
          {reasons.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                Detected Impersonation & Typosquat Patterns
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Bio/Description Preview */}
          {alert.description && (
            <div className="bg-slate-800/20 border border-slate-800 rounded-lg p-3.5">
              <div className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">Observed Bio / Description</div>
              <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-850 whitespace-pre-wrap">
                {alert.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
          >
            Close Evidence Triage
          </button>
        </div>
      </div>
    </div>
  );
}
