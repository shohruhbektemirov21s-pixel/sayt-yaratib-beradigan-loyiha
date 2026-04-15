import "server-only";

import { cookies } from "next/headers";

import { BUILDER_SESSION_COOKIE, parseBuilderSessionToken } from "@/lib/builder/builder-session";
import { prisma } from "@/lib/prisma";

export type ValidatedWebUserSession = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  sessionVersion: number;
  billingAccountId: string | null;
  linkedTelegramUserId: string | null;
};

/**
 * HTTP-only builder cookie ichidagi `webUserId` + `sessionVersion` ni DB bilan tekshiradi.
 */
export async function getValidatedWebUserFromBuilderCookie(): Promise<ValidatedWebUserSession | null> {
  const raw = cookies().get(BUILDER_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const parsed = parseBuilderSessionToken(raw);
  if (!parsed?.webUserId || parsed.webSessionVersion == null) {
    return null;
  }
  const row = await prisma.webUser.findUnique({
    where: { id: parsed.webUserId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      sessionVersion: true,
      isActive: true,
      billingAccountId: true,
      linkedTelegramUserId: true,
    },
  });
  if (!row?.isActive || row.sessionVersion !== parsed.webSessionVersion) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    firstName: row.firstName,
    lastName: row.lastName,
    sessionVersion: row.sessionVersion,
    billingAccountId: row.billingAccountId,
    linkedTelegramUserId: row.linkedTelegramUserId,
  };
}
