import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { prisma } from "@/lib/prisma";

const LINK_PREFIX = "link_";

export function hashOpaqueToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function createAccountLinkRawToken(): string {
  return randomBytes(24).toString("base64url");
}

export function buildTelegramStartLinkPayload(rawToken: string): string {
  return `${LINK_PREFIX}${rawToken}`;
}

export function parseTelegramStartLinkPayload(param: string | undefined): string | null {
  if (!param?.startsWith(LINK_PREFIX)) {
    return null;
  }
  const raw = param.slice(LINK_PREFIX.length).trim();
  return raw.length > 0 ? raw : null;
}

export async function createAccountLinkChallenge(webUserId: string, ttlMs: number): Promise<{ rawToken: string; expiresAt: Date }> {
  await prisma.accountLinkChallenge.deleteMany({
    where: { webUserId, consumedAt: null },
  });
  const rawToken = createAccountLinkRawToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.accountLinkChallenge.create({
    data: {
      tokenHash,
      webUserId,
      expiresAt,
    },
  });
  await writeAdminAuditLog({
    action: "ACCOUNT_LINK_CHALLENGE_CREATED",
    actor: `web_user:${webUserId}`,
    targetWebUserId: webUserId,
    payload: { expiresAt: expiresAt.toISOString() },
  });
  return { rawToken, expiresAt };
}

export type LinkTelegramToWebResult =
  | { ok: true; alreadyLinked?: boolean }
  | { ok: false; code: "invalid_or_expired" | "web_already_linked" | "telegram_already_linked" | "inactive_web" };

/**
 * Bot yoki Mini App: Telegram foydalanuvchini veb akkauntga bog‘laydi.
 */
export async function linkTelegramUserToWebUser(params: {
  telegramUserDbId: string;
  telegramNumericId: string;
  webUserId: string;
}): Promise<LinkTelegramToWebResult> {
  const { telegramUserDbId, telegramNumericId, webUserId } = params;

  const [web, tg] = await Promise.all([
    prisma.webUser.findUnique({
      where: { id: webUserId },
      select: {
        id: true,
        isActive: true,
        linkedTelegramUserId: true,
        billingAccountId: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: telegramUserDbId },
      select: { id: true, telegramId: true },
    }),
  ]);

  if (!web?.isActive) {
    return { ok: false, code: "inactive_web" };
  }

  if (web.linkedTelegramUserId && web.linkedTelegramUserId !== telegramUserDbId) {
    return { ok: false, code: "web_already_linked" };
  }

  if (!tg || tg.telegramId !== telegramNumericId) {
    return { ok: false, code: "telegram_already_linked" };
  }

  const otherWeb = await prisma.webUser.findFirst({
    where: { linkedTelegramUserId: telegramUserDbId, NOT: { id: webUserId } },
    select: { id: true },
  });
  if (otherWeb) {
    return { ok: false, code: "telegram_already_linked" };
  }

  if (web.linkedTelegramUserId === telegramUserDbId) {
    return { ok: true, alreadyLinked: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.webUser.update({
      where: { id: webUserId },
      data: {
        linkedTelegramUserId: telegramUserDbId,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.user.update({
      where: { id: telegramUserDbId },
      data: {
        telegramLinkedAt: new Date(),
        authSource: "BOTH",
      },
    });
    if (web.billingAccountId) {
      await tx.billingAccount.update({
        where: { id: web.billingAccountId },
        data: { notifyTelegramId: telegramNumericId },
      });
    }
  });

  await writeAdminAuditLog({
    action: "TELEGRAM_WEB_ACCOUNT_LINKED",
    actor: `telegram:${telegramNumericId}`,
    targetWebUserId: webUserId,
    targetTelegramUserId: telegramUserDbId,
    payload: { webUserId, telegramUserDbId },
  });

  return { ok: true };
}

export async function consumeAccountLinkChallenge(rawToken: string, telegramUserDbId: string, telegramNumericId: string): Promise<LinkTelegramToWebResult> {
  const tokenHash = hashOpaqueToken(rawToken);
  const now = new Date();
  const row = await prisma.accountLinkChallenge.findUnique({
    where: { tokenHash },
    select: { id: true, webUserId: true, expiresAt: true, consumedAt: true },
  });
  if (!row || row.consumedAt || row.expiresAt <= now) {
    return { ok: false, code: "invalid_or_expired" };
  }

  const link = await linkTelegramUserToWebUser({
    telegramUserDbId,
    telegramNumericId,
    webUserId: row.webUserId,
  });
  if (!link.ok) {
    return link;
  }

  await prisma.accountLinkChallenge.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  return link;
}
