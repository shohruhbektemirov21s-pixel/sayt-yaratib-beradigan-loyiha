"use client";

import { useCallback, useEffect, useState } from "react";

import { tryGetPublicAppBaseUrl } from "@/lib/public-app-url";

type MePayload = {
  ok?: boolean;
  profile?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    authSource: string;
    linkedWeb: { id: string; email: string | null } | null;
    subscription: unknown;
    siteCount: number;
  };
  error?: string;
};

export function MiniAccountClient() {
  const web = tryGetPublicAppBaseUrl();
  const [me, setMe] = useState<MePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkContact, setLinkContact] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/miniapp/me", { credentials: "include" });
    const data = (await res.json()) as MePayload;
    setMe(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const linkWeb = async () => {
    setBusy(true);
    setLinkMsg(null);
    try {
      const res = await fetch("/api/miniapp/link/web-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contact: linkContact.trim(), password: linkPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; alreadyLinked?: boolean };
      if (!res.ok || !data.ok) {
        setLinkMsg(data.error ?? "Xato");
        return;
      }
      setLinkMsg(data.alreadyLinked ? "Allaqachon bog‘langan." : "Veb akkaunt muvaffaqiyatli bog‘landi.");
      setLinkPassword("");
      await load();
    } catch {
      setLinkMsg("Tarmoq xatosi.");
    } finally {
      setBusy(false);
    }
  };

  if (!me) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Yuklanmoqda…</p>;
  }
  if (!me.ok || !me.profile) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-destructive">{me.error ?? "Sessiya yo‘q — Mini Appni qayta oching."}</p>
      </main>
    );
  }

  const p = me.profile;
  const displayName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.username || "Foydalanuvchi";

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
        <p className="mt-1 text-xs text-muted-foreground">@{p.username ?? "—"} · {p.authSource}</p>
        <p className="mt-2 text-sm text-muted-foreground">Saqlangan saytlar: {p.siteCount}</p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-foreground">Veb akkauntni bog‘lash</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Saytda ro‘yxatdan o‘tgan email/telefon va parolingizni kiriting — Telegram akkauntingiz bilan birlashtiramiz.
        </p>
        {p.linkedWeb ? (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Bog‘langan: {p.linkedWeb.email ?? p.linkedWeb.id}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              placeholder="Email yoki telefon"
              value={linkContact}
              onChange={(e) => setLinkContact(e.target.value)}
              autoComplete="username"
            />
            <input
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              placeholder="Parol"
              type="password"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void linkWeb()}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Bog‘lanmoqda…" : "Bog‘lash"}
            </button>
            {linkMsg ? <p className="text-xs text-muted-foreground">{linkMsg}</p> : null}
          </div>
        )}
      </div>

      {web ? (
        <a
          href={`${web}/uz/builder-login`}
          className="block rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold shadow-sm"
        >
          Veb-kabinetga o‘tish
        </a>
      ) : null}
    </main>
  );
}
