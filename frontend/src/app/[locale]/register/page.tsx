'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import axios from 'axios';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/accounts/register/', { 
        email, 
        password, 
        full_name: fullName 
      });
      router.push('/login');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as Record<string, unknown> | undefined;
        setError(Object.values(payload || {}).join(' ') || err.message || 'Registration failed');
      } else {
        setError('Registration failed');
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
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-gray-500 mt-2">Start building your AI website today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">Full Name</label>
            <input 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="John Doe"
            />
          </div>
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account? {' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}
