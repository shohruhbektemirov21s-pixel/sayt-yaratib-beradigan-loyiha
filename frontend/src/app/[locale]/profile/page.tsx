'use client';

import { motion } from 'framer-motion';
import {
  Calendar, Check, CheckCircle2, Coins, CreditCard,
  Loader2, Mail, Sparkles, TrendingUp, User as UserIcon, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────
interface Tariff {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  projects_limit: number;
  ai_generations_limit: number;
  nano_coins_included: number;
  weekly_allowance: number;
  features?: string[];
  is_active?: boolean;
}

interface Subscription {
  id: number;
  tariff: Tariff;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  start_date: string;
  end_date: string;
  projects_created: number;
  generations_used: number;
}

interface PurchaseResponse {
  success: boolean;
  subscription: Subscription;
  nano_granted: number;
  monthly_total: number;
  weekly_allowance: number;
  new_balance: number;
  nano_coins: number;
  message?: string;
}

// ── Helpers ───────────────────────────────────────────────
function daysLeft(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uz-UZ', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function priceLabel(price: string): string {
  const n = parseFloat(price);
  if (n === 0) return 'Bepul';
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

// ── Sahifa ────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateBalance } = useAuthStore();

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth tekshirish
  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Ma'lumotlarni yuklash
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tariffsRes, meRes] = await Promise.all([
        api.get<Tariff[]>('/subscriptions/tariffs/'),
        api.get<{ tokens_balance: number; nano_coins: number }>('/accounts/me/'),
      ]);
      setTariffs(tariffsRes.data.filter((t) => t.is_active !== false));
      updateBalance(meRes.data.tokens_balance, meRes.data.nano_coins);

      // Faol obuna
      try {
        const subRes = await api.get<Subscription>('/subscriptions/my/current/');
        setCurrentSub(subRes.data);
      } catch {
        setCurrentSub(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [updateBalance]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  // Tarifni sotib olish
  const handlePurchase = async (tariff: Tariff) => {
    if (parseFloat(tariff.price) === 0) {
      setMessage({ type: 'error', text: "Bepul tarifni sotib olish shart emas." });
      return;
    }
    setPurchasing(tariff.id);
    setMessage(null);
    try {
      const res = await api.post<PurchaseResponse>(`/subscriptions/tariffs/${tariff.id}/purchase/`);
      if (res.data.success) {
        updateBalance(res.data.new_balance, res.data.nano_coins);
        setCurrentSub(res.data.subscription);
        setMessage({
          type: 'success',
          text: res.data.message ?? `🎉 «${tariff.name}» obunasi faollashdi! +${res.data.nano_granted.toLocaleString('en')} nano koin hisobingizga qo'shildi.`,
        });
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string; detail?: string } } };
      setMessage({
        type: 'error',
        text: axiosErr.response?.data?.error ?? axiosErr.response?.data?.detail ?? "Xatolik yuz berdi",
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const nanoCoins = user?.nano_coins ?? 0;
  const tokens = user?.tokens_balance ?? 0;

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* ── Salomlashuv ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            Salom, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {user?.full_name?.split(' ')[0] || 'Foydalanuvchi'} 👋
            </span>
          </h1>
          <p className="text-zinc-400">Profil va obunangizni bu yerda boshqaring</p>
        </motion.div>

        {/* ── Xabar ── */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-red-500/10 border-red-500/30 text-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* ── Balans va ma'lumotlar grid ── */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {/* Nano koin */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl"
          >
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <Coins className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wider font-bold">Nano koinlar</span>
            </div>
            <div className="text-4xl font-black text-amber-200">
              {nanoCoins.toLocaleString('en')}
            </div>
            <p className="text-xs text-amber-400/70 mt-2">
              ({tokens.toLocaleString('en')} token)
            </p>
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl"
          >
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Mail className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wider font-bold">Email</span>
            </div>
            <div className="text-lg font-bold truncate" title={user?.email}>
              {user?.email}
            </div>
            <p className="text-xs text-zinc-500 mt-2 capitalize">Rol: {user?.role ?? 'user'}</p>
          </motion.div>

          {/* Faol obuna */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-6 rounded-2xl border ${
              currentSub
                ? 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-emerald-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wider font-bold">Faol obuna</span>
            </div>
            {currentSub ? (
              <>
                <div className="text-2xl font-black text-emerald-200 mb-1">
                  {currentSub.tariff.name}
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400/80">
                  <Calendar className="w-3 h-3" />
                  <span>{daysLeft(currentSub.end_date)} kun qoldi</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Tugaydi: {formatDate(currentSub.end_date)}
                </p>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-zinc-400">Obuna yo&apos;q</div>
                <p className="text-xs text-zinc-500 mt-2">Pastdagi tariflardan birini tanlang</p>
              </>
            )}
          </motion.div>
        </div>

        {/* ── Tezkor harakatlar ── */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <Link href="/builder">
            <Button className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm">
              <Sparkles className="w-4 h-4 mr-2" /> Yangi sayt yaratish
            </Button>
          </Link>
          <Link href="/history">
            <Button className="w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm">
              <TrendingUp className="w-4 h-4 mr-2" /> Tarix va suhbatlar
            </Button>
          </Link>
          <Link href="#tariffs">
            <Button className="w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm">
              <CreditCard className="w-4 h-4 mr-2" /> Tariflar
            </Button>
          </Link>
        </div>

        {/* ── Tariflar ── */}
        <div id="tariffs">
          <h2 className="text-3xl font-black mb-2">Obunani tanlang</h2>
          <p className="text-zinc-400 mb-8">
            Tarifni sotib olish Sizga token qo&apos;shadi va ko&apos;proq imkoniyatlar ochadi.
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tariffs.map((tariff, i) => {
                const isFree = parseFloat(tariff.price) === 0;
                const isCurrent = currentSub?.tariff.id === tariff.id;
                const isPurchasing = purchasing === tariff.id;

                return (
                  <motion.div
                    key={tariff.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`relative p-6 rounded-2xl border flex flex-col ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-white/10 bg-white/5 hover:border-purple-500/50'
                    } transition-colors`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-black rounded-full text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> HOZIRGI OBUNA
                      </div>
                    )}
                    <div className="mb-5">
                      <h3 className="text-xl font-black">{tariff.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{tariff.description}</p>
                    </div>

                    <div className="mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{priceLabel(tariff.price)}</span>
                        {!isFree && <span className="text-sm text-zinc-500">/oy</span>}
                      </div>

                      {/* Obuna tagida nano koin miqdori */}
                      {tariff.nano_coins_included > 0 && (
                        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-amber-300/80 uppercase font-bold tracking-wider">
                              Oyiga nano koin
                            </span>
                            <Coins className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="text-2xl font-black text-amber-200 mt-1">
                            💎 {tariff.nano_coins_included.toLocaleString('en')}
                          </div>
                          <div className="text-[11px] text-amber-400/70 mt-1">
                            Haftada: <strong className="text-amber-300">{tariff.weekly_allowance.toLocaleString('en')} nano</strong> (1 oy ÷ 4)
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            ~{Math.floor(tariff.nano_coins_included / 500)} ta chat (1 chat = 500 nano)
                          </div>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6 text-sm flex-1">
                      <li className="flex items-center gap-2 text-zinc-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{tariff.projects_limit} ta loyiha</span>
                      </li>
                      <li className="flex items-center gap-2 text-zinc-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{tariff.ai_generations_limit} ta AI generatsiya</span>
                      </li>
                      <li className="flex items-center gap-2 text-zinc-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{tariff.duration_days} kunlik muddat</span>
                      </li>
                      <li className="flex items-center gap-2 text-zinc-300">
                        <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>1 chat = 500 nano koin</span>
                      </li>
                    </ul>

                    <Button
                      onClick={() => handlePurchase(tariff)}
                      disabled={isFree || isCurrent || isPurchasing}
                      className={`w-full h-12 rounded-xl font-bold text-sm ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                          : isFree
                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                      }`}
                    >
                      {isPurchasing
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : isCurrent
                          ? 'Faol'
                          : isFree
                            ? 'Bepul'
                            : `Sotib olish (${priceLabel(tariff.price)})`
                      }
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Eslatma ── */}
        <div className="mt-10 p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-200/80">
            <strong className="text-amber-300">⚡ Test rejimi:</strong> Haqiqiy to&apos;lov tizimi hali ulanmagan.
            Sotib olish tugmasini bosganingizda obunangiz zudlik bilan faollashadi va tokenlar qo&apos;shiladi.
          </p>
        </div>
      </div>
    </div>
  );
}
