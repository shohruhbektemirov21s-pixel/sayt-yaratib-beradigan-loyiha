"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { tryGetPublicAppBaseUrl } from "@/lib/public-app-url";
import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";

export function MiniBuilderClient() {
  const searchParams = useSearchParams();
  const siteFromUrl = searchParams.get("site")?.trim() ?? "";

  const [prompt, setPrompt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [templateKind, setTemplateKind] = useState<"balanced" | "corporate" | "portfolio" | "landing">("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [schema, setSchema] = useState<WebsiteSchema | null>(null);
  const [phase, setPhase] = useState<"idle" | "generating" | "saving">("idle");
  const [loadBusy, setLoadBusy] = useState(false);

  const loadExisting = useCallback(async (id: string) => {
    setLoadBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/miniapp/sites/${encodeURIComponent(id)}`, { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        site?: { id: string; title: string; schema: WebsiteSchema };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.site) {
        setError(data.error ?? "Loyiha yuklanmadi.");
        setSiteId(null);
        setSchema(null);
        return;
      }
      setSiteId(data.site.id);
      setSchema(data.site.schema);
      setPrompt("");
    } catch {
      setError("Tarmoq xatosi.");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!siteFromUrl) {
      return;
    }
    void loadExisting(siteFromUrl);
  }, [siteFromUrl, loadExisting]);

  const runGenerate = async () => {
    const p = prompt.trim();
    if (!p) {
      setError("Matn kiriting.");
      return;
    }
    setBusy(true);
    setError(null);
    setPhase("generating");
    setSiteId(null);
    setSchema(null);
    try {
      const gen = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: p, locale: "uz", templateKind }),
      });
      const genJson = (await gen.json()) as { schema?: WebsiteSchema; error?: string };
      if (!gen.ok || !genJson.schema) {
        setError(genJson.error ?? "Generatsiya muvaffaqiyatsiz.");
        return;
      }
      setSchema(genJson.schema);
      setPhase("saving");
      const save = await fetch("/api/miniapp/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schema: genJson.schema }),
      });
      const saveJson = (await save.json()) as { ok?: boolean; siteId?: string; error?: string };
      if (!save.ok || !saveJson.ok || !saveJson.siteId) {
        setError(saveJson.error ?? "Saqlash muvaffaqiyatsiz.");
        return;
      }
      setSiteId(saveJson.siteId);
    } catch {
      setError("Tarmoq xatosi.");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  };

  const runRegenerate = async () => {
    if (!siteId || !schema) {
      setError("Avval loyiha yaratilishi kerak.");
      return;
    }
    const fb = feedback.trim();
    if (!fb) {
      setError("Qanday o‘zgartirish kerakligini yozing.");
      return;
    }
    setBusy(true);
    setError(null);
    setPhase("generating");
    try {
      const gen = await fetch("/api/website/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schema, feedback: fb, locale: "uz" }),
      });
      const genJson = (await gen.json()) as { schema?: WebsiteSchema; error?: string };
      if (!gen.ok || !genJson.schema) {
        setError(genJson.error ?? "Qayta generatsiya muvaffaqiyatsiz.");
        return;
      }
      setSchema(genJson.schema);
      setPhase("saving");
      const patch = await fetch(`/api/miniapp/sites/${encodeURIComponent(siteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schema: genJson.schema }),
      });
      const patchJson = (await patch.json()) as { ok?: boolean; error?: string };
      if (!patch.ok || !patchJson.ok) {
        setError(patchJson.error ?? "Saqlash muvaffaqiyatsiz.");
        return;
      }
      setFeedback("");
    } catch {
      setError("Tarmoq xatosi.");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  };

  const webBase = tryGetPublicAppBaseUrl();
  const statusLabel =
    phase === "generating" ? "AI ishlayapti…" : phase === "saving" ? "Saqlanmoqda…" : busy ? "Kuting…" : null;

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Sayt yaratish</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Biznesingiz haqida qisqa yozing — AI sxema yaratadi va saqlaydi. Loyihani davom ettirish uchun URLda{" "}
          <span className="font-mono text-xs">?site=</span> parametri ishlatiladi.
        </p>
      </div>

      {loadBusy ? <p className="text-center text-sm text-muted-foreground">Loyiha yuklanmoqda…</p> : null}

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shablon</span>
        <select
          className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
          value={templateKind}
          disabled={Boolean(siteId)}
          onChange={(e) => setTemplateKind(e.target.value as typeof templateKind)}
        >
          <option value="balanced">Universal</option>
          <option value="corporate">Korporativ</option>
          <option value="portfolio">Portfolio</option>
          <option value="landing">Landing</option>
        </select>
        {siteId ? (
          <p className="text-xs text-muted-foreground">Mavjud loyihada shablon o‘zgartirilmaydi — yangi sayt uchun yangi generatsiya qiling.</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tavsif</span>
        <textarea
          className="min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed"
          maxLength={WEBSITE_PROMPT_MAX_CHARS}
          placeholder="Masalan: Toshkentda kofe va desertlar, yetkazib berish…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>

      {siteId && schema ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qayta generatsiya</span>
          <textarea
            className="min-h-[88px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            maxLength={WEBSITE_PROMPT_MAX_CHARS}
            placeholder="Nimani o‘zgartirish kerak? (masalan: ranglar yumshoqroq, hero matni qisqaroq…)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void runRegenerate()}
            className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold shadow-sm transition hover:bg-muted/40 disabled:opacity-50"
          >
            {busy ? "Qayta generatsiya…" : "AI bilan yangilash va saqlash"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {statusLabel ? <p className="text-center text-xs font-medium text-primary">{statusLabel}</p> : null}

      <button
        type="button"
        disabled={busy || loadBusy}
        onClick={() => void runGenerate()}
        className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-50"
      >
        {busy && phase !== "idle" ? (phase === "saving" ? "Saqlanmoqda…" : "Generatsiya…") : "AI bilan yaratish (yangi)"}
      </button>

      {siteId ? (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Tayyor! Ko‘rish va tahrirlash:</p>
          <Link
            href={`/miniapp/preview?site=${encodeURIComponent(siteId)}`}
            className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
          >
            Ko‘rish (Mini App)
          </Link>
          <Link
            href={`/miniapp/builder?site=${encodeURIComponent(siteId)}`}
            className="block rounded-xl border border-border bg-card py-3 text-center text-sm font-semibold"
          >
            Builderda davom etish
          </Link>
          {webBase ? (
            <a
              href={`${webBase}/uz/builder`}
              className="block rounded-xl border border-border bg-card py-3 text-center text-sm font-semibold"
            >
              Veb-saytda davom etish
            </a>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
