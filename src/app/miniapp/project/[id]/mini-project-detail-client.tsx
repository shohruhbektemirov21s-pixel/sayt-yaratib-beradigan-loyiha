"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Row = { id: string; name: string; slug: string; status: string; updatedAt: string };

export function MiniProjectDetailClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [row, setRow] = useState<Row | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setRow(null);
      return;
    }
    void (async () => {
      const res = await fetch("/api/miniapp/projects", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; projects?: Row[] };
      if (!res.ok || !data.ok || !data.projects) {
        setRow(null);
        return;
      }
      setRow(data.projects.find((p) => p.id === id) ?? null);
    })();
  }, [id]);

  if (row === undefined) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Yuklanmoqda…</p>;
  }
  if (!row) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loyiha topilmadi.</p>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">{row.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Slug: {row.slug} · {row.status}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Yangilangan: {row.updatedAt.slice(0, 19)}</p>
      </div>
      <Link
        href={`/miniapp/builder?site=${encodeURIComponent(row.id)}`}
        className="block rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold shadow-sm"
      >
        Tahrirlash (builder)
      </Link>
      <Link
        href={`/miniapp/preview?site=${encodeURIComponent(row.id)}`}
        className="block rounded-2xl bg-primary py-4 text-center text-sm font-semibold text-primary-foreground shadow-md"
      >
        Ko‘rish
      </Link>
      <Link href="/miniapp/projects" className="block text-center text-sm font-medium text-primary">
        ← Loyihalar ro‘yxati
      </Link>
    </main>
  );
}
