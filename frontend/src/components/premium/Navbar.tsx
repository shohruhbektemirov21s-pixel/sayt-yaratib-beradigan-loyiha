'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Coins, History, LogOut, Settings, Sparkles, User } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function PremiumNavbar() {
  const t = useTranslations('Navbar');
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // SSR/hydration mismatch oldini olish
  useEffect(() => { setMounted(true); }, []);

  // Tashqi bosilganda menyu yopilsin
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push('/');
  };

  const nanoCoins = user?.nano_coins ?? 0;
  const initials = (user?.full_name || user?.email || '?').slice(0, 1).toUpperCase();
  
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.8)"]
  );
  
  const borderBottom = useTransform(
    scrollY,
    [0, 50],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.1)"]
  );

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', updateScrolled);
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  return (
    <motion.nav
      style={{ backgroundColor, borderBottom }}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-xl h-20 flex items-center"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            NanoStUp
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-10">
          {[
            { name: t('features'), href: '#features' },
            { name: t('pricing'), href: '#pricing' },
            { name: t('showcase'), href: '#showcase' }
          ].map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          {/* Auth'siz ko'rinish */}
          {mounted && !isAuthenticated && (
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                {t('login')}
              </Link>
              <Link href="/register">
                <Button className="bg-white text-black hover:bg-zinc-200 rounded-2xl h-11 px-6 font-bold shadow-xl shadow-white/10 active:scale-95 transition-all">
                  {t('getStarted')}
                </Button>
              </Link>
            </div>
          )}

          {/* Auth bo'lgan user ko'rinishi */}
          {mounted && isAuthenticated && user && (
            <div className="flex items-center gap-3" ref={menuRef}>
              {/* Balans badge */}
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2 px-3 h-10 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl hover:from-amber-500/20 hover:to-orange-500/20 transition-all"
                title="Balansingiz"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-200">
                  {nanoCoins.toLocaleString('en')} <span className="text-[10px] text-amber-400/80 font-semibold">nano</span>
                </span>
              </Link>

              {/* Builder tugmasi */}
              <Link href="/builder" className="hidden sm:block">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl h-11 px-5 font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
                  <Sparkles className="w-4 h-4 mr-1" /> Builder
                </Button>
              </Link>

              {/* User avatar dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black border-2 border-white/20 hover:border-white/40 transition-all"
                >
                  {initials}
                </button>

                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/10">
                      <p className="font-bold text-white truncate">{user.full_name || 'Foydalanuvchi'}</p>
                      <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                      <div className="mt-3 flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <span className="text-xs text-amber-200/80">Nano koin</span>
                        <span className="text-sm font-black text-amber-300">{nanoCoins.toLocaleString('en')}</span>
                      </div>
                    </div>
                    <div className="py-2">
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <User className="w-4 h-4" /> Profil & obuna
                      </Link>
                      <Link
                        href="/history"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <History className="w-4 h-4" /> Tarix va suhbatlar
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Tariflar
                      </Link>
                    </div>
                    <div className="py-2 border-t border-white/10">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Chiqish
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
