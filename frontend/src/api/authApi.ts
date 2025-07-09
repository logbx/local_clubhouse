import axios from 'axios';
// Removed envConfig import - using environment variables directly

const API_URL = import.meta.env.VITE_API_URL || 'https://localclubhouse.com';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
    return response;
  },
}; 