import { NextResponse } from "next/server";

import { builderForgotBodySchema } from "@/lib/auth/builder-login.validation";
import { hashOpaqueToken, createAccountLinkRawToken } from "@/lib/auth/telegram-web-link.service";
import { splitContactInput } from "@/lib/auth/normalize-contact";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `builder-forgot:${ip}`,
    windowMs: 60_000,
    maxInWindow: 8,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const parsed = builderForgotBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const split = splitContactInput(parsed.data.contact);
  if (!split) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const web = await prisma.webUser.findFirst({
    where: split.kind === "email" ? { email: split.email } : { phone: split.phone },
    select: { id: true, isActive: true },
  });
  if (!web?.isActive) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const raw = createAccountLinkRawToken();
  const tokenHash = hashOpaqueToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await prisma.passwordResetToken.create({
    data: { tokenHash, webUserId: web.id, expiresAt },
  });
  await writeAdminAuditLog({
    action: "PASSWORD_RESET_REQUESTED",
    actor: `ip:${ip.slice(0, 64)}`,
    targetWebUserId: web.id,
    payload: { expiresAt: expiresAt.toISOString() },
  });

  const devLeak = process.env.NODE_ENV !== "production" && process.env.PASSWORD_RESET_DEV_LEAK === "true";
  return NextResponse.json({
    ok: true,
    ...(devLeak
      ? {
          devResetToken: raw,
          devResetPath: `/uz/builder-reset-password?token=${encodeURIComponent(raw)}`,
        }
      : {}),
  });
}
