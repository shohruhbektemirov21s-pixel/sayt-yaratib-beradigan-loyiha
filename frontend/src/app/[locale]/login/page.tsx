'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lockedMinutes, setLockedMinutes] = useState<number | null>(null);

  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRemaining(null);
    setLockedMinutes(null);
    try {
      const response = await api.post('/accounts/login/', { email, password });
      const { access } = response.data;

      const userResponse = await api.get('/accounts/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });

      setAuth(userResponse.data, access);
      router.push('/builder');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as {
          detail?: string;
          remaining_attempts?: number;
          retry_after_minutes?: number;
          locked?: boolean;
        } | undefined;
        setError(data?.detail || err.message || "Noto'g'ri email yoki parol");
        if (typeof data?.remaining_attempts === 'number') setRemaining(data.remaining_attempts);
        if (data?.locked && typeof data?.retry_after_minutes === 'number') {
          setLockedMinutes(data.retry_after_minutes);
        }
      } else {
        setError("Noto'g'ri email yoki parol");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Xush kelibsiz</h1>
          <p className="text-gray-500 mt-2">Davom etish uchun hisobingizga kiring</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">Email manzili</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">Parol</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                lockedMinutes !== null
                  ? 'bg-red-500/10 border-red-500/40 text-red-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <p className="font-medium">{error}</p>
              {lockedMinutes !== null && (
                <p className="mt-1 text-xs opacity-90">
                  Iltimos, <b>{lockedMinutes} daqiqadan</b> keyin qayta urining.
                </p>
              )}
              {lockedMinutes === null && remaining !== null && remaining > 0 && (
                <p className="mt-1 text-xs opacity-80">
                  Qolgan urinishlar: <b>{remaining}/5</b>. Tugasa 30 daqiqaga bloklanadi.
                </p>
              )}
            </div>
          )}

          <Button 
            disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirish'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Hisobingiz yo&apos;qmi? {' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">Ro&apos;yxatdan o&apos;tish</Link>
        </p>
      </motion.div>
    </div>
  );
}
