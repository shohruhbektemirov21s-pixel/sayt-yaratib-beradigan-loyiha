import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/',
  timeout: 180000,
  withCredentials: false,
});

// ── Request: token + muddatni tekshirish ─────────────────────────
api.interceptors.request.use((config) => {
  const store = useAuthStore.getState();

  // Token muddati o'tgan — logout
  if (store.isAuthenticated && store.isTokenExpired()) {
    store.logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return Promise.reject(new Error("Sessiya muddati tugadi. Qayta kiring."));
  }

  if (store.token) {
    config.headers.Authorization = `Bearer ${store.token}`;
  }
  return config;
});

// ── Response: xatoliklarni yumshatish ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      error.message = retryAfter
        ? `Juda ko'p so'rov. ${retryAfter} soniyadan keyin urining.`
        : "Juda ko'p so'rov. Biroz kuting.";
    } else if (!error.response && error.code === 'ECONNABORTED') {
      error.message = 'Server javobi kechikdi (timeout). Qayta urining.';
    } else if (!error.response) {
      error.message = 'Server bilan ulanishda muammo.';
    }

    return Promise.reject(error);
  }
);

export default api;
