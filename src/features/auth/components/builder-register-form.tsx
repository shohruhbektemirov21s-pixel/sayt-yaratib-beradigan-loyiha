"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { saasElevatedPanel } from "@/components/ui/saas-surface";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { builderRegisterBodySchema } from "@/lib/auth/builder-register.validation";
import { clientApiUrl } from "@/lib/client-api-url";

type FieldKey = "firstName" | "lastName" | "contact" | "password" | "confirmPassword";

type ApiRegisterResponse = {
  ok?: boolean;
  error?: string;
  provision?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function firstIssue(issues: string[] | undefined, fallback: string): string {
  const m = issues?.[0];
  return typeof m === "string" && m.length > 0 ? m : fallback;
}

export function BuilderRegisterForm() {
  const t = useTranslations("BuilderSignup");
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const clearField = useCallback((key: FieldKey) => {
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const translateIssue = useMemo(
    () => (code: string) => {
      const map: Record<string, string> = {
        required: t("errRequired"),
        password_min: t("errPasswordMin"),
        password_mismatch: t("errPasswordMismatch"),
        contact_required: t("errContact"),
        contact_email: t("errEmail"),
        contact_phone: t("errPhone"),
      };
      return map[code] ?? t("errGeneric");
    },
    [t],
  );

  const runClientValidation = useCallback((): boolean => {
    const parsed = builderRegisterBodySchema.safeParse({
      firstName,
      lastName,
      contact,
      password,
      confirmPassword,
    });
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: Partial<Record<FieldKey, string>> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (path === "firstName" || path === "lastName" || path === "contact" || path === "password" || path === "confirmPassword") {
        const msg = typeof issue.message === "string" ? issue.message : "required";
        next[path] = translateIssue(msg);
      }
    }
    setErrors(next);
    return false;
  }, [confirmPassword, contact, firstName, lastName, password, translateIssue]);

  const submit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!runClientValidation()) {
      toast.error(t("toastFixForm"));
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch(clientApiUrl("/api/auth/builder/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          contact: contact.trim(),
          password,
          confirmPassword,
        }),
      });
      let data: ApiRegisterResponse = {};
      try {
        data = (await res.json()) as ApiRegisterResponse;
      } catch {
        toast.error(t("toastNetwork"));
        return;
      }

      if (res.status === 422 && data.fieldErrors) {
        const fe = data.fieldErrors;
        setErrors({
          firstName: fe.firstName ? translateIssue(firstIssue(fe.firstName, "required")) : undefined,
          lastName: fe.lastName ? translateIssue(firstIssue(fe.lastName, "required")) : undefined,
          contact: fe.contact ? translateIssue(firstIssue(fe.contact, "contact_required")) : undefined,
          password: fe.password ? translateIssue(firstIssue(fe.password, "password_min")) : undefined,
          confirmPassword: fe.confirmPassword
            ? translateIssue(firstIssue(fe.confirmPassword, "password_mismatch"))
            : undefined,
        });
        toast.error(t("toastFixForm"));
        return;
      }

      if (res.ok && data.ok) {
        toast.success(t("toastOk"));
        router.push("/");
        router.refresh();
        return;
      }

      if (res.status === 409 && data.error === "contact_taken") {
        toast.error(t("toastTaken"));
        return;
      }

      if (res.status === 501 || data.error === "registration_backend_pending") {
        toast.error(t("toastServer"));
        return;
      }

      if (!res.ok) {
        toast.error(t("toastServer"));
        return;
      }
    } catch {
      toast.error(t("toastNetwork"));
    } finally {
      setBusy(false);
    }
  }, [confirmPassword, contact, firstName, lastName, password, router, runClientValidation, t, translateIssue]);

  const inputClass =
    "mt-1.5 w-full rounded-2xl border border-border/80 bg-background px-4 py-3.5 text-sm shadow-inner outline-none ring-offset-background placeholder:text-muted-foreground transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full max-w-md p-6 sm:p-8", saasElevatedPanel)}
      onSubmit={(e) => void submit(e)}
      noValidate
    >
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <UserPlus className="size-5" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor="reg-first" className="block text-sm font-medium text-foreground">
            {t("firstName")}
          </label>
          <input
            id="reg-first"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearField("firstName");
            }}
            disabled={busy}
            className={inputClass}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "reg-first-err" : undefined}
          />
          {errors.firstName ? (
            <p id="reg-first-err" className="mt-1 text-xs text-destructive">
              {errors.firstName}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="reg-last" className="block text-sm font-medium text-foreground">
            {t("lastName")}
          </label>
          <input
            id="reg-last"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearField("lastName");
            }}
            disabled={busy}
            className={inputClass}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "reg-last-err" : undefined}
          />
          {errors.lastName ? (
            <p id="reg-last-err" className="mt-1 text-xs text-destructive">
              {errors.lastName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="reg-contact" className="block text-sm font-medium text-foreground">
          {t("contact")}
        </label>
        <input
          id="reg-contact"
          name="contact"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder={t("contactPlaceholder")}
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            clearField("contact");
          }}
          disabled={busy}
          className={inputClass}
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? "reg-contact-err" : undefined}
        />
        {errors.contact ? (
          <p id="reg-contact-err" className="mt-1 text-xs text-destructive">
            {errors.contact}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{t("contactHint")}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="reg-pass" className="block text-sm font-medium text-foreground">
          {t("password")}
        </label>
        <div className="relative mt-1.5">
          <input
            id="reg-pass"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearField("password");
            }}
            disabled={busy}
            className={`${inputClass} pr-12`}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "reg-pass-err" : undefined}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        {errors.password ? (
          <p id="reg-pass-err" className="mt-1 text-xs text-destructive">
            {errors.password}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{t("passwordHint")}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="reg-pass2" className="block text-sm font-medium text-foreground">
          {t("confirmPassword")}
        </label>
        <input
          id="reg-pass2"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearField("confirmPassword");
          }}
          disabled={busy}
          className={inputClass}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? "reg-pass2-err" : undefined}
        />
        {errors.confirmPassword ? (
          <p id="reg-pass2-err" className="mt-1 text-xs text-destructive">
            {errors.confirmPassword}
          </p>
        ) : null}
      </div>

      <motion.button
        type="submit"
        disabled={busy}
        whileTap={busy ? undefined : { scale: 0.98 }}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t("submit")}
      </motion.button>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/builder-login" className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("haveAccount")}
        </Link>
      </p>
    </motion.form>
  );
}
