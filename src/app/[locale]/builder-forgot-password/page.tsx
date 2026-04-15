import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { BuilderForgotPasswordForm } from "@/features/auth/components/builder-forgot-password-form";
import { Link } from "@/i18n/navigation";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function BuilderForgotPasswordPage({ params }: Readonly<{ params: P }>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "BuilderForgot" });
  return (
    <div className="relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.16),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.2),transparent)]"
        aria-hidden
      />
      <Suspense fallback={<div className="h-52 w-full max-w-md animate-pulse rounded-2xl bg-muted/50" />}>
        <BuilderForgotPasswordForm />
      </Suspense>
      <p className="relative mt-10 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          ← {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
