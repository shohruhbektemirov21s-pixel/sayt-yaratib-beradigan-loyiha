from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("The Email must be set"))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(email, password, **extra_fields)

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Admin')
    USER = 'USER', _('User')

# ═════════════════════════════════════════════════════════════
# Token / Nano Coin iqtisodiy tizimi
# ─────────────────────────────────────────────────────────────
# Har bir user ro'yxatdan o'tganda 10 000 token oladi.
# Har bir sayt yaratilishi 3 000 token hisobidan yechiladi.
# Foydalanuvchiga qulay valuta — "nano koin": 1000 token = 100 nano koin
# (ya'ni 10 token = 1 nano koin)
# ═════════════════════════════════════════════════════════════

DEFAULT_USER_TOKENS = 10_000
# 1 chat xabar (sayt yaratish yoki tahrirlash) — 500 nano koin.
# 10 token = 1 nano koin → 500 nano = 5 000 token
SITE_CREATION_COST = 5_000
TOKENS_PER_NANO_COIN = 10  # 1000 tokens = 100 nano coins
CHAT_COST_NANO = 500  # 1 chat = 500 nano (frontend uchun ham)


def tokens_to_nano_coins(tokens: int) -> int:
    return tokens // TOKENS_PER_NANO_COIN


class User(AbstractUser):
    username = None
    email = models.EmailField(_("email address"), unique=True)
    full_name = models.CharField(_("full name"), max_length=255, blank=True)
    role = models.CharField(
        max_length=20, 
        choices=UserRole.choices, 
        default=UserRole.USER
    )
    # Token balans — har bir AI generatsiya uchun yechiladi
    tokens_balance = models.PositiveIntegerField(
        _("tokens balance"),
        default=DEFAULT_USER_TOKENS,
        help_text=_("Foydalanuvchining joriy token balansi"),
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    @property
    def nano_coins(self) -> int:
        """Token balansining nano koindagi ekvivalenti."""
        return tokens_to_nano_coins(self.tokens_balance)

    def can_afford(self, cost: int = SITE_CREATION_COST) -> bool:
        return self.tokens_balance >= cost

    def deduct_tokens(self, amount: int) -> None:
        """Atomik yechish — DB level da amount dan kam bo'lsa yechmaydi."""
        from django.db.models import F
        updated = User.objects.filter(
            pk=self.pk, tokens_balance__gte=amount,
        ).update(tokens_balance=F("tokens_balance") - amount)
        if updated:
            self.refresh_from_db(fields=["tokens_balance"])
        else:
            raise ValueError("Token balans yetarli emas")

    def __str__(self):
        return self.email
