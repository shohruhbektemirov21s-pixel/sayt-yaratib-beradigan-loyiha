import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  // `localhost` ayrim tizimlarda IPv6 (::1) ga ketib, 127.0.0.1 dagi backendga ulanmasligi mumkin.
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    if (!error.response && error.code === 'ECONNABORTED') {
      error.message = 'Server javobi kechikdi. Qayta urinib ko‘ring.';
    } else if (!error.response) {
      error.message = 'Server bilan ulanishda muammo. Backend ishga tushganini tekshiring.';
    }
    return Promise.reject(error);
  }
);

export default api;
