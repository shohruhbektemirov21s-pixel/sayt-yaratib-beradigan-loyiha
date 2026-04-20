from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Local ishga tushirish oson bo‘lishi uchun default sqlite ishlatamiz.
# Agar Postgres bilan ishlamoqchi bo‘lsangiz: USE_SQLITE_DEV=0 qo‘ying.
USE_SQLITE_DEV = env.bool("USE_SQLITE_DEV", default=True)
if USE_SQLITE_DEV:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
