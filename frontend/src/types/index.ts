export interface AppUser {
  id: number;
  email: string;
  organisation_name: string;
  website?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OfficialAsset {
  id: number;
  brand_id: number;
  asset_type: 'social' | 'mobile_app' | 'domain';
  platform: string;
  identifier: string;
  app_name?: string;
  canonical_url?: string;
  publisher_name?: string;
  publisher_id?: string;
  verified: boolean;
  notes?: string;
  created_at: string;
}

export interface Brand {
  id: number;
  name: string;
  canonical_name?: string;
  website?: string;
  industry?: string;
  description?: string;
  keywords?: string;
  aliases?: string;
  logo_url?: string;
  logo_hash?: string;
  official_assets: OfficialAsset[];
  created_at: string;
  updated_at?: string;
}

export interface SignalDetail {
  score: number;
  available: boolean;
  notes?: string;
  breakdown?: Record<string, unknown>;
}

export interface StructuredEvidence {
  source_type?: 'demo_data' | 'manual_submission' | 'csv_import' | 'live_source' | string;
  matched_brand_name?: string;
  signals?: Record<string, SignalDetail>;
  weights_used?: Record<string, number>;
  reasons?: string[];
  missing_signals?: string[];
  norm_candidate?: string;
  norm_target?: string;
  homoglyphs_detected?: boolean;
  combosquat_detected?: boolean;
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus =
  | 'new'
  | 'under_investigation'
  | 'confirmed_impersonation'
  | 'takedown_requested'
  | 'resolved'
  | 'false_positive';

export type AlertConfidence = 'high' | 'medium' | 'low';

export interface ThreatAlert {
  id: number;
  brand_id: number;
  scan_id?: number;
  candidate_type: 'social_account' | 'mobile_app';
  platform: string;
  candidate_name: string;
  candidate_identifier?: string | null;
  candidate_url?: string;
  candidate_avatar_url?: string;
  publisher_name?: string;
  package_id?: string;
  risk_score: number;
  severity: AlertSeverity;
  confidence?: AlertConfidence;
  recommended_action?: string;
  status: AlertStatus;
  resolution_notes?: string;
  investigation_notes?: string;
  analyst_name?: string;
  status_changed_at?: string;
  dismissed_at?: string;
  is_demo: boolean | number;
  structured_evidence: StructuredEvidence;
  created_at: string;
  updated_at?: string;
}

export interface ScanAudit {
  id: number;
  brand_id: number;
  scan_type: 'social' | 'app_store' | 'all';
  status: 'completed' | 'partial' | 'in_progress' | 'failed';
  total_candidates: number;
  candidates_evaluated?: number;
  official_assets_excluded?: number;
  /** Present only in older local fixtures; the backend returns official_assets_excluded. */
  exempted_candidates?: number;
  alerts_generated: number;
  completed_at?: string;
  created_at: string;
  error_details?: string;
  is_demo?: number | boolean;
  source_summary?: Record<string, {
    collector_name: string;
    status: 'completed' | 'partial' | 'unavailable' | 'rate_limited' | 'timeout' | 'failed';
    candidates_count: number;
    candidates_evaluated?: number;
    official_assets_excluded?: number;
    findings_generated?: number;
    message?: string;
    error_details?: string;
    duration_ms?: number;
    timestamp?: string;
    is_demo?: boolean;
  }>;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}
