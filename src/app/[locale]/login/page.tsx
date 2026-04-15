import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AdminLoginForm } from "@/features/auth/components/admin-login-form";
import { Link } from "@/i18n/navigation";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function LoginPage({
  params,
  searchParams,
}: Readonly<{
  params: P;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Login" });
  const adminLoginRequired = Boolean(process.env.ADMIN_USERNAME?.trim());
  const modeRaw = searchParams?.mode;
  const mode = typeof modeRaw === "string" ? modeRaw : Array.isArray(modeRaw) ? modeRaw[0] : "";
  const isAdminMode = mode === "admin";

  if (isAdminMode) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
        <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-muted/40" />}>
          <AdminLoginForm adminLoginRequired={adminLoginRequired} />
        </Suspense>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/builder-login" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t("backBuilder")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("hubTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("hubSubtitle")}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/builder-login"
            className="rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95"
          >
            {t("hubBuilder")}
          </Link>
          <Link
            href="/builder-signup"
            className="rounded-2xl border border-border bg-background py-3.5 text-sm font-semibold transition hover:bg-muted/50"
          >
            {t("hubSignup")}
          </Link>
        </div>
        <div className="border-t border-border pt-6">
          <Link
            href="/login?mode=admin&next=admin"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("hubAdmin")}
          </Link>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          ← {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
