'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft, Bot, Calendar, Clock, Coins, Loader2,
  MessageSquare, Trash2, User as UserIcon, Zap
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

// ── Typelar ───────────────────────────────────────────────

interface ConversationListItem {
  id: string;
  title: string;
  language: string;
  project: string | null;
  project_title: string | null;
  total_messages: number;
  total_tokens_input: number;
  total_tokens_output: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent: string;
  metadata: Record<string, unknown> | null;
  tokens_input: number;
  tokens_output: number;
  duration_ms: number;
  created_at: string;
}

interface ConversationDetail extends ConversationListItem {
  messages: ChatMessageItem[];
}

// ── Yordamchi ─────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'hozirgina';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} kun oldin`;
  return formatDate(iso);
}

function intentBadge(intent: string): { label: string; color: string } {
  switch (intent) {
    case 'CHAT': return { label: 'Suhbat', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
    case 'ARCHITECT': return { label: 'Arxitektor', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
    case 'REVISE': return { label: 'Tahrir', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    case 'GENERATE': return { label: 'Generatsiya', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    default: return { label: intent || 'xabar', color: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30' };
  }
}

// ── Sahifa ────────────────────────────────────────────────

export default function HistoryPage() {
  const { isAuthenticated } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ro'yxatni yuklash (silent=true — spinner ko'rsatmasdan, polling uchun)
  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.get<ConversationListItem[] | { results: ConversationListItem[] }>('/conversations/');
      const items = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
      setConversations(items);
    } catch (e) {
      console.error(e);
      if (!silent) setError("Tarixni yuklab bo'lmadi. Keyinroq urinib ko'ring.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadList(false);
    // Real-time: har 20 soniyada ro'yxatni indamas tarzda yangilab turamiz
    const id = setInterval(() => loadList(true), 20000);
    return () => clearInterval(id);
  }, [isAuthenticated, loadList]);

  // Tafsilot
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedId(id);
    try {
      const res = await api.get<ConversationDetail>(`/conversations/${id}/`);
      setDetail(res.data);
    } catch (e) {
      console.error(e);
      setError("Suhbatni yuklab bo'lmadi.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // O'chirish
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Suhbatni o'chirishga ishonchingiz komilmi? Bu amalni qaytarib bo'lmaydi.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/conversations/${id}/`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (e) {
      console.error(e);
      alert("O'chirishda xatolik.");
    } finally {
      setDeletingId(null);
    }
  }, [selectedId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h1 className="text-2xl font-black mb-2">Suhbat tarixi</h1>
          <p className="text-zinc-400 mb-6">Tarixingizni ko&apos;rish uchun hisobingizga kiring.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
          >
            Kirish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center gap-4 shrink-0">
        <Link href="/builder" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Builder</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            Suhbatlar tarixi
          </h1>
          <p className="text-xs text-zinc-500">AI bilan barcha yozishmalaringiz shu yerda saqlanadi</p>
        </div>
        <div className="text-sm text-zinc-400">
          Jami: <span className="font-bold text-white">{conversations.length}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Ro'yxat */}
        <aside className="w-[360px] border-r border-white/5 overflow-y-auto shrink-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-400">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-2">Hali suhbatlar yo&apos;q</p>
              <Link href="/builder" className="text-purple-400 text-xs hover:underline">Builder&apos;ga o&apos;tish</Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {conversations.map(conv => (
                <motion.li
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'relative px-4 py-3 cursor-pointer transition-colors group',
                    selectedId === conv.id
                      ? 'bg-purple-500/10 border-l-2 border-purple-500'
                      : 'hover:bg-white/5'
                  )}
                  onClick={() => loadDetail(conv.id)}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-white line-clamp-1">{conv.title || '(sarlavhasiz)'}</h3>
                      {conv.project_title && (
                        <p className="text-[11px] text-purple-300 mt-0.5 line-clamp-1">🌐 {conv.project_title}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      title="O'chirish"
                      disabled={deletingId === conv.id}
                    >
                      {deletingId === conv.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        : <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      }
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {conv.total_messages}
                    </span>
                    {(conv.total_tokens_input + conv.total_tokens_output) > 0 && (
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {(conv.total_tokens_input + conv.total_tokens_output).toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" /> {relativeTime(conv.updated_at)}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </aside>

        {/* Tafsilot */}
        <main className="flex-1 overflow-y-auto">
          {!selectedId ? (
            <div className="h-full flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Suhbatni tanlang</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : detail ? (
            <div className="max-w-3xl mx-auto p-6">
              {/* Sarlavha */}
              <div className="mb-6 pb-6 border-b border-white/5">
                <h2 className="text-2xl font-black mb-2">{detail.title}</h2>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(detail.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {detail.total_messages} xabar
                  </span>
                  {(detail.total_tokens_input + detail.total_tokens_output) > 0 && (
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {(detail.total_tokens_input + detail.total_tokens_output).toLocaleString()} token
                    </span>
                  )}
                  {detail.project_title && detail.project && (
                    <Link
                      href={`/builder?project=${detail.project}`}
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      🌐 {detail.project_title}
                    </Link>
                  )}
                </div>
              </div>

              {/* Xabarlar */}
              <div className="space-y-4">
                {detail.messages.map(msg => {
                  const isUser = msg.role === 'user';
                  const badge = intentBadge(msg.intent);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={cn('max-w-[75%] space-y-1')}>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          {msg.intent && (
                            <span className={cn('px-1.5 py-0.5 rounded border font-semibold', badge.color)}>
                              {badge.label}
                            </span>
                          )}
                          <span>{formatDate(msg.created_at)}</span>
                          {msg.duration_ms > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> {(msg.duration_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                          {(msg.tokens_input + msg.tokens_output) > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Coins className="w-2.5 h-2.5" /> {msg.tokens_input + msg.tokens_output}
                            </span>
                          )}
                        </div>
                        <div className={cn(
                          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                          isUser
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                        )}>
                          {msg.content}
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-zinc-300" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
