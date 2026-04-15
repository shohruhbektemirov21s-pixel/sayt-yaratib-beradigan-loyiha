import { NextResponse } from "next/server";

import { createAccountLinkChallenge } from "@/lib/auth/telegram-web-link.service";
import { getValidatedWebUserFromBuilderCookie } from "@/lib/auth/web-user-builder-session";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";

export const runtime = "nodejs";

const LINK_TTL_MS = 15 * 60 * 1000;

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `link-tg-start:${ip}`,
    windowMs: 60_000,
    maxInWindow: 20,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const web = await getValidatedWebUserFromBuilderCookie();
  if (!web) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (web.linkedTelegramUserId) {
    return NextResponse.json({ ok: false, error: "already_linked" }, { status: 409 });
  }

  const bot = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!bot) {
    return NextResponse.json({ ok: false, error: "bot_username_missing" }, { status: 503 });
  }

  const { rawToken, expiresAt } = await createAccountLinkChallenge(web.id, LINK_TTL_MS);
  const payload = `link_${rawToken}`;
  const deepLink = `https://t.me/${encodeURIComponent(bot)}?start=${encodeURIComponent(payload)}`;

  let returnMiniPath: string | null = null;
  try {
    const url = new URL(request.url);
    const wantMini = url.searchParams.get("returnMini") === "1";
    const base = process.env.TELEGRAM_WEBAPP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (wantMini && base) {
      const origin = base.replace(/\/$/, "");
      returnMiniPath = `${origin.includes("/miniapp") ? origin : `${origin}/miniapp`}/account?linked=1`;
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true as const,
    deepLink,
    expiresAt: expiresAt.toISOString(),
    ...(returnMiniPath ? { returnMiniPath } : {}),
  });
}
