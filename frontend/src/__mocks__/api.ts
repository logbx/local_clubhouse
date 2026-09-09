import axios from 'axios';

const baseURL = 'http://localhost:3001/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
