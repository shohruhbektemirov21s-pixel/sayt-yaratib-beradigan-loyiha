import { NextResponse } from "next/server";

import { builderWebLoginBodySchema } from "@/lib/auth/builder-login.validation";
import { splitContactInput } from "@/lib/auth/normalize-contact";
import { verifyPasswordScrypt } from "@/lib/auth/password-scrypt";
import { BUILDER_SESSION_COOKIE, createBuilderSessionToken } from "@/lib/builder/builder-session";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `builder-login:${ip}`,
    windowMs: 60_000,
    maxInWindow: 40,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const asObj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const contact = typeof asObj.contact === "string" ? asObj.contact : "";
  const password = typeof asObj.password === "string" ? asObj.password : "";

  if (contact.trim().length > 0) {
    const parsed = builderWebLoginBodySchema.safeParse({ contact, password });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "validation_failed" }, { status: 400 });
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
        sessionVersion: true,
        isActive: true,
        billingAccountId: true,
      },
    });
    if (!web?.isActive || !verifyPasswordScrypt(parsed.data.password, web.passwordHash)) {
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }
    await prisma.webUser.update({
      where: { id: web.id },
      data: { lastLoginAt: new Date() },
    });
    const token = createBuilderSessionToken({
      billingId: web.billingAccountId,
      webUserId: web.id,
      webSessionVersion: web.sessionVersion,
    });
    const res = NextResponse.json({ ok: true as const, mode: "web_user" as const });
    res.cookies.set(BUILDER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  const expected = process.env.BUILDER_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "builder_not_configured" }, { status: 503 });
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const token = createBuilderSessionToken();
  const res = NextResponse.json({ ok: true as const, mode: "shared_password" as const });
  res.cookies.set(BUILDER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
