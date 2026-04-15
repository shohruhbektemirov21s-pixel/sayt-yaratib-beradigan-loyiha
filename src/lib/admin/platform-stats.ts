import "server-only";

import { prisma } from "@/lib/prisma";

export type AdminPlatformStats = {
  totalUsers: number;
  usersWebsiteOnly: number;
  usersTelegramOnly: number;
  usersBothLinked: number;
  activeManagedSubscriptions: number;
  expiredManagedSubscriptions: number;
  freeUsersApprox: number;
  paidUsersApprox: number;
  revenuePaymeMinor: number;
  revenueManagedPurchasedMinor: number;
  totalRevenueMinor: number;
  mostPopularPlanSlug: string | null;
  mostPopularPlanCount: number;
  userAuthTelegram: number;
  userAuthBoth: number;
  managedAcqTelegramMiniApp: number;
  managedAcqWebsite: number;
  managedAcqAdmin: number;
  managedAcqUnset: number;
};

function isLegacySubActive(expiresAt: Date | null): boolean {
  return expiresAt == null || expiresAt > new Date();
}

function managedIsLive(endsAt: Date | null, status: string): boolean {
  if (status !== "ACTIVE") {
    return false;
  }
  return endsAt == null || endsAt > new Date();
}

export async function getAdminPlatformStats(): Promise<AdminPlatformStats> {
  const n = new Date();

  const [
    telegramCount,
    webCount,
    linkedBothCount,
    paymeAgg,
    managedPurchasedAgg,
    managedBySlug,
    legacyByPlan,
    allManagedSubs,
    tgUsers,
    userAuthGroups,
    managedAcqGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.webUser.count(),
    prisma.webUser.count({ where: { linkedTelegramUserId: { not: null } } }),
    prisma.paymentTransaction.aggregate({
      where: { status: "completed" },
      _sum: { amount: true },
    }),
    prisma.managedSubscription.aggregate({
      where: { source: "PURCHASED", priceAppliedMinor: { not: null } },
      _sum: { priceAppliedMinor: true },
    }),
    prisma.managedSubscription.groupBy({
      by: ["planSlug"],
      _count: { planSlug: true },
    }),
    prisma.subscription.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
    prisma.managedSubscription.findMany({
      select: { status: true, endsAt: true },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        subscriptions: { select: { expiresAt: true } },
        managedSubscriptions: {
          where: { status: "ACTIVE" },
          select: { endsAt: true },
        },
        linkedWebAccount: {
          select: {
            managedSubscriptions: {
              where: { status: "ACTIVE" },
              select: { endsAt: true },
            },
          },
        },
      },
    }),
    prisma.user.groupBy({
      by: ["authSource"],
      _count: { authSource: true },
    }),
    prisma.managedSubscription.groupBy({
      by: ["acquisitionChannel"],
      where: { status: "ACTIVE" },
      _count: { acquisitionChannel: true },
    }),
  ]);

  const activeManaged = allManagedSubs.filter((s) => managedIsLive(s.endsAt, s.status)).length;
  const expiredManaged = await prisma.managedSubscription.count({
    where: {
      OR: [{ status: "EXPIRED" }, { status: "ACTIVE", endsAt: { lte: n } }],
    },
  });

  const isPaidTelegram = (u: (typeof tgUsers)[number]): boolean => {
    const managedLists = [
      ...u.managedSubscriptions,
      ...(u.linkedWebAccount?.managedSubscriptions ?? []),
    ];
    if (managedLists.some((m) => managedIsLive(m.endsAt, "ACTIVE"))) {
      return true;
    }
    return u.subscriptions.some((s) => isLegacySubActive(s.expiresAt));
  };

  const paidTelegram = tgUsers.filter(isPaidTelegram).length;
  const paidWebOnly = await prisma.webUser.count({
    where: {
      linkedTelegramUserId: null,
      managedSubscriptions: {
        some: {
          status: "ACTIVE",
          OR: [{ endsAt: null }, { endsAt: { gt: n } }],
        },
      },
    },
  });

  const paidUsersApprox = paidTelegram + paidWebOnly;
  const totalIdentities = telegramCount + webCount - linkedBothCount;
  const freeUsersApprox = Math.max(0, totalIdentities - paidUsersApprox);

  const revenuePaymeMinor = paymeAgg._sum.amount ?? 0;
  const revenueManagedPurchasedMinor = managedPurchasedAgg._sum.priceAppliedMinor ?? 0;
  const totalRevenueMinor = revenuePaymeMinor + revenueManagedPurchasedMinor;

  const slugCounts = new Map<string, number>();
  for (const row of managedBySlug) {
    slugCounts.set(row.planSlug, row._count.planSlug);
  }
  for (const row of legacyByPlan) {
    slugCounts.set(row.plan, (slugCounts.get(row.plan) ?? 0) + row._count.plan);
  }
  let topSlug: string | null = null;
  let topCount = 0;
  for (const [slug, c] of Array.from(slugCounts.entries())) {
    if (c > topCount) {
      topCount = c;
      topSlug = slug;
    }
  }

  let userAuthTelegram = 0;
  let userAuthBoth = 0;
  for (const row of userAuthGroups) {
    if (row.authSource === "TELEGRAM") {
      userAuthTelegram = row._count.authSource;
    } else if (row.authSource === "BOTH") {
      userAuthBoth = row._count.authSource;
    }
  }

  let managedAcqTelegramMiniApp = 0;
  let managedAcqWebsite = 0;
  let managedAcqAdmin = 0;
  let managedAcqUnset = 0;
  for (const row of managedAcqGroups) {
    const c = row._count.acquisitionChannel;
    if (row.acquisitionChannel === "TELEGRAM_MINI_APP") {
      managedAcqTelegramMiniApp = c;
    } else if (row.acquisitionChannel === "WEBSITE") {
      managedAcqWebsite = c;
    } else if (row.acquisitionChannel === "ADMIN") {
      managedAcqAdmin = c;
    } else {
      managedAcqUnset += c;
    }
  }

  return {
    totalUsers: totalIdentities,
    usersWebsiteOnly: webCount - linkedBothCount,
    usersTelegramOnly: telegramCount - linkedBothCount,
    usersBothLinked: linkedBothCount,
    activeManagedSubscriptions: activeManaged,
    expiredManagedSubscriptions: expiredManaged,
    freeUsersApprox,
    paidUsersApprox,
    revenuePaymeMinor,
    revenueManagedPurchasedMinor,
    totalRevenueMinor,
    mostPopularPlanSlug: topSlug,
    mostPopularPlanCount: topCount,
    userAuthTelegram,
    userAuthBoth,
    managedAcqTelegramMiniApp,
    managedAcqWebsite,
    managedAcqAdmin,
    managedAcqUnset,
  };
}
