import { NextResponse } from "next/server";

import { builderRegisterBodySchema } from "@/lib/auth/builder-register.validation";
import { splitContactInput } from "@/lib/auth/normalize-contact";
import { hashPasswordScrypt } from "@/lib/auth/password-scrypt";
import { BUILDER_SESSION_COOKIE, createBuilderSessionToken } from "@/lib/builder/builder-session";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `builder-register:${ip}`,
    windowMs: 60_000,
    maxInWindow: 12,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false as const, error: "rate_limited" }, { status: 429 });
  }

  if (process.env.BUILDER_SELF_REGISTRATION_ENABLED === "false") {
    return NextResponse.json({ ok: false as const, error: "registration_disabled" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "invalid_json" }, { status: 400 });
  }

  const parsed = builderRegisterBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "validation_failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
        formErrors: parsed.error.flatten().formErrors,
      },
      { status: 422 },
    );
  }

  const { firstName, lastName, contact, password } = parsed.data;
  const split = splitContactInput(contact);
  if (!split) {
    return NextResponse.json(
      { ok: false as const, error: "validation_failed", fieldErrors: { contact: ["contact_invalid"] } },
      { status: 422 },
    );
  }

  const email = split.kind === "email" ? split.email : null;
  const phone = split.kind === "phone" ? split.phone : null;

  try {
    const { web, billingId } = await prisma.$transaction(async (tx) => {
      const billing = await tx.billingAccount.create({ data: {} });
      const webRow = await tx.webUser.create({
        data: {
          email,
          phone,
          passwordHash: hashPasswordScrypt(password),
          firstName,
          lastName,
          billingAccountId: billing.id,
        },
        select: { id: true, sessionVersion: true },
      });
      return { web: webRow, billingId: billing.id };
    });

    const token = createBuilderSessionToken({
      billingId,
      webUserId: web.id,
      webSessionVersion: web.sessionVersion,
    });
    const res = NextResponse.json({ ok: true as const, userId: web.id });
    res.cookies.set(BUILDER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    if (code === "P2002") {
      return NextResponse.json({ ok: false as const, error: "contact_taken" }, { status: 409 });
    }
    console.error("[builder/register]", e);
    return NextResponse.json({ ok: false as const, error: "server_error" }, { status: 500 });
  }
}
