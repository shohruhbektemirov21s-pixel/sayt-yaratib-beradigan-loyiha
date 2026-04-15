import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { SchemaPlanTier } from "@/lib/ai/prompts-schema-spec";
import { getApiGenerateMessages } from "@/lib/api-generate-messages";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin/session";
import { BUILDER_SESSION_COOKIE, parseBuilderSessionToken } from "@/lib/builder/builder-session";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { MINIAPP_SESSION_COOKIE, parseMiniappSessionToken } from "@/lib/telegram/miniapp-session";

function envAdminPlan(): SchemaPlanTier {
  const v = process.env.ADMIN_AI_PLAN_TIER?.trim().toLowerCase();
  if (v === "basic") return "basic";
  if (v === "premium") return "premium";
  return "pro";
}

function tierFromPlanSlug(slug: string): SchemaPlanTier {
  const s = slug.toLowerCase();
  if (s.includes("premium")) return "premium";
  if (s.includes("pro")) return "pro";
  return "basic";
}

async function resolveTierForWebUser(webUserId: string): Promise<SchemaPlanTier> {
  const wu = await prisma.webUser.findUnique({
    where: { id: webUserId },
    select: { billingAccountId: true, linkedTelegramUserId: true },
  });
  if (!wu) {
    return "basic";
  }
  if (wu.billingAccountId) {
    const acc = await prisma.billingAccount.findUnique({ where: { id: wu.billingAccountId } });
    if (acc?.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
      const t = acc.planTier.trim().toLowerCase();
      if (t === "pro") return "pro";
      if (t === "premium") return "premium";
      return "basic";
    }
  }
  const now = new Date();
  const sub = await prisma.managedSubscription.findFirst({
    where: {
      webUserId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: { planSlug: true },
  });
  if (sub) {
    return tierFromPlanSlug(sub.planSlug);
  }
  if (wu.linkedTelegramUserId) {
    return resolveTierForMiniappUser(wu.linkedTelegramUserId);
  }
  return "basic";
}

async function resolveTierForMiniappUser(userId: string): Promise<SchemaPlanTier> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true },
  });
  if (!u) {
    return "basic";
  }
  const acc = await prisma.billingAccount.findFirst({
    where: { notifyTelegramId: u.telegramId },
  });
  if (acc?.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
    const t = acc.planTier.trim().toLowerCase();
    if (t === "pro") return "pro";
    if (t === "premium") return "premium";
    return "basic";
  }
  const now = new Date();
  const sub = await prisma.managedSubscription.findFirst({
    where: {
      telegramUserId: userId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: { planSlug: true },
  });
  if (sub) {
    return tierFromPlanSlug(sub.planSlug);
  }
  return "basic";
}

/**
 * Admin uchun sayt sxemasi rejasi (standart: Pro — 5 sahifa).
 * Payme / Mini App / managed obuna bo‘lsa, mos rejani qaytaradi.
 */
export async function resolveSchemaPlanTierForRequest(): Promise<SchemaPlanTier> {
  const jar = cookies();
  const adminRaw = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (adminRaw && verifyAdminSessionToken(adminRaw)) {
    return envAdminPlan();
  }

  const miniRaw = jar.get(MINIAPP_SESSION_COOKIE)?.value;
  if (miniRaw) {
    const mini = parseMiniappSessionToken(miniRaw);
    if (mini) {
      const u = await prisma.user.findUnique({
        where: { id: mini.userId },
        select: { telegramId: true, miniappSessionVersion: true },
      });
      if (u && u.telegramId === mini.telegramId && u.miniappSessionVersion === mini.sessionVersion) {
        return resolveTierForMiniappUser(mini.userId);
      }
    }
  }

  const p = parseBuilderCookiePayload();
  if (!p || !(await isBuilderSessionAllowedForAi())) {
    return "basic";
  }
  if (p.webUserId) {
    return resolveTierForWebUser(p.webUserId);
  }
  if (p.billingId) {
    const acc = await prisma.billingAccount.findUnique({ where: { id: p.billingId } });
    if (acc?.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
      const t = acc.planTier.trim().toLowerCase();
      if (t === "pro") return "pro";
      if (t === "premium") return "premium";
      return "basic";
    }
  }
  return p.tier;
}

