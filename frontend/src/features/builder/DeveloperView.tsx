'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Download, File, FileCode2, FileJson, FileText, Folder,
  FolderOpen, Loader2, Terminal, Check, Copy,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────

export type FileMap = Record<string, string>;

interface DeveloperViewProps {
  files: FileMap | null;
  isGenerating: boolean;
  onDownloadFile?: (name: string, content: string) => void;
  /** Agar generatsiya tugasa oqim animatsiyani o'tkazib yuborish */
  skipAnimation?: boolean;
}

// ── Yordamchi funksiyalar ──────────────────────────────────────────

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'html') return { Icon: FileCode2, color: 'text-orange-400' };
  if (ext === 'css') return { Icon: FileCode2, color: 'text-blue-400' };
  if (ext === 'js') return { Icon: FileCode2, color: 'text-yellow-400' };
  if (ext === 'ts' || ext === 'tsx') return { Icon: FileCode2, color: 'text-cyan-400' };
  if (ext === 'json') return { Icon: FileJson, color: 'text-emerald-400' };
  if (ext === 'md') return { Icon: FileText, color: 'text-zinc-400' };
  if (name.includes('.env')) return { Icon: FileText, color: 'text-pink-400' };
  return { Icon: File, color: 'text-zinc-400' };
}

function languageFor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'javascript';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'json') return 'json';
  if (name.includes('.env')) return 'env';
  return 'text';
}

