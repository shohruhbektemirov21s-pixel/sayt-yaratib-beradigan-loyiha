'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  CreditCard,
  FolderOpen,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import api from '@/shared/api/axios';

interface Stats {
  users: { total: number; active: number; new_today: number; new_week: number };
  subscriptions: { total: number; active: number };
  projects: { total: number; completed: number; today: number };
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 p-6"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-10 blur-3xl rounded-full -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </motion.div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-zinc-300 font-medium">{label}</span>
        <span className="text-zinc-400 font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Stats>('/accounts/admin/stats/')
      .then((r) => {
        setStats(r.data);
        setLastUpdated(new Date().toLocaleTimeString('uz-UZ'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-white">Umumiy ko&apos;rinish</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {lastUpdated ? `Yangilangan: ${lastUpdated}` : 'Yuklanmoqda...'}
          </p>
        </div>
        <motion.button
          onClick={load}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </motion.button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index={0}
          label="Jami foydalanuvchilar"
          value={stats?.users.total ?? 0}
          sub={`Bugun +${stats?.users.new_today ?? 0} yangi`}
          icon={Users}
          color="bg-blue-500"
        />
        <KpiCard
          index={1}
          label="Faol obunalar"
          value={stats?.subscriptions.active ?? 0}
          sub={`Jami: ${stats?.subscriptions.total ?? 0}`}
          icon={CreditCard}
          color="bg-purple-500"
        />
        <KpiCard
          index={2}
          label="AI loyihalar"
          value={stats?.projects.completed ?? 0}
          sub={`Bugun +${stats?.projects.today ?? 0}`}
          icon={FolderOpen}
          color="bg-emerald-500"
        />
        <KpiCard
          index={3}
          label="Haftalik o'sish"
          value={`+${stats?.users.new_week ?? 0}`}
          sub="Yangi foydalanuvchilar"
          icon={TrendingUp}
          color="bg-amber-500"
        />
      </div>

      {/* Charts section */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Users breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900 rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white">Foydalanuvchilar</h2>
          </div>
          <StatBar
            label="Jami ro'yxatdan o'tganlar"
            value={stats?.users.total ?? 0}
            max={stats?.users.total ?? 1}
            color="bg-blue-500"
          />
          <StatBar
            label="Faol hisoblar"
            value={stats?.users.active ?? 0}
            max={stats?.users.total ?? 1}
            color="bg-emerald-500"
          />
          <StatBar
            label="Obunali foydalanuvchilar"
            value={stats?.subscriptions.active ?? 0}
            max={stats?.users.total ?? 1}
            color="bg-purple-500"
          />
          <StatBar
            label="Bu hafta qo'shilgan"
            value={stats?.users.new_week ?? 0}
            max={stats?.users.total ?? 1}
            color="bg-amber-500"
          />
        </motion.div>

        {/* Projects breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-zinc-900 rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white">AI Loyihalar</h2>
          </div>
          <StatBar
            label="Muvaffaqiyatli yaratilgan"
            value={stats?.projects.completed ?? 0}
            max={stats?.projects.total ?? 1}
            color="bg-emerald-500"
          />
          <StatBar
            label="Jami urinishlar"
            value={stats?.projects.total ?? 0}
            max={stats?.projects.total ?? 1}
            color="bg-zinc-600"
          />

          <div className="mt-6 p-4 bg-zinc-800 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Muvaffaqiyat darajasi</span>
            </div>
            <p className="text-3xl font-black text-emerald-400">
              {stats?.projects.total
                ? Math.round((stats.projects.completed / stats.projects.total) * 100)
                : 0}%
            </p>
            <p className="text-xs text-zinc-500 mt-1">barcha yaratish urinishlaridan</p>
          </div>
        </motion.div>
      </div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-zinc-900 rounded-2xl border border-white/5 p-6"
      >
        <h2 className="font-bold text-white mb-4">Tezkor harakatlar</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Foydalanuvchilarni boshqarish', href: 'users', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Tariflarni tahrirlash', href: 'tariffs', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <motion.a
                key={link.href}
                href={link.href}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-4 p-4 rounded-xl ${link.bg} border border-white/5 hover:border-white/10 transition-colors cursor-pointer`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${link.color}`} />
                </div>
                <span className="font-semibold text-sm text-white">{link.label}</span>
              </motion.a>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
