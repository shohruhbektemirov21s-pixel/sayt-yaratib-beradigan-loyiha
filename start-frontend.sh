#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  AI Website Builder — Frontend ishga tushirish
#  Ishlatish: bash start-frontend.sh
# ─────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$SCRIPT_DIR/frontend"

cd "$FRONTEND"

echo "==> Frontend: $FRONTEND"

# .env.local yaratish (agar yo'q bo'lsa)
if [ ! -f ".env.local" ]; then
  echo "==> .env.local yaratilmoqda..."
  cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
EOF
  echo "    Yaratildi: .env.local"
fi

# node_modules o'rnatish
if [ ! -d "node_modules" ]; then
  echo "==> npm paketlar o'rnatilmoqda..."
  npm install
fi

echo ""
echo "==> Frontend ishga tushirilmoqda: http://127.0.0.1:3000"
echo "    Builder:   http://127.0.0.1:3000/en/builder"
echo "    Login:     http://127.0.0.1:3000/en/login"
echo "    Register:  http://127.0.0.1:3000/en/register"
echo "    To'xtatish: Ctrl+C"
echo ""
npm run dev -- --hostname 127.0.0.1 --port 3000
