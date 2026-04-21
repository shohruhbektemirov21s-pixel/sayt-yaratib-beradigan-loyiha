'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot, CheckCircle2, Clock, Code2, Cpu, Download, Eye, Layers, Loader2,
  MessageSquare, Monitor, MousePointer2, RefreshCw, Send,
  Settings, Smartphone, Sparkles, Wand2, Palette, Zap,
  BarChart2, Coins,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DeveloperView, type FileMap } from '@/features/builder/DeveloperView';
import { SiteRenderer } from '@/features/builder/SiteRenderer';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';

// ── Types ──────────────────────────────────────────────────────────

interface HistoryItem { role: 'user' | 'assistant'; content: string; }

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  phase?: 'ARCHITECT' | 'DONE';
}

interface DesignVariant {
  id: number; name: string; primary: string; accent: string;
  bg: string; text: string; mood: string; font: string;
  layout: string; description: string; icon: string;
}

interface GenerationStats {
  generation_time_ms: number;
  input_tokens: number;
  output_tokens: number;
  complexity: { level: string; label: string; color: string; sections: number; pages: number };
}

interface Balance {
  tokens: number;
  nano_coins: number;
  cost: number;
}

interface ApiResponse {
  success: boolean;
  phase?: 'ARCHITECT' | 'DONE';
  is_chat?: boolean;
  message?: string;
  architect_message?: string;
  design_variants?: DesignVariant[];
  stats?: GenerationStats;
  project?: {
    id: string | null;
    title: string;
    status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED';
    schema_data: Record<string, unknown> | null;
  };
  balance?: Balance;
  insufficient_tokens?: boolean;
  required_tokens?: number;
  current_tokens?: number;
  error?: string;
  conversation_id?: string | null;
}

type ProjectSchema = Record<string, unknown>;

// ── Design Variant Card ────────────────────────────────────────────

