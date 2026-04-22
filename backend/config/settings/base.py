import os
from pathlib import Path
from datetime import timedelta
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
# Read environment variables from .env file
environ.Env.read_env(os.path.join(BASE_DIR.parent, ".env"))

SECRET_KEY = env("SECRET_KEY")  # .env da DOIM o'rnatilishi shart — default yo'q

DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Application definition
INSTALLED_APPS = [
    "unfold",
    "daphne",
    "django.contrib.admin",

    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "channels",
    
    # Internal
    "apps.accounts",
    "apps.subscriptions",
    "apps.payments",
    "apps.ai_generation",
    "apps.website_projects",
    "apps.exports",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.security_middleware.SecurityHeadersMiddleware",
    "config.audit_middleware.AuditLogMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR}/db.sqlite3")
}

# Auth
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 4},
    },
]

# i18n — Admin panel va butun tizim o'zbek tilida
LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True
LANGUAGES = [
    ("uz", "O'zbek"),
    ("ru", "Русский"),
    ("en", "English"),
]
# Loyihaning o'z tarjimalari — Django va Unfold'ning uz tarjimalari ustidan yoziladi
LOCALE_PATHS = [os.path.join(BASE_DIR, "locale")]

# Static & Media
STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
# Qo'shimcha manbalar — admin uchun custom JS
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]
MEDIA_URL = "media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django ishga tushganda xavfsizlikni tekshiradi
SILENCED_SYSTEM_CHECKS: list[str] = []
CHECKS = [
    "config.startup_checks.run_security_checks",
]

# Audit logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "audit": {
            "format": "{asctime} AUDIT {message}",
            "style": "{",
        },
        "standard": {
            "format": "{levelname} {asctime} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
        "audit_console": {
            "class": "logging.StreamHandler",
            "formatter": "audit",
        },
    },
    "loggers": {
        "audit": {
            "handlers": ["audit_console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}

# So'rov hajmi cheklovi (10 MB max)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Xavfsizlik sarlavhalari
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
REFERRER_POLICY = "strict-origin-when-cross-origin"

# Channels / Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("REDIS_URL", default="redis://localhost:6379/1")],
        },
    },
}

# CORS: in DEBUG allow local Next.js; in prod require explicit origins via env.
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOW_CREDENTIALS = True

# Gemini
GEMINI_MODEL = env("GOOGLE_GENERATIVE_AI_MODEL", default="gemini-flash-latest")
GEMINI_API_KEY = env("GOOGLE_GENERATIVE_AI_API_KEY", default="")

# DeepSeek
DEEPSEEK_MODEL = env("DEEPSEEK_MODEL", default="deepseek-chat")
DEEPSEEK_API_KEY = env("DEEPSEEK_API_KEY", default="")

# Anthropic (Claude)
ANTHROPIC_MODEL = env("ANTHROPIC_MODEL", default="claude-3-5-sonnet-20241022")
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")

# SPECTACULAR SETTINGS
SPECTACULAR_SETTINGS = {
    'TITLE': 'NanoStUp API',
    'DESCRIPTION': 'Production-ready NanoStUp backend API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
# UNFOLD PREMIUM ADMIN SETTINGS
UNFOLD = {
    "SITE_TITLE": "NanoStUp Admin",
    "SITE_HEADER": "NanoStUp",
    "SITE_SYMBOL": "auto_awesome",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "DASHBOARD_CALLBACK": "config.dashboard.dashboard_callback",
    # Admin sahifalariga qo'shimcha JS — real-time auto-refresh
    "SCRIPTS": [
        lambda request: "/static/admin/js/realtime-refresh.js",
    ],
    "COLORS": {
        "primary": {
            "50": "250 245 255",
            "100": "243 234 255",
            "200": "233 214 255",
            "300": "216 181 254",
            "400": "192 132 252",
            "500": "168 85 247",
            "600": "147 51 234",
            "700": "126 34 206",
            "800": "107 33 168",
            "900": "88 28 135",
            "950": "54 11 92",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": "Boshqaruv",
                "items": [
                    {
                        "title": "Dashboard",
                        "icon": "dashboard",
                        "link": "/17210707admin/",
                    },
                ],
            },
            {
                "title": "Foydalanuvchilar",
                "items": [
                    {
                        "title": "Barcha userlar",
                        "icon": "people",
                        "link": "/17210707admin/accounts/user/",
                    },
                ],
            },
            {
                "title": "Obuna va Tariflar",
                "items": [
                    {
                        "title": "Tariflar (narxlar)",
                        "icon": "sell",
                        "link": "/17210707admin/subscriptions/tariff/",
                    },
                    {
                        "title": "Obunalar",
                        "icon": "card_membership",
                        "link": "/17210707admin/subscriptions/subscription/",
                    },
                    {
                        "title": "To'lovlar",
                        "icon": "payments",
                        "link": "/17210707admin/payments/paymenttransaction/",
                    },
                ],
            },
            {
                "title": "AI Loyihalar",
                "items": [
                    {
                        "title": "Yaratilgan saytlar",
                        "icon": "auto_awesome",
                        "link": "/17210707admin/website_projects/websiteproject/",
                    },
                    {
                        "title": "Versiyalar",
                        "icon": "history",
                        "link": "/17210707admin/website_projects/projectversion/",
                    },
                    {
                        "title": "Suhbatlar",
                        "icon": "forum",
                        "link": "/17210707admin/website_projects/conversation/",
                    },
                    {
                        "title": "Chat xabarlari",
                        "icon": "chat",
                        "link": "/17210707admin/website_projects/chatmessage/",
                    },
                ],
            },
        ],
    },
}


