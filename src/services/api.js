import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Houses API
export const housesAPI = {
    // Get all houses for a period
    getByPeriod: async (period) => {
        const response = await api.get(`/houses/${period}`);
        return response.data;
    },

    // Get specific house
    getHouse: async (period, label) => {
        const response = await api.get(`/houses/${period}/${label}`);
        return response.data;
    },

    // Create or update house
    saveHouse: async (houseData) => {
        const response = await api.post('/houses', houseData);
        return response.data;
    },

    // Bulk update houses
    bulkSave: async (houses) => {
        const response = await api.post('/houses/bulk', { houses });
        return response.data;
    },

    // Delete house
    deleteHouse: async (period, label) => {
        const response = await api.delete(`/houses/${period}/${label}`);
        return response.data;
    },
};

// Billing Periods API
export const periodsAPI = {
    // Get all periods
    getAll: async () => {
        const response = await api.get('/periods');
        return response.data;
    },

    // Add new period
    add: async (value, label) => {
        const response = await api.post('/periods', { value, label });
        return response.data;
    },

    // Remove period
    remove: async (value) => {
        const response = await api.delete(`/periods/${value}`);
        return response.data;
    },

    // Initialize defaults
    initDefaults: async () => {
        const response = await api.post('/periods/init-defaults');
        return response.data;
    },
};

// Rates API
export const ratesAPI = {
    // Get active rates
    get: async () => {
        const response = await api.get('/rates');
        return response.data;
    },

    // Update rates
    update: async (electricity, water) => {
        const response = await api.post('/rates', { electricity, water });
        return response.data;
    },

    // Reset to defaults
    reset: async () => {
        const response = await api.post('/rates/reset');
        return response.data;
    },
};

// Images API
export const imagesAPI = {
    // Get image
    get: async (houseLabel, period, type) => {
        const response = await api.get(`/images/${houseLabel}/${period}/${type}`);
        return response.data;
    },

    // Upload image
    upload: async (houseLabel, period, type, imageData, mimeType = 'image/jpeg') => {
        const response = await api.post('/images', {
            houseLabel,
            period,
            type,
            imageData,
            mimeType,
        });
        return response.data;
    },

    // Delete image
    delete: async (houseLabel, period, type) => {
        const response = await api.delete(`/images/${houseLabel}/${period}/${type}`);
        return response.data;
    },
};

// Health check
export const healthCheck = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;
