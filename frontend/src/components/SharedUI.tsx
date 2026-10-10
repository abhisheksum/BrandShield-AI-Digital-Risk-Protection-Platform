import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { AlertSeverity, AlertStatus } from '../types';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-5 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}>
      <div>
        <h3 className="font-semibold text-slate-900 tracking-tight text-base">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function RiskBadge({ severity, score }: { severity: AlertSeverity; score?: number }) {
  const configs = {
    critical: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      icon: ShieldAlert,
      label: 'Critical Risk',
    },
    high: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: AlertTriangle,
      label: 'High Risk',
    },
    medium: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertCircle,
      label: 'Review Needed',
    },
    low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Low Risk',
    },
  };

  const current = configs[severity] || configs.medium;
  const Icon = current.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{score !== undefined ? `${current.label} · ${score.toFixed(1)} / 100` : current.label}</span>
    </span>
  );
}

export function SourceBadge({ source }: { source: 'demo' | 'manual' | 'live' | 'unavailable' }) {
  const configs = {
    demo: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Synthetic' },
    manual: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Imported' },
    live: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Live' },
    unavailable: { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Unavailable' },
  };
  const c = configs[source] || configs.unavailable;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${c.bg}`}>
      {c.label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) {
  const conf = confidence || 'medium';
  const configs = {
    high: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', label: 'High Confidence' },
    medium: { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Medium Confidence' },
    low: { bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400', label: 'Low Confidence' },
  };
  const current = configs[conf] || configs.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${current.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  const map: Record<AlertStatus, { bg: string; text: string; border: string; label: string }> = {
    new: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'New' },
    under_investigation: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Investigating' },
    confirmed_impersonation: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Confirmed' },
    takedown_requested: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Takedown Requested' },
    resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Resolved' },
    false_positive: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Not a Threat' },
  };

  const item = map[status] || map.new;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${item.bg} ${item.text} ${item.border}`}>
      {item.label}
    </span>
  );
}

export function LoadingState({ message = 'Loading data…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-slate-200 text-center">
      <Loader2 className="w-8 h-8 text-[#166534] animate-spin mb-3" />
      <h4 className="text-sm font-semibold text-slate-800">{message}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        Fetching data from backend. This usually takes a moment.
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 bg-white rounded-xl border border-dashed border-slate-300 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Info className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-red-50/60 rounded-xl border border-red-200 text-center">
      <AlertTriangle className="w-10 h-10 text-red-600 mb-2" />
      <h4 className="text-sm font-bold text-red-900">Something went wrong</h4>
      <p className="text-xs text-red-700 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-slate-950 rounded-md px-3 py-1.5 text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}
