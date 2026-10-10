import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  ShieldCheck, 
  Server, 
  Check, 
  RotateCcw,
  BellRing,
  Lock
} from 'lucide-react';
import { Card, CardHeader } from '../components/SharedUI';

export function SettingsView({ backendHealthy }: { backendHealthy: boolean }) {
  const [saved, setSaved] = useState(false);

  // Model Weights
  const [weights, setWeights] = useState({
    name: 30,
    logo: 25,
    description: 20,
    publisher: 15,
    suspicious: 10,
  });

  // Thresholds
  const [thresholds, setThresholds] = useState({
    alertMin: 40,
    highRisk: 65,
    criticalRisk: 80,
  });

  const [takedownApiEnabled, setTakedownApiEnabled] = useState(true);
  const [notifyOnCritical, setNotifyOnCritical] = useState(true);

  const totalWeight = weights.name + weights.logo + weights.description + weights.publisher + weights.suspicious;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setWeights({
      name: 30,
      logo: 25,
      description: 20,
      publisher: 15,
      suspicious: 10,
    });
    setThresholds({
      alertMin: 40,
      highRisk: 65,
      criticalRisk: 80,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              Platform Configuration
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Detection & Scoring Settings</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Review the scoring and notification preferences available in this interface.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Saved for this session</span>
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-100">
        These controls are currently held in this browser session and are not sent to the scoring backend. Deployed scoring values remain controlled by server configuration.
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scoring Weights */}
        <Card>
          <CardHeader
            title="Explainable Risk Scoring Weights"
            subtitle="Relative contribution of each mathematical signal (Must sum to 100%)"
          />
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">Name & Typosquat Similarity</span>
                <span className="text-[#DC2626] font-mono">{weights.name}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={weights.name}
                onChange={(e) => setWeights({ ...weights, name: Number(e.target.value) })}
                className="w-full accent-[#DC2626]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">Logo Perceptual Hashing (dHash)</span>
                <span className="text-[#DC2626] font-mono">{weights.logo}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={weights.logo}
                onChange={(e) => setWeights({ ...weights, logo: Number(e.target.value) })}
                className="w-full accent-[#DC2626]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">Description & Bio Overlap</span>
                <span className="text-[#DC2626] font-mono">{weights.description}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.description}
                onChange={(e) => setWeights({ ...weights, description: Number(e.target.value) })}
                className="w-full accent-[#DC2626]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">Publisher Identity Mismatch</span>
                <span className="text-[#DC2626] font-mono">{weights.publisher}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.publisher}
                onChange={(e) => setWeights({ ...weights, publisher: Number(e.target.value) })}
                className="w-full accent-[#DC2626]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">Suspicious Behavioral Flags</span>
                <span className="text-[#DC2626] font-mono">{weights.suspicious}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={weights.suspicious}
                onChange={(e) => setWeights({ ...weights, suspicious: Number(e.target.value) })}
                className="w-full accent-[#DC2626]"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Total Sum:</span>
              <span className={`font-mono font-bold ${totalWeight === 100 ? 'text-emerald-700' : 'text-red-600'}`}>
                {totalWeight}% {totalWeight !== 100 && '(Adjustment recommended)'}
              </span>
            </div>
          </div>
        </Card>

        {/* Threat Thresholds & Operational Policy */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Alert Risk Thresholds"
              subtitle="Score cutoffs to trigger SOC notifications and severity levels"
            />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Critical Threat Cutoff</div>
                  <div className="text-[11px] text-slate-500">Requires immediate on-call SOC escalation</div>
                </div>
                <div className="font-mono text-xs font-bold px-2 py-1 bg-red-50 text-[#DC2626] rounded border border-red-200">
                  &gt;= {thresholds.criticalRisk}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">High Threat Cutoff</div>
                  <div className="text-[11px] text-slate-500">Scheduled for analyst triage queue</div>
                </div>
                <div className="font-mono text-xs font-bold px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-200">
                  &gt;= {thresholds.highRisk}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Alert Generation Minimum</div>
                  <div className="text-[11px] text-slate-500">Scores below this are archived without alert</div>
                </div>
                <div className="font-mono text-xs font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200">
                  &gt;= {thresholds.alertMin}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Engine Connectivity & Integrations"
              subtitle="Communication between web console and backend scoring server"
            />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Backend API Health</div>
                  <div className="text-[11px] text-slate-500">Backend health endpoint</div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  backendHealthy 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${backendHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {backendHealthy ? 'Connected' : 'Unavailable'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-800">Takedown provider preference</div>
                  <div className="text-[11px] text-slate-500">No provider is connected; this toggle is a local preference only.</div>
                </div>
                <input
                  type="checkbox"
                  checked={takedownApiEnabled}
                  onChange={(e) => setTakedownApiEnabled(e.target.checked)}
                  className="accent-[#DC2626] w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                >
                  Save Platform Settings
                </button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
