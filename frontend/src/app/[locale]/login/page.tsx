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
  
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/accounts/login/', { email, password });
      const { access, refresh } = response.data;
      
      // Get user info
      const userResponse = await api.get('/accounts/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      
      setAuth(userResponse.data, access);
      router.push('/builder');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { detail?: string } | undefined)?.detail || err.message || 'Invalid credentials');
      } else {
        setError('Invalid credentials');
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
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500 mt-2">Login to continue building your dreams</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">Email Address</label>
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
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button 
            disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Don't have an account? {' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}
