#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  AI Website Builder — Backend ishga tushirish
#  Ishlatish: bash start-backend.sh
# ─────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"

cd "$BACKEND"

echo "==> Backend: $BACKEND"

# venv mavjud bo'lmasa yaratamiz
if [ ! -f "venv/bin/python" ]; then
  echo "==> Yangi venv yaratilmoqda..."
  python3 -m venv venv
fi

echo "==> Paketlar o'rnatilmoqda..."
./venv/bin/pip install -q -r requirements/base.txt

echo "==> Migratsiyalar..."
DJANGO_SETTINGS_MODULE=config.settings.development ./venv/bin/python manage.py migrate --run-syncdb

echo "==> Superuser tekshirilmoqda..."
DJANGO_SETTINGS_MODULE=config.settings.development ./venv/bin/python - <<'PY'
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
django.setup()
from django.contrib.auth import get_user_model
U = get_user_model()
if not U.objects.filter(email='admin@admin.com').exists():
    U.objects.create_superuser(email='admin@admin.com', password='admin1234', full_name='Admin')
    print("✅ Superuser yaratildi: admin@admin.com / admin1234")
else:
    print("ℹ️  Superuser allaqachon mavjud: admin@admin.com")
PY

echo ""
echo "==> Backend ishga tushirilmoqda: http://127.0.0.1:8000"
echo "    Admin panel: http://127.0.0.1:8000/admin/"
echo "    API docs:    http://127.0.0.1:8000/api/docs/"
echo "    To'xtatish:  Ctrl+C"
echo ""
DJANGO_SETTINGS_MODULE=config.settings.development ./venv/bin/python manage.py runserver 127.0.0.1:8000
