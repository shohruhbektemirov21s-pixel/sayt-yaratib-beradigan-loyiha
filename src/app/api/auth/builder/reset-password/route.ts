import { NextResponse } from "next/server";

import { builderResetPasswordBodySchema } from "@/lib/auth/builder-login.validation";
import { hashOpaqueToken } from "@/lib/auth/telegram-web-link.service";
import { hashPasswordScrypt } from "@/lib/auth/password-scrypt";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `builder-reset:${ip}`,
    windowMs: 60_000,
    maxInWindow: 15,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = builderResetPasswordBodySchema.safeParse(json);
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((i) => i.message === "password_mismatch");
    return NextResponse.json(
      { ok: false, error: mismatch ? "password_mismatch" : "validation_failed" },
      { status: 400 },
    );
  }

  const tokenHash = hashOpaqueToken(parsed.data.token);
  const now = new Date();
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, webUserId: true, expiresAt: true, consumedAt: true },
  });
  if (!row || row.consumedAt || row.expiresAt <= now) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 });
  }

  const hash = hashPasswordScrypt(parsed.data.password);
  await prisma.$transaction([
    prisma.webUser.update({
      where: { id: row.webUserId },
      data: { passwordHash: hash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  await writeAdminAuditLog({
    action: "PASSWORD_RESET_COMPLETED",
    actor: `ip:${ip.slice(0, 64)}`,
    targetWebUserId: row.webUserId,
    payload: {},
  });

  return NextResponse.json({ ok: true as const });
}
