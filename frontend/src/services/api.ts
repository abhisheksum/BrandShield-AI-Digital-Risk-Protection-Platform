import axios, { type AxiosResponse } from 'axios';
import type { AppUser, Brand, HealthStatus, OfficialAsset } from '../types';

const configuredApiUrl = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
const productionApiUrl = 'https://rakshak-ai-digital-risk-protection.onrender.com/api';

export function normalizeApiBaseUrl(value?: string, isProduction = import.meta.env.PROD) {
  let candidate = value?.trim();
  if (!candidate) candidate = isProduction ? productionApiUrl : '/api';

  // Netlify environment exports can be copied with a display prefix or quotes.
  candidate = candidate.replace(/^value\s+/i, '').replace(/^['"]|['"]$/g, '').trim();
  if (!candidate) throw new Error('VITE_API_URL is empty after normalization');

  if (candidate.startsWith('/')) {
    return candidate.replace(/\/+$/, '') || '/api';
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('VITE_API_URL must be an absolute URL or a /api-relative path');
  }
  const path = parsed.pathname.replace(/\/+$/, '');
  parsed.pathname = path === '/api' || path.endsWith('/api') ? path : `${path}/api`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

export const apiBaseUrl = normalizeApiBaseUrl(configuredApiUrl);

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type ApiError = {
  response?: {
    data?: {
      detail?: string | Array<{ msg?: string } | string>;
    };
  };
  message?: string;
};

export class ApiResponseError extends Error {
  readonly kind = 'response';
  constructor(
    readonly endpoint: string,
    received: unknown,
    expected = 'an array',
  ) {
    const shape = Array.isArray(received) ? 'array' : received === null ? 'null' : typeof received;
    super(`Invalid response from ${endpoint}: expected ${expected}, received ${shape}`);
    this.name = 'ApiResponseError';
  }
}

export function describeApiError(error: unknown) {
  if (error instanceof ApiResponseError) return error.message;
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return `HTTP ${error.response.status} from ${error.config?.url || 'Rakshak API'}`;
    }
    return `Network error contacting Rakshak API: ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Unknown Rakshak API error';
}

export type ApiResponse<T> = AxiosResponse<T>;

export interface AuthPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthPayload {
  organisation_name: string;
  website?: string;
}

export interface AuthResponse {
  access_token: string;
  user: AppUser;
}

export interface ManualCandidatePayload {
  brand_id: number;
  platform: string;
  candidate_name: string;
  candidate_identifier?: string;
  candidate_url?: string;
  description?: string;
  is_unverified_new_account?: boolean;
}

export interface ManualCandidateResult {
  risk_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alert_id?: number;
}

export interface ScanRequest {
  brand_id: number;
  scan_type: 'all' | 'social' | 'app_store';
  use_demo_data?: boolean;
}

export const resolveAssetUrl = (assetUrl?: string) => {
  if (!assetUrl || !assetUrl.startsWith('/')) return assetUrl;
  const configuredApiUrl = apiBaseUrl;
  const apiOrigin = configuredApiUrl.startsWith('http')
    ? new URL(configuredApiUrl).origin
    : window.location.origin;
  return new URL(assetUrl, apiOrigin).toString();
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rakshak_token');
  if (!token) return config;

  const headers = axios.AxiosHeaders.from(config.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;
  return config;
});

export const getHealth = () => api.get<HealthStatus>('/health');

export const registerUser = (data: RegisterPayload) => api.post<AuthResponse>('/auth/register', data);
export const loginUser = (data: AuthPayload) => api.post<AuthResponse>('/auth/login', data);
export const getMe = () => api.get<AppUser>('/auth/me');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseArrayResponse<T>(
  response: AxiosResponse<unknown>,
  endpoint: string,
  isItem: (value: unknown) => value is T,
): AxiosResponse<T[]> {
  if (!Array.isArray(response.data) || !response.data.every(isItem)) {
    throw new ApiResponseError(endpoint, response.data);
  }
  return response as AxiosResponse<T[]>;
}

export function parseObjectResponse<T>(
  response: AxiosResponse<unknown>,
  endpoint: string,
  isItem: (value: unknown) => value is T,
): AxiosResponse<T> {
  if (!isItem(response.data)) {
    throw new ApiResponseError(endpoint, response.data, 'an object');
  }
  return response as AxiosResponse<T>;
}

function isBrand(value: unknown): value is Brand {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string' &&
    Array.isArray(value.official_assets) && value.official_assets.every(isOfficialAsset);
}

function isOfficialAsset(value: unknown): value is OfficialAsset {
  return isRecord(value) && typeof value.id === 'number' && typeof value.brand_id === 'number' &&
    typeof value.identifier === 'string';
}

function isAlert(value: unknown): value is import('../types').ThreatAlert {
  return isRecord(value) && typeof value.id === 'number' && typeof value.brand_id === 'number' &&
    typeof value.candidate_name === 'string' && typeof value.structured_evidence === 'object';
}

function isScan(value: unknown): value is import('../types').ScanAudit {
  return isRecord(value) && typeof value.id === 'number' && typeof value.brand_id === 'number' &&
    typeof value.scan_type === 'string' && typeof value.status === 'string';
}

export const getBrands = () => api.get<unknown>('/brands').then((response) => parseArrayResponse(response, '/brands', isBrand));
export const getBrand = (id: number) => api.get<Brand>(`/brands/${id}`);
export const createBrand = (data: Partial<Brand>) => api.post<Brand>('/brands', data);
export const updateBrand = (id: number, data: Partial<Brand>) => api.put<Brand>(`/brands/${id}`, data);
export const deleteBrand = (id: number) => api.delete(`/brands/${id}`);

export const uploadBrandLogo = (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/brands/${id}/logo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const addOfficialAsset = (brandId: number, data: Partial<OfficialAsset>) =>
  api.post(`/brands/${brandId}/assets`, data);
export const getOfficialAssets = (brandId: number) =>
  api.get<unknown>(`/brands/${brandId}/assets`).then((response) =>
    parseArrayResponse(response, `/brands/${brandId}/assets`, isOfficialAsset));
export const updateOfficialAsset = (assetId: number, data: Partial<OfficialAsset>) =>
  api.put(`/brands/assets/${assetId}`, data);
export const deleteOfficialAsset = (assetId: number) => api.delete(`/brands/assets/${assetId}`);

export const triggerScan = (data: ScanRequest) =>
  api.post<unknown>('/scans', data).then((response) => parseObjectResponse(response, '/scans', isScan));
export const getScans = (brandId: number) =>
  api.get<unknown>('/scans', { params: { brand_id: brandId } }).then((response) =>
    parseArrayResponse(response, '/scans', isScan));

export const getAlerts = (params: Record<string, number | string | undefined>) =>
  api.get<unknown>('/alerts', { params }).then((response) =>
    parseArrayResponse(response, '/alerts', isAlert));
export const getAlertsPaginated = (params: Record<string, number | string | undefined>) =>
  api.get('/alerts/paginated', { params });
export const getAlert = (id: number) => api.get(`/alerts/${id}`);
export const updateAlertStatus = (id: number, data: Record<string, unknown>) =>
  api.patch(`/alerts/${id}/status`, data);

export const submitManualCandidate = (data: ManualCandidatePayload) =>
  api.post<ManualCandidateResult>('/alerts/manual', data);

export const importCandidatesCsv = (brandId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/alerts/import-csv?brand_id=${brandId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default api;