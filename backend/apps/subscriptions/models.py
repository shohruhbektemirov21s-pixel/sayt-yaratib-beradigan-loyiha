from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class Tariff(models.Model):
    name = models.CharField("Tarif nomi", max_length=100)
    description = models.TextField("Tavsif", blank=True)
    price = models.DecimalField("Narxi ($)", max_digits=10, decimal_places=2)
    duration_days = models.IntegerField("Muddati (kun)", default=30)

    # Limits
    projects_limit = models.IntegerField("Loyihalar soni", default=1)
    pages_per_project_limit = models.IntegerField("Bir loyihada sahifalar", default=5)
    ai_generations_limit = models.IntegerField("AI generatsiya limiti", default=10)

    # Nano koin — admin panel orqali qo'lda kiritiladi.
    nano_coins_included = models.PositiveIntegerField(
        "Oyiga nano koin",
        default=0,
        help_text="1 oyga beriladigan umumiy nano koin miqdori (haftada 1/4 qismi beriladi)",
    )

    is_active = models.BooleanField("Faol", default=True)
    created_at = models.DateTimeField("Yaratilgan sana", auto_now_add=True)

    class Meta:
        verbose_name = "Tarif (narxlar)"
        verbose_name_plural = "Tariflar (narxlar)"

    @property
    def weekly_allowance(self) -> int:
        """Har hafta foydalanuvchiga beriladigan nano koin (1/4 dan)."""
        return self.nano_coins_included // 4 if self.nano_coins_included else 0

    def __str__(self):
        return self.name

class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', "Faol"
    EXPIRED = 'EXPIRED', "Muddati o'tgan"
    CANCELED = 'CANCELED', "Bekor qilingan"


class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    tariff = models.ForeignKey(
        Tariff, verbose_name="Tarif", on_delete=models.PROTECT,
    )
    status = models.CharField(
        "Holat",
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    start_date = models.DateTimeField("Boshlanish sanasi", default=timezone.now)
    end_date = models.DateTimeField("Tugash sanasi")

    # Tracking usage
    projects_created = models.IntegerField("Yaratilgan loyihalar", default=0)
    generations_used = models.IntegerField("Ishlatilgan AI", default=0)

    created_at = models.DateTimeField("Yaratilgan", auto_now_add=True)
    updated_at = models.DateTimeField("Yangilangan", auto_now=True)

    class Meta:
        verbose_name = "Obuna"
        verbose_name_plural = "Obunalar"

    def is_valid(self):
        return self.status == SubscriptionStatus.ACTIVE and self.end_date > timezone.now()

    def __str__(self):
        return f"{self.user.email} - {self.tariff.name}"
