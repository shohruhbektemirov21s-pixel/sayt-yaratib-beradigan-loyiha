from datetime import timedelta

from django.utils.translation import gettext_lazy as _


def _fmt_money(amount) -> str:
    """12345.67 → '12 345 so'm' ko'rinishida."""
    try:
        return f"{int(amount):,} so'm".replace(",", " ")
    except (ValueError, TypeError):
        return "0 so'm"


def dashboard_callback(request, context):
    """Unfold admin dashboard: daromad, faol userlar, loyihalar va suhbatlar."""
    try:
        from django.contrib.auth import get_user_model
        from django.db.models import Sum
        from django.utils import timezone

        from apps.payments.models import PaymentStatus, PaymentTransaction
        from apps.subscriptions.models import Subscription, SubscriptionStatus
        from apps.website_projects.models import (
            ChatMessage, Conversation, ProjectStatus, WebsiteProject,
        )

        User = get_user_model()
        now = timezone.now()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # ── Foydalanuvchilar ─────────────────────────────────────
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_week = User.objects.filter(date_joined__gte=last_7_days).count()
        new_users_today = User.objects.filter(date_joined__gte=today).count()
        # Oxirgi 7 kun ichida login qilgan userlar — "haqiqiy faol"
        recently_active = User.objects.filter(last_login__gte=last_7_days).count()

        # ── Daromad (faqat muvaffaqiyatli to'lovlar) ─────────────
        total_revenue = PaymentTransaction.objects.filter(
            status=PaymentStatus.SUCCESS,
        ).aggregate(s=Sum("amount"))["s"] or 0
        revenue_month = PaymentTransaction.objects.filter(
            status=PaymentStatus.SUCCESS, created_at__gte=last_30_days,
        ).aggregate(s=Sum("amount"))["s"] or 0
        revenue_today = PaymentTransaction.objects.filter(
            status=PaymentStatus.SUCCESS, created_at__gte=today,
        ).aggregate(s=Sum("amount"))["s"] or 0

        # ── Obunalar ─────────────────────────────────────────────
        active_subs = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            end_date__gt=now,
        ).count()
        total_subs = Subscription.objects.count()

        # ── AI loyihalar va suhbatlar ────────────────────────────
        total_projects = WebsiteProject.objects.count()
        completed_projects = WebsiteProject.objects.filter(
            status=ProjectStatus.COMPLETED,
        ).count()
        projects_week = WebsiteProject.objects.filter(
            created_at__gte=last_7_days,
        ).count()
        total_conversations = Conversation.objects.count()
        total_messages = ChatMessage.objects.count()

        context.update({
            "kpi": [
                # 1-qator: foydalanuvchilar
                {
                    "title": _("Jami foydalanuvchilar"),
                    "metric": f"{total_users:,}".replace(",", " "),
                    "footer": f"Faol: {active_users} · Oxirgi 7 kunda: +{new_users_week}",
                },
                {
                    "title": _("Bugun faol"),
                    "metric": f"{recently_active:,}".replace(",", " "),
                    "footer": f"Bugun ro'yxatdan o'tgan: +{new_users_today}",
                },
                # 2-qator: daromad
                {
                    "title": _("💰 Jami daromad"),
                    "metric": _fmt_money(total_revenue),
                    "footer": f"Bu oy: {_fmt_money(revenue_month)}",
                },
                {
                    "title": _("Bugungi daromad"),
                    "metric": _fmt_money(revenue_today),
                    "footer": f"Faol obunalar: {active_subs}",
                },
                # 3-qator: AI loyihalar
                {
                    "title": _("AI loyihalar"),
                    "metric": f"{completed_projects:,}".replace(",", " "),
                    "footer": f"Jami: {total_projects} · Oxirgi 7 kunda: +{projects_week}",
                },
                {
                    "title": _("Suhbatlar va xabarlar"),
                    "metric": f"{total_conversations:,}".replace(",", " "),
                    "footer": f"Jami xabarlar: {total_messages:,}".replace(",", " "),
                },
            ],
        })
    except Exception as exc:  # pragma: no cover
        import logging
        logging.getLogger(__name__).warning("Dashboard stats xato: %s", exc)

    return context
