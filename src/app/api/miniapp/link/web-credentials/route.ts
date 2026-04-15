import { NextResponse } from "next/server";
import { z } from "zod";

import { splitContactInput } from "@/lib/auth/normalize-contact";
import { verifyPasswordScrypt } from "@/lib/auth/password-scrypt";
import { linkTelegramUserToWebUser } from "@/lib/auth/telegram-web-link.service";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { readMiniappSessionFromCookies } from "@/lib/telegram/miniapp-session";

export const runtime = "nodejs";

const bodySchema = z.object({
  contact: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `miniapp-link-web:${ip}`,
    windowMs: 60_000,
    maxInWindow: 15,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const mini = readMiniappSessionFromCookies();
  if (!mini) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: mini.userId },
    select: { id: true, telegramId: true, miniappSessionVersion: true },
  });
  if (!user || user.telegramId !== mini.telegramId || user.miniappSessionVersion !== mini.sessionVersion) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const split = splitContactInput(parsed.data.contact);
  if (!split) {
    return NextResponse.json({ ok: false, error: "invalid_contact" }, { status: 400 });
  }

  const web = await prisma.webUser.findFirst({
    where: split.kind === "email" ? { email: split.email } : { phone: split.phone },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      linkedTelegramUserId: true,
    },
  });
  if (!web?.isActive || !verifyPasswordScrypt(parsed.data.password, web.passwordHash)) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const result = await linkTelegramUserToWebUser({
    telegramUserDbId: user.id,
    telegramNumericId: user.telegramId,
    webUserId: web.id,
  });
  if (!result.ok) {
    const status = result.code === "web_already_linked" || result.code === "telegram_already_linked" ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true as const, alreadyLinked: Boolean(result.alreadyLinked) });
}
