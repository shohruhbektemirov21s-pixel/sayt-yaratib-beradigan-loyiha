import { NextResponse } from "next/server";

import { getBotTokenForMiniApp, validateTelegramWebAppInitData } from "@/features/telegram-bot/auth/validate-init-data";
import { getSiteOwnedByTelegramUser } from "@/features/telegram-bot/services/site.service";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { miniappSiteIdSchema } from "@/lib/miniapp-preview-params.zod";
import { getResolvedPages } from "@/lib/ai/website-schema-pages";
import { buildPreviewSrcDoc } from "@/shared/lib/build-preview-srcdoc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractInitData(request: Request): string | null {
  const header = request.headers.get("authorization")?.trim();
  if (!header) {
    return null;
  }
  const match = /^tma\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rawSiteId = url.searchParams.get("siteId") ?? url.searchParams.get("site");
    if (!rawSiteId?.trim()) {
      return NextResponse.json({ error: "site yoki siteId parametri kerak." }, { status: 400 });
    }

    const idParsed = miniappSiteIdSchema.safeParse(rawSiteId);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Sayt identifikatori noto‘g‘ri." }, { status: 400 });
    }
    const siteId = idParsed.data;

    const initData = extractInitData(request);
    if (!initData) {
      return NextResponse.json(
        { error: "Authorization sarlavhasi: tma <initData> bo‘lishi kerak." },
        { status: 401 },
      );
    }

    let botToken: string;
    try {
      botToken = getBotTokenForMiniApp();
    } catch {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN sozlanmagan." }, { status: 503 });
    }

    const validated = validateTelegramWebAppInitData(initData, botToken);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.reason }, { status: 401 });
    }

    let site;
    try {
      site = await getSiteOwnedByTelegramUser(siteId, validated.data.user.id);
    } catch (error) {
      console.error("[miniapp/preview] database", error);
      return NextResponse.json({ error: "Ma’lumotlar bazasiga ulanishda muammo." }, { status: 503 });
    }

    if (!site) {
      return NextResponse.json({ error: "Sayt topilmadi yoki sizga tegishli emas." }, { status: 404 });
    }

    const parsed = websiteSchema.safeParse(site.schemaJson);
    if (!parsed.success) {
      return NextResponse.json({ error: "Sxema buzilgan." }, { status: 500 });
    }

    const schema = parsed.data;
    const resolvedPages = getResolvedPages(schema);
    const pageParam = url.searchParams.get("page")?.trim();
    const initialPageSlug =
      pageParam && resolvedPages.some((p) => p.slug === pageParam) ? pageParam : undefined;

    return NextResponse.json({
      siteName: site.title,
      previewSrcDoc: buildPreviewSrcDoc(schema, { initialPageSlug: initialPageSlug }),
      pages: resolvedPages.map((p) => ({ slug: p.slug, title: p.title })),
      activePage: initialPageSlug ?? resolvedPages[0]?.slug ?? null,
    });
  } catch (error) {
    console.error("[miniapp/preview]", error);
    return NextResponse.json({ error: "Server xatosi." }, { status: 500 });
  }
}
