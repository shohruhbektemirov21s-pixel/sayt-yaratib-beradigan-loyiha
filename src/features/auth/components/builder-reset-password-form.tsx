"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { saasElevatedPanel } from "@/components/ui/saas-surface";
import { clientApiUrl } from "@/lib/client-api-url";
import { cn } from "@/lib/utils";

export function BuilderResetPasswordForm() {
  const t = useTranslations("BuilderReset");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (!token) {
      toast.error(t("toastNoToken"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("toastShort"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("toastMismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(clientApiUrl("/api/auth/builder/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error === "password_mismatch" ? t("toastMismatch") : t("toastBad"));
        return;
      }
      toast.success(t("toastOk"));
      router.push("/builder-login");
      router.refresh();
    } catch {
      toast.error(t("toastNetwork"));
    } finally {
      setBusy(false);
    }
  }, [confirm, password, router, t, token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full max-w-md p-6 sm:p-8", saasElevatedPanel)}
    >
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <KeyRound className="size-5" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>

      {!token ? <p className="mt-4 text-sm text-destructive">{t("missingToken")}</p> : null}

      <label htmlFor="reset-pass" className="mt-6 block text-sm font-medium text-foreground">
        {t("password")}
      </label>
      <div className="relative mt-2">
        <input
          id="reset-pass"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy || !token}
          className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3.5 pr-12 text-sm shadow-inner outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={show ? t("hidePassword") : t("showPassword")}
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>

      <label htmlFor="reset-pass2" className="mt-4 block text-sm font-medium text-foreground">
        {t("confirm")}
      </label>
      <input
        id="reset-pass2"
        type={show ? "text" : "password"}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={busy || !token}
        className="mt-2 w-full rounded-2xl border border-border/80 bg-background px-4 py-3.5 text-sm shadow-inner outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
      />

      <motion.button
        type="button"
        disabled={busy || !token}
        onClick={() => void submit()}
        whileTap={busy ? undefined : { scale: 0.98 }}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t("submit")}
      </motion.button>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/builder-login" className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("backLogin")}
        </Link>
      </p>
    </motion.div>
  );
}