function DesignVariantCard({ variant, onSelect }: { variant: DesignVariant; onSelect: (v: DesignVariant) => void }) {
  // Layout turini aniqlash — AI dan kelgan qiymatga qarab
  const layout = (variant.layout || '').toLowerCase();
  const isMinimal = layout.includes('minim') || variant.mood?.toLowerCase().includes('clean');
  const isBold = layout.includes('bold') || layout.includes('modern') || variant.mood?.toLowerCase().includes('bold');
  const isClassic = layout.includes('classic') || layout.includes('elegant');

  // Fon rangini tahlil qilamiz: qora-ochligi va "oq-tusligi"
  const { isDarkBg, isWhitish } = (() => {
    const hex = variant.bg?.replace('#', '') ?? 'ffffff';
    if (hex.length !== 6) return { isDarkBg: false, isWhitish: true };
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    return {
      isDarkBg: lum < 140,
      // Juda och — variantlarni ajratish uchun hero gradient qo'shamiz
      isWhitish: lum > 235,
    };
  })();
  const textOnBg = isDarkBg ? '#ffffff' : '#0f172a';
  const mutedOnBg = isDarkBg ? '#e5e7eb' : '#475569';

  // Namunaviy matnlar — biznes turiga mos keladigan neytral taklif
  const heroHeadline = variant.mood?.split(' ')[0]
    ? `${variant.mood.split(' ')[0]} boshlang`
    : 'Kelajagingizni quring';
  const features = [
    { icon: '✨', label: 'Zamonaviy' },
    { icon: '⚡', label: 'Tezkor' },
    { icon: '🎯', label: 'Samarali' },
  ];

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(variant)}
      className="w-full text-left rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/60 hover:shadow-purple-500/20 transition-all group shadow-lg bg-zinc-900"
    >
      {/* Browser chrome — "sayt chindan ochilganday" taassurot */}
      <div className="h-5 bg-zinc-800 flex items-center gap-1.5 px-2.5 border-b border-white/5">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex-1 text-center">
          <span className="inline-block px-2 py-0.5 rounded text-[8px] text-zinc-500 bg-zinc-900/60 tracking-wider">
            {variant.name.toLowerCase().replace(/\s+/g, '-')}.uz
          </span>
        </div>
      </div>

      {/* Haqiqiy ko'rinishdagi sayt preview */}
      <div
        className="relative overflow-hidden"
        style={{
          // Oq fonlar uchun — accent rangining yumshoq gradientini qo'shamiz,
          // shunda 3 ta variant bir-biridan vizual farqlanadi.
          background: isWhitish
            ? `linear-gradient(135deg, ${variant.bg} 0%, ${variant.accent}18 50%, ${variant.primary}10 100%)`
            : variant.bg,
          fontFamily: variant.font || 'system-ui',
          minHeight: '180px',
        }}
      >
        {/* Dekorativ blob — oq fonda variantni jonlantiradi (z-0) */}
        {isWhitish && (
          <>
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-40 pointer-events-none z-0"
              style={{ backgroundColor: variant.primary }}
            />
            <div
              className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-30 pointer-events-none z-0"
              style={{ backgroundColor: variant.accent }}
            />
          </>
        )}
        {/* Navbar — CLASSIC yoki BOLD'da */}
        {!isMinimal && (
          <div
            className="relative z-10 flex items-center justify-between px-3 h-7"
            style={{
              backgroundColor: isBold ? variant.primary : 'transparent',
              borderBottom: isBold ? 'none' : `1px solid ${variant.primary}22`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px]"
                style={{ backgroundColor: variant.accent, color: isBold ? variant.primary : '#fff' }}
              >
                {variant.icon}
              </div>
              <span
                className="text-[9px] font-black tracking-tight"
                style={{ color: isBold ? '#fff' : textOnBg }}
              >
                {variant.name}
              </span>
            </div>
            <div className="flex gap-2">
              {['Bosh', 'Xizmat', 'Aloqa'].map(m => (
                <span
                  key={m}
                  className="text-[7px] font-medium"
                  style={{ color: isBold ? '#ffffffcc' : mutedOnBg }}
                >{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Minimal layout — yon tomonda katta bo'sh joy */}
        {isMinimal ? (
          <div className="relative z-10 flex items-center h-[150px] px-5">
            <div className="flex-1">
              <div className="text-[7px] uppercase tracking-[0.2em] mb-1.5" style={{ color: variant.accent }}>
                — Studio
              </div>
              <div className="text-[13px] font-black leading-tight mb-1.5" style={{ color: textOnBg }}>
                {heroHeadline}
              </div>
              <div className="text-[8px] leading-relaxed mb-2.5" style={{ color: mutedOnBg }}>
                Sodda, nafis va samarali dizayn yechimi
              </div>
              <div className="flex gap-1.5">
                <div
                  className="px-2 py-1 rounded-full text-[7px] font-bold"
                  style={{ backgroundColor: variant.primary, color: '#fff' }}
                >Boshlash →</div>
                <div
                  className="px-2 py-1 rounded-full text-[7px] font-bold border"
                  style={{ borderColor: variant.primary + '55', color: textOnBg }}
                >Ko&apos;proq</div>
              </div>
            </div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: variant.primary + '15', border: `1px solid ${variant.primary}30` }}
            >
              {variant.icon}
            </div>
          </div>
        ) : (
          <>
            {/* Hero bo'limi */}
            <div className="relative z-10 px-3 pt-3 pb-2 text-center">
              <div
                className="inline-block px-1.5 py-0.5 rounded-full text-[7px] font-bold mb-1.5"
                style={{
                  backgroundColor: variant.accent + '25',
                  color: variant.accent,
                }}
              >
                ⭐ Yangi
              </div>
              <div
                className="text-[12px] font-black leading-tight mb-1 px-2"
                style={{ color: textOnBg }}
              >
                {heroHeadline}
              </div>
              <div
                className="text-[8px] leading-snug mb-2"
                style={{ color: mutedOnBg }}
              >
                Professional dizayn • Tez yuklanadi
              </div>
              <div className="flex gap-1.5 justify-center">
                <div
                  className="px-2.5 py-1 rounded-lg text-[8px] font-bold shadow-md"
                  style={{
                    backgroundColor: variant.primary,
                    color: '#fff',
                  }}
                >
                  Hoziroq boshlash
                </div>
                <div
                  className="px-2.5 py-1 rounded-lg text-[8px] font-bold border"
                  style={{
                    borderColor: variant.primary + '44',
                    color: textOnBg,
                  }}
                >
                  Batafsil
                </div>
              </div>
            </div>

            {/* Feature kartalar */}
            <div className="relative z-10 px-3 pb-3 flex gap-1.5">
              {features.map(f => (
                <div
                  key={f.label}
                  className={cn(
                    'flex-1 rounded-lg p-1.5 text-center',
                    isClassic ? 'border' : ''
                  )}
                  style={{
                    backgroundColor: isClassic ? 'transparent' : variant.primary + '0f',
                    borderColor: isClassic ? variant.primary + '33' : 'transparent',
                  }}
                >
                  <div className="text-[11px] leading-none mb-0.5">{f.icon}</div>
                  <div
                    className="text-[7px] font-bold"
                    style={{ color: textOnBg }}
                  >{f.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Meta info bar */}
      <div className="p-2.5 bg-zinc-900 border-t border-white/5">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{variant.icon}</span>
          <span className="font-bold text-[11px] text-white truncate flex-1">{variant.name}</span>
          <div className="flex gap-1 shrink-0">
            {[variant.primary, variant.accent, variant.bg].map((c, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-zinc-400 line-clamp-1 flex-1">{variant.description}</p>
          <span className="text-[9px] font-bold text-purple-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            Tanlash →
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ── Chat Bubble ────────────────────────────────────────────────────

function ChatBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const isUser = msg.role === 'user';
  const isDone = msg.phase === 'DONE';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5',
          isDone ? 'bg-emerald-600' : 'bg-gradient-to-tr from-blue-600 to-purple-600')}>
          {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Zap className="w-3.5 h-3.5 text-white" />}
        </div>
      )}
      <div className={cn('max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
        isUser ? 'bg-purple-600 text-white rounded-br-sm'
          : isDone ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 rounded-bl-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
      )}>
        {msg.text}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 ml-2 mt-0.5 text-xs font-bold text-zinc-300">S</div>
      )}
    </motion.div>
  );
}

// ── Generation Progress (preview da) ──────────────────────────────

function GenerationProgress({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(id);
  }, [startTime]);

  const steps = [
    { label: 'Loyiha tahlil qilinmoqda', done: elapsed > 3 },
    { label: 'Sahifalar tuzilishi belgilanmoqda', done: elapsed > 8 },
    { label: 'Kontent yaratilmoqda', done: elapsed > 15 },
    { label: 'Dizayn va uslub qo\'llanilmoqda', done: elapsed > 22 },
    { label: 'Sayt yakunlanmoqda', done: false },
  ];
  const activeStep = steps.filter(s => s.done).length;
  const progress = Math.min(95, (activeStep / steps.length) * 100 + (elapsed % 5) * 1.5);

  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-10">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30"
      >
        <Sparkles className="w-8 h-8 text-white" />
      </motion.div>

      <h2 className="text-xl font-black text-zinc-900 mb-1">Sayt yaratilmoqda…</h2>
      <p className="text-zinc-400 text-sm mb-6">AI kodni yozmoqda, biroz kuting</p>

      {/* Progress bar */}
      <div className="w-full max-w-sm bg-zinc-100 rounded-full h-2 mb-5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0',
              step.done ? 'bg-emerald-500' : i === activeStep ? 'bg-purple-500 animate-pulse' : 'bg-zinc-200')}>
              {step.done
                ? <CheckCircle2 className="w-3 h-3 text-white" />
                : i === activeStep
                  ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                  : null}
            </div>
            <span className={cn('text-xs', step.done ? 'text-emerald-600 line-through' : i === activeStep ? 'text-zinc-800 font-semibold' : 'text-zinc-400')}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
        <Clock className="w-3.5 h-3.5" />
        <span>{elapsed} soniya o'tdi</span>
      </div>
    </div>
  );
}

// ── Generation Stats ───────────────────────────────────────────────

function GenerationStatsPanel({ stats }: { stats: GenerationStats }) {
  const totalTokens = stats.input_tokens + stats.output_tokens;
  const secs = (stats.generation_time_ms / 1000).toFixed(1);
  const complexityColors: Record<string, string> = {
    green: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    yellow: 'text-amber-600 bg-amber-50 border-amber-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };
  const colorClass = complexityColors[stats.complexity.color] ?? complexityColors.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-2 p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
    >
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Generatsiya statistikasi</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60">
          <Clock className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
          <span className="text-xs font-bold text-white">{secs}s</span>
          <span className="text-[9px] text-zinc-500">Vaqt</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60">
          <Coins className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
          <span className="text-xs font-bold text-white">{totalTokens.toLocaleString()}</span>
          <span className="text-[9px] text-zinc-500">Token</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60">
          <BarChart2 className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
          <span className="text-xs font-bold text-white">{stats.complexity.sections}</span>
          <span className="text-[9px] text-zinc-500">Bo'lim</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          ↑ {stats.input_tokens.toLocaleString()} + ↓ {stats.output_tokens.toLocaleString()} token
        </span>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', colorClass)}>
          {stats.complexity.label}
        </span>
      </div>
    </motion.div>
  );
}

// ── Phase Badge ────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: 'idle' | 'architect' | 'building' | 'done' }) {
  const map = {
    idle: { label: 'Tayyor', color: 'bg-zinc-800 text-zinc-400', icon: MessageSquare },
    architect: { label: 'Tahlil rejimda', color: 'bg-blue-600/20 text-blue-300 border border-blue-500/30', icon: Zap },
    building: { label: 'Sayt qurilmoqda…', color: 'bg-purple-600/20 text-purple-300 border border-purple-500/30', icon: Loader2 },
    done: { label: 'Sayt tayyor!', color: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30', icon: CheckCircle2 },
  };
  const { label, color, icon: Icon } = map[phase];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', color)}>
      <Icon className={cn('w-3 h-3', phase === 'building' && 'animate-spin')} />
      {label}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function BuilderPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<'idle' | 'architect' | 'building' | 'done'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [designVariants, setDesignVariants] = useState<DesignVariant[] | null>(null);
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(null);
  const [buildStartTime, setBuildStartTime] = useState<number | null>(null);
  // Faqat DONE bo'lganda sayt ko'rsatiladi — chat paytida loyihaga tegmaydi
  const [previewSchema, setPreviewSchema] = useState<ProjectSchema | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Suhbat ID — backend'da saqlanadigan tarix uchun
  const [conversationId, setConversationId] = useState<string | null>(null);
  // IDE ko'rinish (Code/Preview toggle)
  const [buildView, setBuildView] = useState<'preview' | 'code'>('code');
  const [files, setFiles] = useState<FileMap | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesReceivedAt, setFilesReceivedAt] = useState<number | null>(null);
  // Chat panel kengligi (resize imkoniyati)
  const CHAT_MIN_WIDTH = 280;
  const CHAT_MAX_WIDTH = 720;
  const [chatWidth, setChatWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 340;
    const saved = Number(localStorage.getItem('builder:chatWidth'));
    return Number.isFinite(saved) && saved >= CHAT_MIN_WIDTH && saved <= CHAT_MAX_WIDTH
      ? saved : 340;
  });
  const [isResizingChat, setIsResizingChat] = useState(false);

  const { setCurrentProject } = useProjectStore();
  const { isAuthenticated, user, updateBalance } = useAuthStore();
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Sahifa ochilganda eski loyihani tozalaymiz
    setCurrentProject(null as unknown as Parameters<typeof setCurrentProject>[0]);
  }, [setCurrentProject]);

  // Chat panel resize: mouse drag
  useEffect(() => {
    if (!isResizingChat) return;
    const handleMouseMove = (e: MouseEvent) => {
      // O'ng qirradan chap tomonga masofa = chat paneli kengligi
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.max(CHAT_MIN_WIDTH, Math.min(CHAT_MAX_WIDTH, newWidth));
      setChatWidth(clamped);
    };
    const handleMouseUp = () => {
      setIsResizingChat(false);
      localStorage.setItem('builder:chatWidth', String(chatWidth));
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingChat, chatWidth]);

  // Auth'ed userda balansni yangilab olish + real-time polling
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const fetchBalance = () => {
      api.get<{ tokens_balance: number; nano_coins: number }>('/accounts/me/')
        .then(res => {
          if (cancelled) return;
          if (typeof res.data.tokens_balance === 'number') {
            updateBalance(res.data.tokens_balance, res.data.nano_coins ?? 0);
          }
        })
        .catch(() => { /* ignore */ });
    };

    fetchBalance();
    // Har 20 soniyada balansni yangilab turamiz (real-time sezish uchun)
    const id = setInterval(fetchBalance, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, updateBalance]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages, isGenerating, designVariants]);

  useEffect(() => {
    setChatMessages([{
      role: 'ai',
      text: '👋 Salom! Men sizning AI arxitektoringizman.\n\nAvval bir nechta savol beraman, keyin saytingizni yarataman.\n\nQanday biznes yoki loyiha uchun sayt kerak?',
    }]);
  }, []);

  const addMsg = (role: 'user' | 'ai', text: string, msgPhase?: ChatMessage['phase']) =>
    setChatMessages(prev => [...prev, { role, text, phase: msgPhase }]);

  const handleVariantSelect = (variant: DesignVariant) => {
    setDesignVariants(null);
    void handleSend(`${variant.icon} "${variant.name}" variantini tanladim — ${variant.description}`);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? prompt).trim();
    if (!text || isGenerating) return;
    if (!overrideText) setPrompt('');
    addMsg('user', text);
    setErrorMsg('');
    setIsGenerating(true);

    const newHistory: HistoryItem[] = [...history, { role: 'user', content: text }];

    try {
      let res: { data: ApiResponse };

      // Sayt tayyor bo'lsa va user dizayn o'zgartirmoqchi bo'lsa — inline revise
      if (phase === 'done' && previewSchema) {
        if (previewId) {
          // Login qilingan — DB orqali revise
          res = await api.post<ApiResponse>('/projects/process_prompt/', {
            prompt: text, language: 'uz', history: newHistory, project_id: previewId,
            conversation_id: conversationId,
          });
        } else {
          // Login qilinmagan — schema inline yuboramiz
          res = await api.post<ApiResponse>('/projects/revise_inline/', {
            prompt: text, language: 'uz', schema_data: previewSchema,
          });
        }
      } else {
        // Oddiy suhbat / yangi generatsiya
        res = await api.post<ApiResponse>('/projects/process_prompt/', {
          prompt: text, language: 'uz', history: newHistory,
          conversation_id: conversationId,
        });
      }
      const data = res.data;

      // Suhbat ID ni saqlaymiz — tarix uchun keyingi requestlarda yuborish kerak
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      if (!data.success) {
        // Token yetmaganda maxsus xabar
        if (data.insufficient_tokens) {
          const needNano = Math.ceil((data.required_tokens ?? 3000) / 10);
          const haveNano = Math.floor((data.current_tokens ?? 0) / 10);
          const msg = `💎 Nano koin yetarli emas!\n\nKerak: ${needNano} nano (${data.required_tokens ?? 3000} token)\nSizda: ${haveNano} nano (${data.current_tokens ?? 0} token)\n\nBalansingizni to'ldiring yoki obuna xarid qiling.`;
          setErrorMsg('Nano koin yetarli emas');
          addMsg('ai', msg);
        } else {
          setErrorMsg(data.error ?? 'Xatolik yuz berdi.');
          addMsg('ai', `❌ ${data.error ?? 'Xatolik yuz berdi.'}`);
        }
        setIsGenerating(false);
        return;
      }

      // ── Suhbat davom etmoqda (ARCHITECT) ──
      if (data.phase === 'ARCHITECT' && data.is_chat) {
        const aiText = data.message ?? '...';
        addMsg('ai', aiText);
        setPhase('architect');
        setHistory([...newHistory, { role: 'assistant', content: aiText }]);
        if (data.design_variants?.length) setDesignVariants(data.design_variants);
        setIsGenerating(false);
        return;
      }

      // ── Sayt tayyor (DONE) ──
      if (data.phase === 'DONE' && data.project) {
        if (data.architect_message) {
          const clean = data.architect_message
            .replace(/\[FINAL_SITE_SPEC\][\s\S]*?\[\/FINAL_SITE_SPEC\]/g, '')
            .replace(/\[DESIGN_VARIANTS\][\s\S]*?\[\/DESIGN_VARIANTS\]/g, '')
            .trim();
          if (clean) addMsg('ai', clean, 'DONE');
        }
        addMsg('ai', `✅ Sayt yaratildi: «${data.project.title}»\n\nChap tomonda preview ko'rinmoqda.\n📦 ZIP tugmasini bosib kodni yuklab oling.`, 'DONE');

        // Preview ni yangilaymiz, loyihaga tegmaymiz
        setPreviewSchema(data.project.schema_data);
        setPreviewTitle(data.project.title);
        setPreviewId(data.project.id);
        setCurrentProject(data.project as Parameters<typeof setCurrentProject>[0]);
        setDesignVariants(null);
        setPhase('done');
        setHistory([]);
        if (data.stats) setGenerationStats(data.stats);
        setBuildStartTime(null);
        setIsGenerating(false);

        // Balansni yangilaymiz
        if (data.balance) {
          updateBalance(data.balance.tokens, data.balance.nano_coins);
          addMsg('ai', `💎 -${Math.ceil(data.balance.cost / 10)} nano koin hisobidan yechildi. Qoldi: ${data.balance.nano_coins} nano (${data.balance.tokens} token)`);
        }

        // IDE ko'rinish uchun fayllarni background'da olamiz
        if (data.project.schema_data) {
          void fetchFiles(data.project.id, data.project.schema_data);
        }
        return;
      }

      // Oddiy chat
      if (data.is_chat && data.message) {
        addMsg('ai', data.message);
        setHistory([...newHistory, { role: 'assistant', content: data.message }]);
      }
      setIsGenerating(false);

    } catch (err: unknown) {
      let msg = 'Server bilan ulanishda xato.';
      // Axios 4xx/5xx'ni throw qiladi — response data ni tekshiramiz
      const axiosErr = err as { response?: { data?: ApiResponse } };
      if (axiosErr.response?.data?.insufficient_tokens) {
        const d = axiosErr.response.data;
        const needNano = Math.ceil((d.required_tokens ?? 3000) / 10);
        const haveNano = Math.floor((d.current_tokens ?? 0) / 10);
        const chatMsg = `💎 Nano koin yetarli emas!\n\nKerak: ${needNano} nano (${d.required_tokens ?? 3000} token)\nSizda: ${haveNano} nano (${d.current_tokens ?? 0} token)\n\nBalansingizni to'ldiring yoki obuna xarid qiling.`;
        setErrorMsg('Nano koin yetarli emas');
        addMsg('ai', chatMsg);
        setBuildStartTime(null);
        setIsGenerating(false);
        return;
      }
      if (axiosErr.response?.data?.error) {
        msg = axiosErr.response.data.error;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMsg(msg);
      addMsg('ai', `❌ ${msg}`);
      setBuildStartTime(null);
      setIsGenerating(false);
    }
  };

  // Generatsiya boshlanganda timer ishga tushadi
  useEffect(() => {
    if (isGenerating && phase !== 'architect' && phase !== 'idle') {
      setBuildStartTime(Date.now());
      setPhase('building');
    }
  }, [isGenerating]);

  const handleReset = () => {
    setPreviewSchema(null);
    setPreviewTitle('');
    setPreviewId(null);
    setCurrentProject(null as unknown as Parameters<typeof setCurrentProject>[0]);
    setChatMessages([{ role: 'ai', text: '🔄 Yangi sayt yaratishni boshlaylik!\n\nQanday biznes uchun sayt kerak?' }]);
    setHistory([]);
    setPhase('idle');
    setErrorMsg('');
    setDesignVariants(null);
    setGenerationStats(null);
    setBuildStartTime(null);
    setFiles(null);
    setFilesReceivedAt(null);
    setBuildView('code');
  };

  // DONE bo'lganda kod fayllarini avtomatik olish (IDE ko'rinishi uchun)
  const fetchFiles = async (projectId: string | null, schema: ProjectSchema) => {
    setIsLoadingFiles(true);
    setFiles(null);
    try {
      let data: { success: boolean; files?: FileMap; error?: string };
      if (projectId) {
        const res = await api.post<{ success: boolean; files?: FileMap; error?: string }>(
          `/projects/${projectId}/generate_files/`, {},
        );
        data = res.data;
      } else {
        const res = await api.post<{ success: boolean; files?: FileMap; error?: string }>(
          '/projects/generate_files_inline/',
          { schema_data: schema, language: 'uz' },
        );
        data = res.data;
      }
      if (data.success && data.files) {
        setFiles(data.files);
        setFilesReceivedAt(Date.now());
      } else {
        setErrorMsg(data.error ?? 'Fayllar yuklanmadi');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fayllarni olishda xatolik';
      setErrorMsg(msg);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Per-file download
  const handleDownloadFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.split('/').pop() ?? name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isBuilding = isGenerating && (phase === 'building' || (phase !== 'architect' && phase !== 'idle' && phase !== 'done'));

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="h-14 border-b border-white/5 px-5 flex items-center justify-between bg-zinc-950/90 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </Link>
          <div>
            {/* Header faqat DONE bo'lganda loyiha nomini ko'rsatadi */}
            <h1 className="font-black text-sm tracking-tight leading-none">
              {phase === 'done' && previewTitle ? previewTitle : 'AI Site Builder'}
            </h1>
            <PhaseBadge phase={phase} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Preview/Code toggle — faqat DONE yoki building paytida */}
          {(phase === 'done' || isBuilding) && (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setBuildView('code')}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold',
                  buildView === 'code' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40' : 'text-zinc-500 hover:text-zinc-300')}>
                <Code2 className="w-3 h-3" /> Kod
              </button>
              <button
                onClick={() => setBuildView('preview')}
                disabled={!previewSchema}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold',
                  buildView === 'preview' ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-40')}>
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          )}

          {/* Desktop/Mobile toggle — faqat Preview rejimida */}
          {buildView === 'preview' && (
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
              <button onClick={() => setViewMode('desktop')}
                className={cn('p-2 rounded-lg transition-all', viewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('mobile')}
                className={cn('p-2 rounded-lg transition-all', viewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {phase === 'done' && (
            <>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Yangidan
              </motion.button>
              <motion.button
                whileHover={{ scale: isDownloading ? 1 : 1.04 }} whileTap={{ scale: isDownloading ? 1 : 0.96 }}
                onClick={async () => {
                  if (!previewId || isDownloading) return;
                  setIsDownloading(true);
                  try {
                    let blob: Blob;
                    if (previewId) {
                      const res = await api.get(`/projects/${previewId}/download_zip/`, { responseType: 'blob' });
                      blob = res.data as Blob;
                    } else {
                      // Login qilinmagan — schema inline ZIP
                      const res = await api.post('/projects/export_zip/', {
                        schema_data: previewSchema,
                        title: previewTitle || 'my-site',
                        language: 'uz',
                      }, { responseType: 'blob' });
                      blob = res.data as Blob;
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${previewTitle || 'my-site'}.zip`; a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert("ZIP yuklab bo'lmadi. Qayta urinib ko'ring."); }
                  finally { setIsDownloading(false); }
                }}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-70 rounded-xl text-xs font-semibold text-white transition-all shadow-lg shadow-purple-500/20 min-w-[110px] justify-center">
                {isDownloading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Tayyorlanmoqda…</>
                  : <><Download className="w-3.5 h-3.5" /> ZIP yuklab ol</>}
              </motion.button>
            </>
          )}
          {/* Balans badge — auth'ed userlar uchun */}
          {isAuthenticated && user && typeof user.tokens_balance === 'number' && (
            <motion.div
              key={user.tokens_balance}
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0',
                (user.nano_coins ?? 0) >= 100
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : (user.nano_coins ?? 0) >= 30
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
              )}
              title={`${user.tokens_balance.toLocaleString()} token balans`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{(user.nano_coins ?? 0).toLocaleString()}</span>
              <span className="text-[10px] opacity-70 font-normal">nano</span>
            </motion.div>
          )}
          {isAuthenticated && (
            <Link href="/history">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 rounded-xl gap-1.5"
                title="Suhbatlar tarixi"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Tarix
              </Button>
            </Link>
          )}
          {!isAuthenticated && (
            <Link href="/login">
              <Button size="sm" variant="outline" className="h-8 text-xs bg-white/5 border-white/10 text-zinc-300 rounded-xl">
                Kirish
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Sidebar */}
        <aside className="w-14 border-r border-white/5 flex flex-col items-center py-5 gap-5 bg-zinc-950 shrink-0">
          <button className="p-2.5 text-purple-400 bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20"><Layers className="w-4 h-4" /></button>
          <button className="p-2.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl"><MousePointer2 className="w-4 h-4" /></button>
          <button className="p-2.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl"><MessageSquare className="w-4 h-4" /></button>
          <div className="mt-auto">
            <button className="p-2.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl"><Settings className="w-4 h-4" /></button>
          </div>
        </aside>

        {/* Preview / Code */}
        <div className={cn('flex-1 overflow-hidden min-w-0',
          buildView === 'code' && (isBuilding || isLoadingFiles || files)
            ? 'bg-[#0a0c11]'
            : 'bg-zinc-900/40')}>

          {/* KOD REJIMI: IDE ko'rinish */}
          {buildView === 'code' && (isBuilding || isLoadingFiles || files) ? (
            <div className="h-full">
              <DeveloperView
                files={files}
                isGenerating={isBuilding || isLoadingFiles}
                onDownloadFile={handleDownloadFile}
                skipAnimation={filesReceivedAt !== null && Date.now() - filesReceivedAt > 30000}
              />
            </div>
          ) : (
          <div className="h-full overflow-auto p-6 flex justify-center items-start">
          <motion.div layout transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={cn('bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[500px] border border-white/10',
              viewMode === 'desktop' ? 'w-full max-w-5xl' : 'w-[375px]')}>
            <AnimatePresence mode="wait">

              {/* Sayt ko'rsatilmoqda */}
              {previewSchema && !isBuilding && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-auto">
                  <SiteRenderer schema={previewSchema} />
                </motion.div>
              )}

              {/* Generatsiya jarayoni (eski animatsiya — faqat Preview rejimida) */}
              {isBuilding && buildStartTime && (
                <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GenerationProgress startTime={buildStartTime} />
                </motion.div>
              )}

              {/* Boshlang'ich holat — chat kutilmoqda */}
              {!previewSchema && !isBuilding && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-h-[500px] flex flex-col items-center justify-center p-16 text-center">

                  {/* Workflow */}
                  <div className="flex items-center gap-3 mb-8">
                    {[
                      { icon: <Zap className="w-5 h-5 text-white" />, label: 'Suhbat', color: 'from-blue-500 to-cyan-400', glow: 'blue' },
                      { icon: <Cpu className="w-5 h-5 text-white" />, label: 'Generatsiya', color: 'from-purple-600 to-pink-500', glow: 'purple' },
                      { icon: <Download className="w-5 h-5 text-white" />, label: 'ZIP', color: 'from-emerald-500 to-teal-400', glow: 'emerald' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center shadow-lg', item.color)}>
                            {item.icon}
                          </div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase">{item.label}</span>
                        </div>
                        {idx < 2 && (
                          <div className="flex gap-0.5 mb-3">
                            {[0, 1, 2].map(i => (
                              <motion.div key={i} className="w-1 h-1 rounded-full bg-zinc-400"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1, repeat: Infinity, delay: idx * 0.4 + i * 0.15 }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-100 to-blue-50 flex items-center justify-center mb-5 shadow-inner">
                    <Wand2 className="w-8 h-8 text-purple-400" />
                  </motion.div>
                  <h2 className="text-xl font-black text-zinc-900 mb-2">Sayt bu yerda paydo bo&apos;ladi</h2>
                  <p className="text-zinc-500 max-w-xs leading-relaxed text-sm mb-6">
                    Chatda loyihangizni tasvirlab bering — AI saytni yaratadi va bu yerda ko&apos;rsatadi
                  </p>

                  <div className="flex gap-2 flex-wrap justify-center">
                    {["Cafe ☕", "Portfolio 🎨", "Do'kon 🛍️", "Klinika 🏥", "Restoran 🍽️"].map(ex => (
                      <motion.button key={ex} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setPrompt(`${ex} uchun sayt kerak`); textareaRef.current?.focus(); }}
                        className="px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-purple-300 hover:text-purple-700 transition-colors">
                        {ex}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </div>
          )}
        </div>

        {/* Chat panel resize handle */}
        <div
          onMouseDown={() => setIsResizingChat(true)}
          onDoubleClick={() => { setChatWidth(340); localStorage.setItem('builder:chatWidth', '340'); }}
          className={cn(
            'w-1 shrink-0 cursor-col-resize group relative transition-colors',
            isResizingChat ? 'bg-purple-500' : 'bg-white/5 hover:bg-purple-500/40'
          )}
          title="Surib kenglikni o'zgartiring (ikki marta bosib qaytaring)"
        >
          {/* Kattaroq clickable zona */}
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
          {/* Markazdagi ishora */}
          <div className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full transition-colors',
            isResizingChat ? 'bg-white' : 'bg-white/20 group-hover:bg-white/60'
          )} />
        </div>

        {/* Chat panel */}
        <div
          className="border-l border-white/5 flex flex-col bg-zinc-950 shrink-0"
          style={{ width: `${chatWidth}px` }}
        >

          {/* Chat header */}
          <div className="px-4 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">AI Arxitektor</h3>
                <p className="text-[10px] text-zinc-500">Sayt dizayni bo&apos;yicha maslahat</p>
              </div>
              <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80">
                <div className={cn('w-1.5 h-1.5 rounded-full',
                  isGenerating ? 'bg-blue-400 animate-pulse' : phase === 'done' ? 'bg-emerald-400' : 'bg-zinc-500')} />
                <span className="text-[9px] text-zinc-400">
                  {isGenerating ? 'Ishlayapti' : phase === 'done' ? 'Tayyor' : 'Kutmoqda'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0">
            {chatMessages.map((msg, i) => <ChatBubble key={i} msg={msg} index={i} />)}

            <AnimatePresence>
              {designVariants && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-purple-300">Dizayn variantini tanlang</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {designVariants.map(v => <DesignVariantCard key={v.id} variant={v} onSelect={handleVariantSelect} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isGenerating && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  {isBuilding
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /><span className="text-xs text-zinc-400">Kod yozilmoqda…</span></>
                    : <>
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }} />
                        ))}
                        <span className="text-xs text-zinc-500 ml-1">AI tahlil qilmoqda…</span>
                      </>}
                </div>
              </motion.div>
            )}
          </div>

          {/* Stats */}
          <AnimatePresence>
            {generationStats && phase === 'done' && (
              <GenerationStatsPanel stats={generationStats} />
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="p-3 border-t border-white/5 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                placeholder={phase === 'done' ? 'Tahrir yoki yangi so\'rov…' : 'Biznesingizni tasvirlab bering…'}
                rows={2}
                className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
              />
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => void handleSend()}
                disabled={isGenerating || !prompt.trim()}
                className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-zinc-800 disabled:shadow-none rounded-xl shrink-0 flex items-center justify-center transition-all shadow-lg shadow-blue-500/20">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5 text-center">Enter = yuborish · Shift+Enter = yangi qator</p>
          </div>
        </div>
      </main>
    </div>
  );
}
