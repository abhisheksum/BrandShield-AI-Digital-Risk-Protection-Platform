import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = () => api.get('/health');

// Brands CRUD
export const getBrands = () => api.get('/brands');
export const getBrand = (id) => api.get(`/brands/${id}`);
export const createBrand = (data) => api.post('/brands', data);
export const updateBrand = (id, data) => api.put(`/brands/${id}`, data);
export const deleteBrand = (id) => api.delete(`/brands/${id}`);

// Secure Logo Upload
export const uploadBrandLogo = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/brands/${id}/logo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Official Assets CRUD
export const addOfficialAsset = (brandId, data) => api.post(`/brands/${brandId}/assets`, data);
export const getOfficialAssets = (brandId) => api.get(`/brands/${brandId}/assets`);
export const updateOfficialAsset = (assetId, data) => api.put(`/brands/assets/${assetId}`, data);
export const deleteOfficialAsset = (assetId) => api.delete(`/brands/assets/${assetId}`);

// Scans
export const triggerScan = (data) => api.post('/scans', data);
export const getScans = (brandId) => api.get('/scans', { params: { brand_id: brandId } });

// Alerts & Social Monitoring Connectors
export const getAlerts = (params) => api.get('/alerts', { params });
export const getAlertsPaginated = (params) => api.get('/alerts/paginated', { params });
export const getAlert = (id) => api.get(`/alerts/${id}`);
export const updateAlertStatus = (id, data) => api.patch(`/alerts/${id}/status`, data);

// Manual candidate submission
export const submitManualCandidate = (data) => api.post('/alerts/manual', data);

// CSV import connector
export const importCandidatesCsv = (brandId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/alerts/import-csv?brand_id=${brandId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default api;
