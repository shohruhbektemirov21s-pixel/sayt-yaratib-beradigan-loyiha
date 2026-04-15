"use client";

import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { saasElevatedPanel } from "@/components/ui/saas-surface";
import { clientApiUrl } from "@/lib/client-api-url";
import { cn } from "@/lib/utils";

export function BuilderForgotPasswordForm() {
  const t = useTranslations("BuilderForgot");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devPath, setDevPath] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!contact.trim()) {
      toast.error(t("toastEmpty"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(clientApiUrl("/api/auth/builder/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contact.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; devResetPath?: string };
      setSent(true);
      toast.success(t("toastOk"));
      if (typeof data.devResetPath === "string") {
        setDevPath(data.devResetPath);
      }
    } catch {
      toast.error(t("toastNetwork"));
    } finally {
      setBusy(false);
    }
  }, [contact, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full max-w-md p-6 sm:p-8", saasElevatedPanel)}
    >
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Mail className="size-5" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>

      <label htmlFor="forgot-contact" className="mt-6 block text-sm font-medium text-foreground">
        {t("contact")}
      </label>
      <input
        id="forgot-contact"
        type="text"
        autoComplete="username"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        disabled={busy || sent}
        className="mt-2 w-full rounded-2xl border border-border/80 bg-background px-4 py-3.5 text-sm shadow-inner outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
      />

      {sent ? (
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>{t("afterNote")}</p>
          {devPath ? (
            <p className="break-all rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 p-2 font-mono text-xs text-amber-950 dark:text-amber-100">
              DEV: <a href={devPath}>{devPath}</a>
            </p>
          ) : null}
        </div>
      ) : null}

      <motion.button
        type="button"
        disabled={busy || sent}
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
