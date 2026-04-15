import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import type { SchemaPlanTier } from "@/lib/ai/prompts-schema-spec";

export const BUILDER_SESSION_COOKIE = "builder_session";

function builderSecret(): string {
  return (
    process.env.BUILDER_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-builder-secret-change-in-production"
  );
}

function parseTier(raw: string | undefined): SchemaPlanTier {
  const v = raw?.trim().toLowerCase();
  if (v === "pro") return "pro";
  if (v === "premium") return "premium";
  return "basic";
}

export type BuilderSessionPayload = {
  tier: SchemaPlanTier;
  subscriptionUntilMs: number | null;
  /** Payme / billing uchun barqaror id (`account.user_id`). */
  billingId: string | null;
  /** Veb akkaunt bilan kirish (sessiya versiyasi DBda tekshiriladi). */
  webUserId: string | null;
  webSessionVersion: number | null;
};

export function createBuilderSessionToken(input?: {
  tier?: SchemaPlanTier;
  subscriptionUntilMs?: number | null;
  billingId?: string | null;
  webUserId?: string | null;
  webSessionVersion?: number | null;
}): string {
  const tier = input?.tier ?? parseTier(process.env.BUILDER_PLAN_TIER);
  let subUntil: number | null = input?.subscriptionUntilMs ?? null;
  if (subUntil === null && process.env.BUILDER_SUBSCRIPTION_UNTIL?.trim()) {
    const ms = Date.parse(process.env.BUILDER_SUBSCRIPTION_UNTIL.trim());
    subUntil = Number.isFinite(ms) ? ms : null;
  }
  const bid = typeof input?.billingId === "string" && input.billingId.length > 0 ? input.billingId : null;
  const wid = typeof input?.webUserId === "string" && input.webUserId.length > 0 ? input.webUserId : null;
  const wsv =
    typeof input?.webSessionVersion === "number" && Number.isFinite(input.webSessionVersion)
      ? Math.floor(input.webSessionVersion)
      : null;
  const exp = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ v: 2, exp, tier, subUntil, bid, wid, wsv }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", builderSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseBuilderSessionToken(token: string): BuilderSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [payload, sig] = parts;
  const expected = createHmac("sha256", builderSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      exp?: number;
      tier?: string;
      subUntil?: number | null;
      bid?: string | null;
      wid?: string | null;
      wsv?: number | null;
    };
    if (typeof body.exp !== "number" || body.exp < Date.now()) {
      return null;
    }
    const tier = parseTier(body.tier);
    const subscriptionUntilMs =
      typeof body.subUntil === "number" && Number.isFinite(body.subUntil) ? body.subUntil : null;
    const billingId = typeof body.bid === "string" && body.bid.length > 0 ? body.bid : null;
    const webUserId = typeof body.wid === "string" && body.wid.length > 0 ? body.wid : null;
    const webSessionVersion =
      typeof body.wsv === "number" && Number.isFinite(body.wsv) ? Math.floor(body.wsv) : null;
    return { tier, subscriptionUntilMs, billingId, webUserId, webSessionVersion };
  } catch {
    return null;
  }
}

export function isBuilderSession(): boolean {
  const raw = cookies().get(BUILDER_SESSION_COOKIE)?.value;
  if (!raw) {
    return false;
  }
  return parseBuilderSessionToken(raw) !== null;
}

export function getBuilderSessionPayload(): BuilderSessionPayload | null {
  const raw = cookies().get(BUILDER_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return parseBuilderSessionToken(raw);
}
