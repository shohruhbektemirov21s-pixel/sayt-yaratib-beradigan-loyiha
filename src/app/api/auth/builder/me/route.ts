import { NextResponse } from "next/server";

import { getValidatedWebUserFromBuilderCookie } from "@/lib/auth/web-user-builder-session";
import { isAdminSession } from "@/lib/admin/session";
import { getBuilderSessionPayload } from "@/lib/builder/builder-session";
import { prisma } from "@/lib/prisma";

function adminDisplayPlan(): string {
  return process.env.ADMIN_AI_PLAN_TIER?.trim().toLowerCase() || "pro";
}

export async function GET(): Promise<NextResponse> {
  const admin = isAdminSession();
  const builder = getBuilderSessionPayload();
  const web = await getValidatedWebUserFromBuilderCookie();

  if (!admin && !builder) {
    return NextResponse.json({
      authenticated: false,
      isAdmin: false,
      planTier: null,
      subscriptionUntilMs: null,
      billingAccountId: null,
      serverTokenBalance: null,
      webUser: null,
    });
  }

  if (admin && !builder) {
    return NextResponse.json({
      authenticated: true,
      isAdmin: true,
      planTier: adminDisplayPlan(),
      subscriptionUntilMs: null,
      billingAccountId: null,
      serverTokenBalance: null,
      webUser: null,
    });
  }

  let planTier = builder!.tier;
  let subscriptionUntilMs = builder!.subscriptionUntilMs;
  let serverTokenBalance: number | null = null;
  let billingAccountId = builder!.billingId;

  if (web) {
    billingAccountId = web.billingAccountId;
    if (web.billingAccountId) {
      const acc = await prisma.billingAccount.findUnique({ where: { id: web.billingAccountId } });
      if (acc) {
        serverTokenBalance = acc.tokenBalance;
        if (acc.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
          const raw = acc.planTier.trim().toLowerCase();
          planTier = raw === "premium" ? "premium" : raw === "pro" ? "pro" : "basic";
          subscriptionUntilMs = acc.subscriptionUntil.getTime();
        }
      }
    }
    const now = new Date();
    const managed = await prisma.managedSubscription.findFirst({
      where: {
        webUserId: web.id,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      select: { planSlug: true },
    });
    if (managed) {
      const s = managed.planSlug.toLowerCase();
      planTier = s.includes("premium") ? "premium" : s.includes("pro") ? "pro" : "basic";
    }
  } else if (builder!.billingId) {
    const acc = await prisma.billingAccount.findUnique({ where: { id: builder!.billingId } });
    if (acc) {
      serverTokenBalance = acc.tokenBalance;
      if (acc.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
        const raw = acc.planTier.trim().toLowerCase();
        planTier = raw === "premium" ? "premium" : raw === "pro" ? "pro" : "basic";
        subscriptionUntilMs = acc.subscriptionUntil.getTime();
      }
    }
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin: admin,
    planTier,
    subscriptionUntilMs,
    billingAccountId,
    serverTokenBalance,
    webUser: web
      ? {
          id: web.id,
          firstName: web.firstName,
          lastName: web.lastName,
          email: web.email,
          phone: web.phone,
          linkedTelegram: Boolean(web.linkedTelegramUserId),
        }
      : null,
  });
}