/** Oddiy tokenizator — asosiy syntax highlight uchun (kutubxonasiz). */
function highlight(code: string, lang: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = escape(code);

  if (lang === 'html') {
    html = html
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-zinc-500 italic">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-]*)/g, '$1<span class="text-pink-400">$2</span>')
      .replace(/([a-zA-Z-]+)=(&quot;[^&]*?&quot;)/g, '<span class="text-cyan-300">$1</span>=<span class="text-emerald-300">$2</span>');
  } else if (lang === 'css') {
    html = html
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500 italic">$1</span>')
      .replace(/([.#][\w-]+)(\s*\{)/g, '<span class="text-yellow-300">$1</span>$2')
      .replace(/([\w-]+)(\s*:)/g, '<span class="text-cyan-300">$1</span>$2')
      .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="text-emerald-300">$1</span>');
  } else if (lang === 'javascript' || lang === 'typescript') {
    html = html
      .replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500 italic">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|for|while|async|await|import|from|export|default|class|new|this|true|false|null|undefined)\b/g,
        '<span class="text-purple-400">$1</span>')
      .replace(/(&#39;[^&]*?&#39;|&quot;[^&]*?&quot;|`[^`]*?`)/g,
        '<span class="text-emerald-300">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-orange-300">$1</span>');
  } else if (lang === 'json') {
    html = html
      .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="text-cyan-300">$1</span>$2')
      .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="text-emerald-300">$1</span>')
      .replace(/:\s*(true|false|null)\b/g, ': <span class="text-purple-400">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="text-orange-300">$1</span>');
  } else if (lang === 'env') {
    html = html
      .replace(/(#[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>')
      .replace(/^([A-Z_][A-Z0-9_]*)=/gm, '<span class="text-cyan-300">$1</span>=');
  }
  return html;
}

// ── File Tree Item ─────────────────────────────────────────────────

function FileTreeItem({
  name, active, done, pending, onClick,
}: {
  name: string;
  active: boolean;
  done: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const { Icon, color } = fileIcon(name);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
        active
          ? 'bg-white/10 text-white'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
      <span className="truncate flex-1">{name}</span>
      {pending && <Loader2 className="w-3 h-3 text-purple-400 animate-spin shrink-0" />}
      {done && !pending && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function DeveloperView({
  files,
  isGenerating,
  onDownloadFile,
  skipAnimation = false,
}: DeveloperViewProps) {
  const fileNames = useMemo(() => (files ? Object.keys(files) : []), [files]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [typedChars, setTypedChars] = useState<Record<string, number>>({});
  const [completedFiles, setCompletedFiles] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // Fayllar kelganda birinchisini faol qilamiz va typing animatsiyani boshlaymiz
  useEffect(() => {
    if (!files || fileNames.length === 0) return;
    setActiveFile(prev => prev && fileNames.includes(prev) ? prev : fileNames[0]);

    if (skipAnimation) {
      // Animatsiyani o'tkazib yuboramiz — hamma faylni to'liq ko'rsatamiz
      const allDone: Record<string, number> = {};
      fileNames.forEach(n => { allDone[n] = files[n].length; });
      setTypedChars(allDone);
      setCompletedFiles(new Set(fileNames));
      return;
    }

    // Typing animatsiya: har bir fayl uchun ketma-ket ishlaydi
    let cancelled = false;
    const run = async () => {
      for (const name of fileNames) {
        if (cancelled) return;
        setActiveFile(name);
        setLogs(prev => [...prev, `$ creating ${name}...`]);
        const content = files[name];
        const chunkSize = Math.max(30, Math.floor(content.length / 80));
        for (let i = 0; i <= content.length; i += chunkSize) {
          if (cancelled) return;
          setTypedChars(prev => ({ ...prev, [name]: Math.min(i, content.length) }));
          await new Promise(r => setTimeout(r, 15));
        }
        setTypedChars(prev => ({ ...prev, [name]: content.length }));
        setCompletedFiles(prev => new Set(prev).add(name));
        setLogs(prev => [...prev, `✓ ${name} (${content.length} belgi)`]);
      }
      setLogs(prev => [...prev, '─────────────', '✨ Barcha fayllar tayyor!']);
    };
    void run();
    return () => { cancelled = true; };
  }, [files, skipAnimation]);

  // Faol fayl o'zgarganda scroll to top
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeFile]);

  // Log scroll bottom
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  // ── Kutish holati (generatsiya davom etmoqda, fayllar hali yo'q) ──
  if (!files && isGenerating) {
    return <GeneratingPlaceholder />;
  }

  if (!files) {
    return null;
  }

  const activeContent = activeFile ? files[activeFile] ?? '' : '';
  const typedCount = activeFile ? typedChars[activeFile] ?? 0 : 0;
  const visibleContent = activeContent.slice(0, typedCount);
  const isTypingActive = typedCount < activeContent.length;
  const lang = activeFile ? languageFor(activeFile) : 'text';
  const highlighted = highlight(visibleContent, lang);
  const lineCount = visibleContent.split('\n').length;

  return (
    <div className="h-full flex flex-col bg-[#0d0f14] text-zinc-200 font-mono text-[13px]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/5 bg-[#11141b] shrink-0 overflow-x-auto">
        {fileNames.map(name => {
          const { Icon, color } = fileIcon(name);
          const isActive = activeFile === name;
          const isDone = completedFiles.has(name);
          return (
            <button
              key={name}
              onClick={() => setActiveFile(name)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs border-r border-white/5 transition-colors shrink-0',
                isActive ? 'bg-[#0d0f14] text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-3 h-3', color)} />
              <span>{name.split('/').pop()}</span>
              {isDone ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ) : isActive && isTypingActive ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin text-purple-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* File tree */}
        <div className="w-52 border-r border-white/5 bg-[#0a0c11] p-2 overflow-y-auto shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <FolderOpen className="w-3 h-3" />
            Explorer
          </div>
          <div className="space-y-0.5">
            {fileNames.map(name => (
              <FileTreeItem
                key={name}
                name={name}
                active={activeFile === name}
                done={completedFiles.has(name)}
                pending={activeFile === name && isTypingActive}
                onClick={() => setActiveFile(name)}
              />
            ))}
          </div>
        </div>

        {/* Code area + terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File path bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-[#11141b] text-[11px] text-zinc-500 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="w-3 h-3 shrink-0" />
              <span className="truncate">{activeFile ?? '—'}</span>
              {isTypingActive && (
                <span className="flex items-center gap-1 text-purple-400 ml-2 shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-[10px]">AI yozmoqda…</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px]">{lineCount} qator</span>
              {activeFile && (
                <>
                  <button
                    onClick={async () => {
                      if (!activeFile) return;
                      await navigator.clipboard.writeText(files[activeFile]);
                      setCopiedFile(activeFile);
                      setTimeout(() => setCopiedFile(null), 1500);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Nusxalash"
                  >
                    {copiedFile === activeFile ? (
                      <><Check className="w-3 h-3 text-emerald-400" /> Nusxalandi</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Nusxa</>
                    )}
                  </button>
                  {onDownloadFile && (
                    <button
                      onClick={() => onDownloadFile(activeFile, files[activeFile])}
                      className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Faylni yuklab olish"
                    >
                      <Download className="w-3 h-3" /> Yuklab ol
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Code */}
          <div ref={scrollRef} className="flex-1 overflow-auto bg-[#0d0f14] min-h-0">
            <div className="flex min-h-full">
              {/* Line numbers */}
              <div className="shrink-0 px-3 py-3 text-right select-none text-zinc-600 text-[11px] leading-[1.6] border-r border-white/5 bg-[#0a0c11]">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre
                className="flex-1 px-4 py-3 leading-[1.6] whitespace-pre-wrap break-all text-[12.5px]"
                dangerouslySetInnerHTML={{
                  __html: highlighted + (isTypingActive
                    ? '<span class="inline-block w-1.5 h-3.5 bg-purple-400 animate-pulse ml-0.5 align-middle"></span>'
                    : ''),
                }}
              />
            </div>
          </div>

          {/* Terminal logs */}
          <div className="h-28 border-t border-white/5 bg-[#07090d] shrink-0 flex flex-col">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <Terminal className="w-3 h-3" />
              Terminal
              <div className="ml-auto flex items-center gap-1">
                <span className={cn('w-1.5 h-1.5 rounded-full',
                  isTypingActive ? 'bg-purple-400 animate-pulse' : 'bg-emerald-500')} />
                <span className="text-[10px] text-zinc-500">
                  {isTypingActive ? 'active' : 'idle'}
                </span>
              </div>
            </div>
            <div ref={logsRef} className="flex-1 overflow-y-auto px-3 py-1.5 text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <span className="text-zinc-600">$ kutmoqda...</span>
              ) : (
                logs.map((line, i) => (
                  <div key={i} className={cn(
                    line.startsWith('✓') ? 'text-emerald-400' :
                    line.startsWith('$') ? 'text-zinc-400' :
                    line.startsWith('✨') ? 'text-purple-400 font-bold' :
                    'text-zinc-500'
                  )}>{line}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Placeholder (kutish holati) ────────────────────────────────────

function GeneratingPlaceholder() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);

  const fakeFiles = [
    { name: 'index.html', delay: 0 },
    { name: 'css/styles.css', delay: 0.3 },
    { name: 'js/app.js', delay: 0.6 },
    { name: 'backend/server.js', delay: 0.9 },
    { name: 'backend/package.json', delay: 1.2 },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0d0f14] text-zinc-200 font-mono text-[13px]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#11141b]">
        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
        <span className="text-xs text-zinc-400">AI dasturchi ishga tushyapti{'.'.repeat(dots)}</span>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-52 border-r border-white/5 bg-[#0a0c11] p-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <FolderOpen className="w-3 h-3" /> Explorer
          </div>
          <div className="space-y-1">
            {fakeFiles.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 0.5, x: 0 }}
                transition={{ delay: f.delay, repeat: Infinity, repeatType: 'reverse', duration: 1 }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500"
              >
                <FileCode2 className="w-3.5 h-3.5 text-zinc-700" />
                <span className="truncate">{f.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30"
            >
              <FileCode2 className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">AI to'liq fayl tarkibini tayyorlayapti</h3>
            <p className="text-xs text-zinc-500 max-w-xs">
              HTML, CSS, JavaScript, Node.js backend — hammasi biroz vaqt oladi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
