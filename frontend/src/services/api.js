import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = () => axios.get('/health');

// Brands
export const getBrands = () => api.get('/brands');
export const getBrand = (id) => api.get(`/brands/${id}`);
export const createBrand = (data) => api.post('/brands', data);
export const deleteBrand = (id) => api.delete(`/brands/${id}`);

// Official Assets
export const addOfficialAsset = (brandId, data) => api.post(`/brands/${brandId}/assets`, data);
export const getOfficialAssets = (brandId) => api.get(`/brands/${brandId}/assets`);
export const deleteOfficialAsset = (assetId) => api.delete(`/brands/assets/${assetId}`);

// Scans
export const triggerScan = (data) => api.post('/scans', data);
export const getScans = (brandId) => api.get('/scans', { params: { brand_id: brandId } });

// Alerts
export const getAlerts = (params) => api.get('/alerts', { params });
export const getAlert = (id) => api.get(`/alerts/${id}`);
export const updateAlertStatus = (id, data) => api.patch(`/alerts/${id}/status`, data);

export default api;
