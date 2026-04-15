"use client";

import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type PreviewPageMeta = { slug: string; title: string };

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      siteName: string;
      previewSrcDoc: string;
      pages: PreviewPageMeta[];
      activePageSlug: string | null;
    };

function MiniAppPreviewInner() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get("site");
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [scriptReady, setScriptReady] = useState(false);

  const loadPreview = useCallback(
    async (pageSlug: string | null) => {
      if (!siteId) {
        setState({ status: "error", message: "Sayt identifikatori (site) URLda yo‘q." });
        return;
      }

      const initData = window.Telegram?.WebApp?.initData ?? "";
      if (!initData) {
        setState({
          status: "error",
          message: "Telegram initData topilmadi. Iltimos, bot orqali Mini Appni oching.",
        });
        return;
      }

      setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));

      const qs = new URLSearchParams({ site: siteId });
      if (pageSlug) {
        qs.set("page", pageSlug);
      }

      try {
        const response = await fetch(`/api/miniapp/preview?${qs.toString()}`, {
          headers: { Authorization: `tma ${initData}` },
        });
        let payload: {
          previewSrcDoc?: string;
          siteName?: string;
          pages?: PreviewPageMeta[];
          activePage?: string | null;
          error?: string;
        };
        try {
          payload = (await response.json()) as typeof payload;
        } catch {
          setState({ status: "error", message: "Server javobi noto‘g‘ri formatda." });
          return;
        }
        if (!response.ok) {
          setState({ status: "error", message: payload.error ?? `HTTP ${response.status}` });
          return;
        }
        if (!payload.previewSrcDoc || !payload.siteName) {
          setState({ status: "error", message: "Server javobi to‘liq emas." });
          return;
        }
        const pages = Array.isArray(payload.pages) ? payload.pages : [];
        setState({
          status: "ready",
          siteName: payload.siteName,
          previewSrcDoc: payload.previewSrcDoc,
          pages,
          activePageSlug: payload.activePage ?? pages[0]?.slug ?? null,
        });
      } catch {
        setState({ status: "error", message: "Tarmoq xatosi." });
      }
    },
    [siteId],
  );

  useEffect(() => {
    if (!scriptReady || !siteId) {
      return;
    }
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const initial = searchParams.get("page")?.trim() || null;
    void loadPreview(initial);
  }, [scriptReady, siteId, loadPreview, searchParams]);

  const onSelectPage = (slug: string) => {
    if (state.status !== "ready") {
      return;
    }
    if (slug === state.activePageSlug) {
      return;
    }
    void loadPreview(slug);
  };

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <main className="flex min-h-dvh flex-col">
        <header className="border-b border-border bg-card px-4 py-3">
          <h1 className="text-sm font-semibold text-foreground">
            {state.status === "ready" ? state.siteName : "Preview"}
          </h1>
          <p className="text-xs text-muted-foreground">Telegram Mini App</p>
        </header>

        {state.status === "ready" && state.pages.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-muted/20 px-3 py-2">
            {state.pages.map((p) => {
              const active = p.slug === state.activePageSlug;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => onSelectPage(p.slug)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border"
                  }`}
                >
                  {p.title || p.slug}
                </button>
              );
            })}
          </div>
        ) : null}

        {state.status === "loading" ? (
          <p className="p-4 text-sm text-muted-foreground">Yuklanmoqda…</p>
        ) : null}

        {state.status === "error" ? (
          <p className="p-4 text-sm text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" ? (
          <iframe
            key={state.activePageSlug ?? "default"}
            title="Preview"
            className="min-h-[70vh] w-full flex-1 border-0"
            srcDoc={state.previewSrcDoc}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : null}
      </main>
    </>
  );
}

export default function MiniAppPreviewPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Yuklanmoqda…</p>}>
      <MiniAppPreviewInner />
    </Suspense>
  );
}