function parseBuilderCookiePayload() {
  const builderRaw = cookies().get(BUILDER_SESSION_COOKIE)?.value;
  return builderRaw ? parseBuilderSessionToken(builderRaw) : null;
}

function hasAdminSessionSync(): boolean {
  const adminRaw = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(adminRaw && verifyAdminSessionToken(adminRaw));
}

async function isBuilderSessionAllowedForAi(): Promise<boolean> {
  const p = parseBuilderCookiePayload();
  if (!p) {
    return false;
  }
  if (!p.webUserId) {
    return true;
  }
  const wu = await prisma.webUser.findUnique({
    where: { id: p.webUserId },
    select: { sessionVersion: true, isActive: true },
  });
  return Boolean(wu?.isActive && wu.sessionVersion === p.webSessionVersion);
}

async function hasValidMiniappSession(): Promise<boolean> {
  const raw = cookies().get(MINIAPP_SESSION_COOKIE)?.value;
  if (!raw) {
    return false;
  }
  const mini = parseMiniappSessionToken(raw);
  if (!mini) {
    return false;
  }
  const u = await prisma.user.findUnique({
    where: { id: mini.userId },
    select: { telegramId: true, miniappSessionVersion: true },
  });
  return Boolean(u && u.telegramId === mini.telegramId && u.miniappSessionVersion === mini.sessionVersion);
}

async function hasElevatedWebsiteAiSession(): Promise<boolean> {
  if (hasAdminSessionSync()) {
    return true;
  }
  const p = parseBuilderCookiePayload();
  if (p && (await isBuilderSessionAllowedForAi())) {
    return true;
  }
  return hasValidMiniappSession();
}

export function isWebsiteAiLoginRequired(): boolean {
  return process.env.REQUIRE_BUILDER_AI_LOGIN === "true";
}

export async function assertWebsiteAiCaller(): Promise<NextResponse | null> {
  if (process.env.ALLOW_AI_WITHOUT_LOGIN === "true") {
    return null;
  }
  if (!isWebsiteAiLoginRequired()) {
    return null;
  }
  if (await hasElevatedWebsiteAiSession()) {
    return null;
  }
  const copy = getApiGenerateMessages(routing.defaultLocale);
  return NextResponse.json({ error: copy.unauthorized, code: "BUILDER_AUTH_REQUIRED" }, { status: 401 });
}

export async function assertWebsiteAiGuestRateLimit(request: Request, locale: AppLocale): Promise<NextResponse | null> {
  if (process.env.ALLOW_AI_WITHOUT_LOGIN === "true") {
    return null;
  }
  if (await hasElevatedWebsiteAiSession()) {
    return null;
  }
  const windowMs = 60_000;
  const raw = process.env.WEBSITE_AI_RATE_LIMIT_PER_MINUTE?.trim();
  const maxInWindow = raw ? Math.max(1, Math.min(500, Number.parseInt(raw, 10) || 40)) : 40;
  const ip = getClientIpFromRequest(request);
  const hit = checkSlidingWindowRateLimit({
    key: `website-ai:${ip}`,
    windowMs,
    maxInWindow,
  });
  if (hit.ok) {
    return null;
  }
  const copy = getApiGenerateMessages(locale);
  const retryAfterSec = Math.max(1, Math.ceil(hit.retryAfterMs / 1000));
  return NextResponse.json(
    {
      success: false as const,
      error: copy.rateLimited,
      code: "RATE_LIMITED",
      retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export async function assertWebsiteAiRequest(request: Request, locale: AppLocale): Promise<NextResponse | null> {
  const auth = await assertWebsiteAiCaller();
  if (auth) {
    return auth;
  }
  return assertWebsiteAiGuestRateLimit(request, locale);
}
