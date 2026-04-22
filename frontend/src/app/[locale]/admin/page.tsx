'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

/**
 * Qisqa URL: /uz/admin → /uz/17210707admin (yoki login).
 * Faqat admin rolidagi userlar kira oladi.
 */
export default function AdminShortcutPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const locale = params?.locale ?? 'uz';
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (!user?.is_staff && user?.role !== 'admin') {
      router.replace(`/${locale}/profile`);
      return;
    }
    router.replace(`/${locale}/17210707admin`);
  }, [isAuthenticated, user, router, params]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-zinc-400 text-sm">Admin panelga yo&apos;naltirilmoqda...</p>
    </div>
  );
}
