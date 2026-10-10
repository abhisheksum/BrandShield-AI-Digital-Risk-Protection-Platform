import axios, { type AxiosResponse } from 'axios';
import type { AppUser, Brand, HealthStatus, OfficialAsset } from '../types';

const apiBaseUrl = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';

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

export const getBrands = () => api.get<Brand[]>('/brands');
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
export const getOfficialAssets = (brandId: number) => api.get(`/brands/${brandId}/assets`);
export const updateOfficialAsset = (assetId: number, data: Partial<OfficialAsset>) =>
  api.put(`/brands/assets/${assetId}`, data);
export const deleteOfficialAsset = (assetId: number) => api.delete(`/brands/assets/${assetId}`);

export const triggerScan = (data: ScanRequest) => api.post('/scans', data);
export const getScans = (brandId: number) => api.get('/scans', { params: { brand_id: brandId } });

export const getAlerts = (params: Record<string, number | string | undefined>) =>
  api.get('/alerts', { params });
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