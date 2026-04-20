# AI Website Builder – Comprehensive Guide

## 📖 Overview
This repository contains a **premium SaaS platform** that generates complete multi‑page websites from a simple text prompt using **Google Gemini**. The stack consists of:
- **Backend** – Django 6 + Django REST Framework + Channels (WebSockets) + Celery (optional async) + **django‑unfold** for a sleek admin UI.
- **Frontend** – Next.js 14 (App Router) with TypeScript and Tailwind CSS.
- **AI Integration** – Gemini model (`gemini‑flash‑latest` by default) driven by the `GeminiService`.
- **Subscriptions & Payments** – Fully integrated subscription management.

The goal is to let **any user** (including you) generate a website, preview it, and export it, all through a clean UI and a robust API.

---

## 🛠️ Prerequisites
| Tool | Version |
|------|---------|
| Python | 3.13 |
| Node.js | 20+ |
| PostgreSQL | 15+ |
| Redis | 7+ |
| Git | any |

Make sure you have a **virtual environment** for Python and **npm** installed globally.

---

## 📂 Project Structure
```
├─ backend/                     # Django project
│   ├─ config/                  # Settings (base, development, production)
│   ├─ apps/                    # Individual Django apps
│   │   ├─ accounts/            # User model & auth serializers
│   │   ├─ ai_generation/       # Gemini integration
│   │   ├─ website_projects/    # Core project & generation endpoint
│   │   └─ …
│   └─ manage.py
├─ frontend/                    # Next.js app
│   ├─ src/                     # React components, pages, utils
│   ├─ public/                  # Static assets
│   └─ next.config.ts
├─ .env                         # Environment variables (see below)
└─ README.md                    # This guide
```

---

## 🔧 Setup – Backend
1. **Clone the repo** (you already have it).
2. **Create a virtual environment** and activate it:
   ```bash
   cd "/home/kali/Рабочий стол/sayt yaratish/backend"
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install Python dependencies**:
   ```bash
   pip install -r requirements/base.txt
   ```
4. **Configure environment variables** – copy the example and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `GOOGLE_GENERATIVE_AI_API_KEY` – the Gemini API key you provided.
   - `GOOGLE_GENERATIVE_AI_MODEL` – default is `gemini-flash-latest` (works with the key).
   - `DATABASE_URL` – PostgreSQL connection string.
   - `REDIS_URL` – for Channels/Celery.
   - `TELEGRAM_CONTACT` – your Telegram handle and phone (optional).
5. **Apply migrations & create a superuser**:
   ```bash
   ./venv/bin/python manage.py migrate
   ./venv/bin/python manage.py createsuperuser
   ```
6. **Run the development server**:
   ```bash
   ./venv/bin/python manage.py runserver
   ```
   The server should start without the previous `ModuleNotFoundError` (the `django‑unfold` package is now installed). If you see an error, stop the process and run the command again.

---

## 🎨 Setup – Frontend
1. **Enter the frontend directory**:
   ```bash
   cd "/home/kali/Рабочий стол/sayt yaratish/frontend"
   ```
2. **Install Node dependencies**:
   ```bash
   npm install
   ```
3. **Create a `.env.local`** (mirrors the backend API URL):
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api" > .env.local
   ```
4. **Start the Next.js dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3001` (or the port shown in the console) in your browser.

---

## 🚀 How to Generate a Website (API)
### Endpoint
```
POST /api/website_projects/generate/
```
### Request body (JSON)
```json
{
  "title": "My Awesome Startup",
  "prompt": "Create a modern landing page for a SaaS product that uses AI to automate tasks.",
  "language": "en"   // or "ru", "uz"
}
```
### Headers
- `Authorization: Bearer <your‑JWT‑access‑token>` (login via the built‑in auth endpoints first).

### Response (on success)
```json
{
  "id": "...",
  "title": "My Awesome Startup",
  "prompt": "...",
  "language": "en",
  "status": "COMPLETED",
  "blueprint": { ... },   // full Gemini blueprint JSON
  "created_at": "2026-04-19T...",
  "updated_at": "2026-04-19T..."
}
```
If generation fails, you’ll receive a `500` with `{"detail": "AI generation failed."}` and the error will be logged in the Django console.

---

## 🖥️ Admin Panel
Visit `http://127.0.0.1:8000/admin/` and log in with the superuser you created. Thanks to **django‑unfold**, the UI is modern and responsive. You’ll see:
- **Website Projects** – list, filter by status, search by title or user.
- **Project Status** – simple lookup table.
- Other models (accounts, subscriptions, payments, etc.)

---

## 📱 Telegram Contact (Optional)
The variable `TELEGRAM_CONTACT` is now stored in `.env`. You can expose it via a tiny API if you need to display it in the UI:
```python
# backend/apps/common/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings

class TelegramContactView(APIView):
    permission_classes = []  # public endpoint
    def get(self, request):
        return Response({"contact": getattr(settings, "TELEGRAM_CONTACT", "")})
```
Add it to `backend/config/urls.py` and fetch it from the frontend.

---

## 🧩 Extending / Next Steps
- **Async generation** – replace the synchronous block in `WebsiteProjectViewSet.generate` with a Celery task (`tasks.generate_blueprint`) and return a job ID.
- **Preview renderer** – the frontend already has a `SiteRenderer` component; feed it the `blueprint` JSON to render a live preview.
- **Export** – implement an endpoint that converts the full schema into a static site ZIP (already scaffolded in `apps/exports`).
- **Testing** – add unit tests for `GeminiService` (mock the Gemini client) and integration tests for the generate endpoint.
- **Deployment** – switch to `gunicorn` + `uvicorn` for ASGI, configure HTTPS, and point `CORS_ALLOWED_ORIGINS` to your production domain.

---

## ❓ Common Issues & Fixes
| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'unfold'` | Ensure `django-unfold` is installed (`pip install django-unfold`) and **restart** the Django server. |
| Gemini model not found (`404 models/...`) | Use a model that exists for your API key – `gemini-flash-latest` works out‑of‑the‑box. Adjust `GOOGLE_GENERATIVE_AI_MODEL` in `.env`. |
| CORS errors when frontend talks to backend | Add your frontend URL to `CORS_ALLOWED_ORIGINS` in `backend/config/settings/development.py` (or set `CORS_ALLOW_ALL_ORIGINS = True` only for local dev). |
| Environment variables not loading | Verify `load_dotenv` is called in `backend/config/settings/base.py` (it reads the `.env` at project root). |

---

## 🎉 You’re Ready!
1. **Start the backend** (`python manage.py runserver`).
2. **Start the frontend** (`npm run dev`).
3. Open the UI, log in, and use the **Generate** form to create a site.
4. Check the **Admin** panel to see the stored blueprint and status.
5. Share the generated site or export it as needed.

If you run into any hiccups, consult the **Common Issues** table above or let me know – I’m happy to help you troubleshoot further.

---

*Happy building!*
