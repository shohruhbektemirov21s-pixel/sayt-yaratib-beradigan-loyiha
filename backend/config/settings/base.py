import os
from pathlib import Path
from datetime import timedelta
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
# Read environment variables from .env file
environ.Env.read_env(os.path.join(BASE_DIR.parent, ".env"))

SECRET_KEY = env("SECRET_KEY", default="django-insecure-default-key-change-me")

DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

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
    "apps.previews",
    "apps.exports",
    "apps.common",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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
        "DIRS": [],
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
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# i18n
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
MEDIA_URL = "media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

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
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Channels / Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("REDIS_URL", default="redis://localhost:6379/1")],
        },
    },
}

# CORS
CORS_ALLOW_ALL_ORIGINS = True # Change for production

# Gemini
GEMINI_MODEL = env("GOOGLE_GENERATIVE_AI_MODEL", default="gemini-flash-latest")
GEMINI_API_KEY = env("GOOGLE_GENERATIVE_AI_API_KEY", default="")
# SPECTACULAR SETTINGS
SPECTACULAR_SETTINGS = {
    'TITLE': 'AI Website Builder API',
    'DESCRIPTION': 'Production-ready AI Website Builder backend API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# UNFOLD PREMIUM ADMIN SETTINGS
UNFOLD = {
    "SITE_TITLE": "AI Builder Admin",
    "SITE_HEADER": "AI Website Builder Control Panel",
    "SITE_SYMBOL": "speed", # font awesome or similar symbols
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
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
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Main Navigation",
                "items": [
                    {
                        "title": "Dashboard",
                        "icon": "dashboard",
                        "link": "admin:index",
                    },
                    {
                        "title": "Users & Security",
                        "icon": "people",
                        "link": "admin:accounts_user_changelist",
                    },
                ],
            },
            {
                "title": "AI Generation",
                "items": [
                    {
                        "title": "Projects",
                        "icon": "auto_awesome",
                        "link": "admin:website_projects_websiteproject_changelist",
                    },
                ],
            },
            {
                "title": "Billing & Subs",
                "items": [
                    {
                        "title": "Plans",
                        "icon": "payments",
                        "link": "admin:subscriptions_subscriptionplan_changelist",
                    },
                    {
                        "title": "Payments",
                        "icon": "shopping_cart",
                        "link": "admin:payments_payment_changelist",
                    },
                ],
            },
        ],
    },
}

