"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { AdminPlatformStatsClient } from "@/lib/admin/admin-dto";

type Props = { stats: AdminPlatformStatsClient | null };

function uzsFromMinor(minor: number): string {
  return (minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function AdminPlatformOverviewStats({ stats }: Readonly<Props>) {
  const t = useTranslations("Admin");
  const cards = useMemo(() => {
    if (!stats) {
      return [];
    }
    return [
      { k: "pTotalUsers", v: stats.totalUsers },
      { k: "pWebUsers", v: stats.usersWebsiteOnly },
      { k: "pTgUsers", v: stats.usersTelegramOnly },
      { k: "pBoth", v: stats.usersBothLinked },
      { k: "pUserAuthTg", v: stats.userAuthTelegram },
      { k: "pUserAuthBoth", v: stats.userAuthBoth },
      { k: "pActiveManaged", v: stats.activeManagedSubscriptions },
      { k: "pExpiredManaged", v: stats.expiredManagedSubscriptions },
      { k: "pAcqTg", v: stats.managedAcqTelegramMiniApp },
      { k: "pAcqWeb", v: stats.managedAcqWebsite },
      { k: "pAcqAdmin", v: stats.managedAcqAdmin },
      { k: "pAcqUnset", v: stats.managedAcqUnset },
      { k: "pFree", v: stats.freeUsersApprox },
      { k: "pPaid", v: stats.paidUsersApprox },
    ] as const;
  }, [stats]);

  if (!stats) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
        {t("platformStatsUnavailable")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ k, v }) => (
          <div
            key={k}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(k)}</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{v.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("pTotalRevenue")}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{uzsFromMinor(stats.totalRevenueMinor)} so‘m</p>
          <p className="mt-1 text-xs text-slate-500">
            {t("pRevenueBreakdown", {
              payme: uzsFromMinor(stats.revenuePaymeMinor),
              managed: uzsFromMinor(stats.revenueManagedPurchasedMinor),
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("pPopularPlan")}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.mostPopularPlanSlug ?? "—"}{" "}
            <span className="text-base font-medium text-slate-500">
              ({stats.mostPopularPlanCount.toLocaleString()})
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
