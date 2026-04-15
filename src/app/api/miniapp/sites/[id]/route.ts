import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { prisma } from "@/lib/prisma";
import { readMiniappSessionFromCookies } from "@/lib/telegram/miniapp-session";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

async function assertMiniappOwner(userId: string, telegramId: string, sessionVersion: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, miniappSessionVersion: true },
  });
  if (!user || user.telegramId == null) {
    return null;
  }
  if (user.telegramId.toString() !== telegramId || user.miniappSessionVersion !== sessionVersion) {
    return null;
  }
  return user;
}

export async function GET(_request: Request, context: RouteParams): Promise<NextResponse> {
  const mini = readMiniappSessionFromCookies();
  if (!mini) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const owner = await assertMiniappOwner(mini.userId, mini.telegramId, mini.sessionVersion);
  if (!owner) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const site = await prisma.site.findFirst({
    where: { id, userId: mini.userId },
    select: { id: true, title: true, schemaJson: true, updatedAt: true },
  });
  if (!site) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const parsed = websiteSchema.safeParse(site.schemaJson);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_schema" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    site: {
      id: site.id,
      title: site.title,
      schema: parsed.data,
      updatedAt: site.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, context: RouteParams): Promise<NextResponse> {
  const mini = readMiniappSessionFromCookies();
  if (!mini) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const owner = await assertMiniappOwner(mini.userId, mini.telegramId, mini.sessionVersion);
  if (!owner) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const schemaRaw = typeof body === "object" && body !== null && "schema" in body ? (body as { schema?: unknown }).schema : undefined;
  const parsed = websiteSchema.safeParse(schemaRaw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_schema" }, { status: 400 });
  }

  const existing = await prisma.site.findFirst({
    where: { id, userId: mini.userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const s = parsed.data;
  await prisma.site.update({
    where: { id },
    data: {
      title: s.siteName,
      summary: s.seo.description,
      schemaJson: s as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true, id, title: s.siteName });
}
