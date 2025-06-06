import axios from 'axios';
import { envConfig } from '../config/env';

const API_URL = envConfig.apiUrl;

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
    return response;
  },
}; 