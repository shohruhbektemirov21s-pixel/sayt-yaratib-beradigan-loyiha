import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";

import type { BotContext } from "../context";
import { sendStartWelcome } from "../handlers/send-start-welcome";
import { buildSiteActionsKeyboard } from "../lib/site-inline-keyboards";
import { telegramMiniAppUrl } from "@/lib/telegram/miniapp-url";
import { consumeAccountLinkChallenge, parseTelegramStartLinkPayload } from "@/lib/auth/telegram-web-link.service";

import { listSitesForUser } from "../services/site.service";
import { findUserByTelegramId, upsertUserFromTelegramContext } from "../services/user.service";

const HELP_UZ = [
  "<b>Yordam</b> 📖",
  "",
  "<b>/start</b> — bosh menyu",
  "<b>/builder</b> — Mini App: sayt yaratish",
  "<b>/projects</b> — loyihalar",
  "<b>/subscription</b> — tariflar va obuna",
  "<b>/account</b> — akkaunt",
  "<b>/create</b> — bot ichida matn/ovoz bilan yangi sayt",
  "<b>/my_sites</b> — saqlangan saytlar (bot)",
  "<b>/support</b> — aloqa",
].join("\n");

/**
 * Asosiy buyruqlar va Mini App havolalari.
 */
export function registerCommandPlugin(bot: Bot<BotContext>): void {
  bot.command("start", async (ctx) => {
    const userRow = await upsertUserFromTelegramContext(ctx);
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.trim().split(/\s+/);
    const startPayload = parts[1];
    const rawLink = parseTelegramStartLinkPayload(startPayload);
    if (rawLink) {
      const res = await consumeAccountLinkChallenge(rawLink, userRow.id, userRow.telegramId);
      if (res.ok) {
        await ctx.reply(
          res.alreadyLinked
            ? "✅ Bu Telegram akkaunti allaqachon veb kabinetingiz bilan bog‘langan."
            : "✅ Veb akkauntingiz Telegram bilan muvaffaqiyatli bog‘landi. Endi Mini App va saytdan bir xil obuna/limitlardan foydalanasiz.",
        );
      } else {
        await ctx.reply(
          "❌ Bog‘lash havolasi eskirgan, noto‘g‘ri yoki boshqa akkaunt allaqachon bog‘langan. Veb-saytdan yangi havola oling.",
        );
      }
    }
    await sendStartWelcome(ctx);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_UZ, { parse_mode: "HTML" });
  });

  bot.command("support", async (ctx) => {
    await ctx.reply(
      [
        "<b>Qo‘llab-quvvatlash</b>",
        "",
        "Savollar uchun: dasturchi bilan bog‘laning (saytdagi kontaktlar).",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  bot.command("create", async (ctx) => {
    await upsertUserFromTelegramContext(ctx);
    await ctx.conversation.enter("createSite");
  });

  bot.command("my_sites", async (ctx) => {
    const from = ctx.from;
    if (!from) {
      await ctx.reply("Telegram profil ma’lumoti topilmadi.");
      return;
    }

    const user = await findUserByTelegramId(from.id);
    if (!user) {
      await ctx.reply("Avval /start yuboring — akkaunt saqlanadi.");
      return;
    }

    const sites = await listSitesForUser(user.id);
    if (sites.length === 0) {
      await ctx.reply("Hozircha saqlangan saytlar yo‘q. /create yoki Mini App → Sayt yaratish.");
      return;
    }

    await ctx.reply("Sizning saytlaringiz (har bir qator — alohida tugmalar):");
    const slice = sites.slice(0, 8);
    for (const site of slice) {
      await ctx.reply(`${site.title}\nSlug: ${site.slug}\nID: ${site.id}`, {
        reply_markup: buildSiteActionsKeyboard(site.id),
      });
    }
    if (sites.length > slice.length) {
      await ctx.reply(`Yana ${sites.length - slice.length} ta sayt bor — ro‘yxatni qisqartirdik.`);
    }
  });

  const openMini = async (ctx: BotContext, path: string, caption: string): Promise<void> => {
    await upsertUserFromTelegramContext(ctx);
    const url = telegramMiniAppUrl(path);
    if (!url) {
      await ctx.reply("Mini App hozircha yoqilmagan: serverda HTTPS (NEXT_PUBLIC_APP_URL yoki TELEGRAM_WEBAPP_URL) sozlang.");
      return;
    }
    const kb = new InlineKeyboard().webApp("📱 Ochish", url);
    await ctx.reply(caption, { reply_markup: kb });
  };

  bot.command("builder", async (ctx) => {
    await openMini(ctx, "/builder", "<b>Sayt yaratish</b>\n\nMini Appni oching 👇");
  });

  bot.command("projects", async (ctx) => {
    await openMini(ctx, "/projects", "<b>Loyihalarim</b>\n\nMini Appni oching 👇");
  });

  bot.command("subscription", async (ctx) => {
    await openMini(ctx, "/pricing", "<b>Tariflar va obuna</b>\n\nMini Appni oching 👇");
  });

  bot.command("account", async (ctx) => {
    await openMini(ctx, "/account", "<b>Akkauntim</b>\n\nMini Appni oching 👇");
  });
}
