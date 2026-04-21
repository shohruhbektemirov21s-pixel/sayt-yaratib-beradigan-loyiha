# AI Website Builder — Loyiha Konteksti (AI uchun)

> Bu fayl sun'iy intellekt (ChatGPT, Claude, Gemini va b.) loyihani to'liq tushunishi uchun yozilgan. Loyihaning arxitekturasi, texnologiyalari, fayl tuzilmasi, API va ishlash prinsiplari qisqa va aniq bayon qilingan.

---

## 1. LOYIHA HAQIDA

**Nomi:** AI Website Builder (SaaS platforma)
**Maqsad:** Foydalanuvchi matn prompt kiritadi (masalan: "Pitsa do'koni uchun sayt yarat"), AI to'liq veb-saytni JSON sxema ko'rinishida generatsiya qiladi, frontend bu sxemadan tirik saytni render qiladi. Tayyor saytni ZIP formatida yuklab olish mumkin.

**Muallif:** Shohruhbek (2026)
**Til:** UI uchun **o'zbek / rus / ingliz** (next-intl)
**Platforma:** Kali Linux (dev), Linux server (prod)

---

## 2. TEXNOLOGIYALAR

### Backend
- **Django 6.0** + Django REST Framework 3.17
- **SimpleJWT** (access 60 daq, refresh 1 kun)
- **django-unfold** (zamonaviy admin UI)
- **drf-spectacular** (Swagger + ReDoc)
- **Django Channels** (WebSocket bildirishnomalar)
- **django-cors-headers**, **whitenoise**
- **anthropic** (Claude SDK)
- **google-genai** (Gemini SDK, hozir vaqtincha o'chirilgan)
- **psycopg2-binary** (PostgreSQL), **redis**, **celery**

### Frontend
- **Next.js 16.2.4** (App Router, Turbopack)
- **React 19.2** + **TypeScript 5**
- **Tailwind CSS 4** + **@radix-ui** + **framer-motion**
- **Zustand 5** (state management)
- **next-intl 4** (i18n: uz, ru, en)
- **axios** (API client JWT interceptor bilan)
- **@tanstack/react-query** (server state)
- **lucide-react** (ikonlar)

### Ma'lumotlar bazasi
- **SQLite** — development
- **PostgreSQL** — production

### AI provayderlar
- **Anthropic Claude** (`claude-sonnet-4-6`) — hozir asosiy
- **Google Gemini** (`gemini-2.0-flash`) — vaqtincha o'chirilgan

---

## 3. FAYL TUZILMASI

```
sayt yaratish/
├── backend/                         # Django backend
│   ├── apps/
│   │   ├── accounts/                # Email-based User, JWT auth
│   │   │   ├── models.py            # User(AbstractUser), UserManager, UserRole
│   │   │   ├── views.py             # RegisterView, LoginView, UserMeView
│   │   │   ├── admin_api.py         # Admin panel API (stats, users, tariffs)
│   │   │   ├── serializers.py
│   │   │   ├── password_validators.py  # Strong + NoCommonPassword
│   │   │   ├── lockout.py           # Brute-force himoya
│   │   │   └── urls.py
│   │   ├── ai_generation/
│   │   │   ├── services.py          # ArchitectService, ClaudeService, AIRouterService
│   │   │   ├── views.py             # ChatView, DetectIntentView
│   │   │   └── urls.py
│   │   ├── website_projects/
│   │   │   ├── models.py            # WebsiteProject, ProjectVersion, ProjectStatus
│   │   │   ├── views.py             # process_prompt, download_zip
│   │   │   ├── serializers.py
│   │   │   └── urls.py
│   │   ├── subscriptions/           # Tariff, Subscription
│   │   ├── payments/                # To'lov integratsiyasi
│   │   ├── exports/                 # ZIP eksport (services.py, views.py)
│   │   └── notifications/
│   │       ├── consumers.py         # WebSocket consumer
│   │       └── routing.py
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py              # INSTALLED_APPS, MIDDLEWARE, DATABASES
│   │   │   ├── development.py       # SQLite + InMemoryChannelLayer
│   │   │   └── production.py        # Postgres + Daphne + Redis
│   │   ├── urls.py                  # Root URL marshrutlari
│   │   ├── wsgi.py / asgi.py
│   │   ├── security_middleware.py   # Security headers
│   │   ├── audit_middleware.py      # Audit logging
│   │   ├── startup_checks.py        # Xavfsizlik tekshiruvi
│   │   └── dashboard.py             # Unfold admin dashboard
│   ├── requirements/base.txt        # Python paketlar
│   ├── manage.py
│   ├── db.sqlite3                   # SQLite bazasi (dev)
│   └── venv/                        # Python virtual env
│
├── frontend/                        # Next.js frontend
│   ├── src/
│   │   ├── app/[locale]/
│   │   │   ├── page.tsx             # Bosh sahifa (landing)
│   │   │   ├── builder/page.tsx     # AI Builder (ASOSIY)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── pricing/page.tsx
│   │   ├── features/builder/
│   │   │   ├── SiteRenderer.tsx     # JSON schema'dan sayt render qiladi
│   │   │   └── sections/            # hero, features, stats, pricing, contact, about, services
│   │   ├── shared/api/axios.ts      # JWT interceptorli API client
│   │   ├── store/
│   │   │   ├── authStore.ts         # Zustand: JWT + user
│   │   │   └── projectStore.ts      # Zustand: joriy loyiha
│   │   └── proxy.ts
│   ├── messages/{en,ru,uz}.json     # next-intl tarjimalari
│   ├── package.json
│   ├── next.config.ts
│   └── .env.local                   # NEXT_PUBLIC_API_URL
│
├── .env                             # Kalitlar va sozlamalar (gitignore)
├── start-backend.sh                 # Backend ishga tushirish
├── start-frontend.sh                # Frontend ishga tushirish
├── site_blueprint.json              # Namuna sayt sxemasi
└── README.md
```

---

## 4. API ENDPOINTLARI

### Auth (`/api/accounts/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/register/` | Ro'yxatdan o'tish |
| POST | `/login/` | Kirish (JWT access + refresh) |
| POST | `/token/refresh/` | Token yangilash |
| GET | `/me/` | Joriy foydalanuvchi |
| GET | `/admin/stats/` | Admin statistika |
| GET | `/admin/users/` | Foydalanuvchilar ro'yxati |
| POST | `/admin/users/{id}/grant/` | Obuna berish |
| POST | `/admin/users/{id}/toggle/` | Faollashtirish/bloklash |
| GET/POST | `/admin/tariffs/` | Tariflarni boshqarish |

### Loyihalar (`/api/projects/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| GET | `/` | Loyihalar ro'yxati |
| POST | `/process_prompt/` | **AI ga so'rov yuborish (asosiy endpoint)** |
| GET | `/{id}/download_zip/` | ZIP yuklab olish |

### AI (`/api/ai/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/chat/` | AI suhbat |
| POST | `/intent/` | Intent aniqlash |

### Obunalar (`/api/subscriptions/`)
- `GET /tariffs/` — tariflar ro'yxati
- `GET /my/` — foydalanuvchi obunasi

### To'lovlar (`/api/payments/`)

### Hujjatlar
- `/api/docs/` — Swagger UI
- `/api/redoc/` — ReDoc
- `/api/schema/` — OpenAPI schema

---

## 5. ASOSIY OQIM — `process_prompt` qanday ishlaydi

### So'rov
```json
POST /api/projects/process_prompt/
Authorization: Bearer <JWT>

{
  "prompt": "Toshkentdagi pitsa do'koni uchun zamonaviy sayt yarat",
  "language": "uz",
  "project_id": null
}
```

### Backend mantiqi (`apps/website_projects/views.py`)
```
1. AIRouterService.detect_intent(prompt) → "CHAT" | "ARCHITECT" | "GENERATE" | "REVISE"
2. Agar CHAT     → ClaudeService.chat() → oddiy javob
3. Agar ARCHITECT → ArchitectService.chat() → dizayn variantlar + spec yig'adi
4. Agar GENERATE → ClaudeService.generate_from_spec() yoki generate_full_site() → JSON schema
5. Agar REVISE   → ClaudeService.revise_site(current_schema, prompt) → yangilangan schema
6. WebsiteProject saqlash (status: GENERATING → COMPLETED/FAILED)
7. ProjectVersion yaratish (tarix uchun)
```

### Javob (sayt yaratildi)
```json
{
  "success": true,
  "is_chat": false,
  "ai_type": "CLAUDE",
  "project": {
    "id": "uuid",
    "title": "Pitsa do'koni",
    "status": "COMPLETED",
    "schema_data": {
      "siteName": "Napoli Pizza",
      "pages": [{
        "slug": "home",
        "sections": [
          {"id": "hero-1", "type": "hero", "content": {...}},
          {"id": "features-1", "type": "features", "content": {"items": [...]}},
          {"id": "contact-1", "type": "contact", "content": {...}}
        ]
      }]
    }
  }
}
```

### Javob (oddiy savol)
```json
{
  "success": true,
  "is_chat": true,
  "message": "Men sayt yaratuvchi AI yordamchiman..."
}
```

---

## 6. AI XIZMATLARI (`apps/ai_generation/services.py`)

### `AIRouterService.detect_intent(prompt, has_project)`
Oddiy regex tahlil:
- `"yarat|qur|build|create|generate"` → **ARCHITECT** (yangi loyiha) yoki **REVISE** (mavjud loyiha)
- `"salom|hello|?|rahmat"` → **CHAT**
- Uzun matn (>30 belgi) → **ARCHITECT**
- Default → **CHAT**

### `ArchitectService.chat(user_msg, history)`
- Foydalanuvchi bilan muloqot qiladi
- 3 ta **dizayn variant** taklif qiladi (`[DESIGN_VARIANTS]` blokida JSON)
- Foydalanuvchi rozi bo'lganda (`"bo'ldi"`, `"tayyor"`, `"qur"`) → **FINAL_SITE_SPEC** yaratadi
- Qaytaradi: `(ai_text, spec_or_None, design_variants_or_None)`

### `ClaudeService`
- `.chat(prompt)` — oddiy suhbat
- `.generate_from_spec(spec)` — FINAL_SITE_SPEC'dan JSON schema (system prompt: `GENERATE_SYSTEM_PROMPT`)
- `.generate_full_site(prompt, language)` — to'g'ridan-to'g'ri prompt'dan schema (arxitektor yo'q)
- `.revise_site(prompt, current_schema, language)` — mavjud schema'ni tahrirlaydi
- `.generate_site_files(schema, language)` — to'liq kod fayllar: `index.html`, `css/styles.css`, `js/app.js`, `backend/server.js` (Express), `backend/package.json`, `backend/.env.example`

### Sistema promptlari (services.py ichida)
- `ARCHITECT_SYSTEM_PROMPT` — 97 qator, o'zbek tilida, "Arxitektor AI" rolisi
- `GENERATE_SYSTEM_PROMPT` — qat'iy JSON format: "RETURN ONLY valid JSON"
- `REVISE_SYSTEM_PROMPT` — schema tahrirlash
- `SITE_FILES_SYSTEM_PROMPT` — to'liq ishlab chiqarish kodi generatsiyasi
- `CHAT_SYSTEM_PROMPT` — oddiy javoblar uchun

---

## 7. MODEL SXEMASI

### User (`apps/accounts/models.py`)
```python
class User(AbstractUser):
    username = None
    email = EmailField(unique=True)      # USERNAME_FIELD
    full_name = CharField(max_length=255)
    role = CharField(choices=UserRole)   # ADMIN | USER
```

### WebsiteProject (`apps/website_projects/models.py`)
```python
class WebsiteProject(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User, related_name='projects')
    title = CharField(max_length=255)
    prompt = TextField()
    language = CharField(default='en')    # en, ru, uz
    status = CharField(choices=ProjectStatus)  # IDLE, GENERATING, COMPLETED, FAILED
    blueprint = JSONField(null=True)
    schema_data = JSONField(null=True)    # AI generatsiya natijasi
    generated_files = JSONField(null=True) # Claude generatsiya qilgan fayllar
    business_type = CharField(blank=True)
    created_at, updated_at, generation_started_at

class ProjectVersion(models.Model):
    id = UUIDField
    project = ForeignKey(WebsiteProject, related_name='versions')
    prompt = TextField
    schema_data = JSONField
    intent = CharField
    version_number = PositiveIntegerField
```

---

## 8. FRONTEND ARXITEKTURASI

### Builder sahifasi (`src/app/[locale]/builder/page.tsx`)
```
┌──────────────────────────────────────────────────────────┐
│  Header (logo, user menu)                                │
├─────┬────────────────────────────┬──────────────────────┤
│     │                            │  Chat panel          │
│ ▣   │   Preview canvas           │  ┌─────────────────┐ │
│ 🎨  │   ┌────────────────────┐   │  │ AI javoblari    │ │
│ 💬  │   │  <SiteRenderer />  │   │  │ (history)       │ │
│ 📦  │   │  JSON → HTML       │   │  ├─────────────────┤ │
│     │   └────────────────────┘   │  │ Prompt input    │ │
│     │                            │  └─────────────────┘ │
└─────┴────────────────────────────┴──────────────────────┘
```

### `SiteRenderer.tsx` (`src/features/builder/SiteRenderer.tsx`)
`schema_data.pages[*].sections[*]` dan har bir section uchun mos komponent render qiladi:
- `type: "hero"` → `HeroSection.tsx`
- `type: "features"` → `FeaturesSection.tsx`
- `type: "stats"`, `"pricing"`, `"contact"`, `"about"`, `"services"` → mos komponent

### State (Zustand)
```typescript
// authStore.ts
interface AuthStore {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  login(email, password): Promise<void>;
  register(email, password, fullName): Promise<void>;
  logout(): void;
  // localStorage'da saqlanadi
}

// projectStore.ts
interface ProjectStore {
  currentProject: Project | null;
  messages: ChatMessage[];
  sendPrompt(prompt, language): Promise<void>;
  loadProject(id): Promise<void>;
}
```

### API client (`src/shared/api/axios.ts`)
- JWT token `authStore`dan olinadi va har bir so'rovga `Authorization: Bearer` qo'shiladi
- 401 xato bo'lsa → `refresh` endpointi orqali token yangilanadi
- Refresh ham muvaffaqiyatsiz bo'lsa → logout

---

## 9. `.env` — MUHIT O'ZGARUVCHILARI

Loyiha ildizida bo'lishi kerak (gitignore qilingan):
```env
# Django
SECRET_KEY=tasodifiy-murakkab-kalit
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# DB (dev: SQLite, prod: Postgres)
DATABASE_URL=sqlite:////home/kali/Рабочий стол/sayt yaratish/backend/db.sqlite3

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
GOOGLE_GENERATIVE_AI_MODEL=gemini-2.0-flash

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Admin URL (xavfsizlik uchun o'zgartirilgan)
ADMIN_URL=17210707admin
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

---

## 10. ISHGA TUSHIRISH

### Talablar: Python 3.11+, Node.js 20+

```bash
# Terminal 1 — Backend
cd "/home/kali/Рабочий стол/sayt yaratish"
bash start-backend.sh
# → http://127.0.0.1:8000

# Terminal 2 — Frontend
bash start-frontend.sh
# → http://127.0.0.1:3000/en
```

Skriptlar avtomatik: venv yaratish, paketlar o'rnatish, migratsiyalar, superuser yaratish (`admin@admin.com` / `admin1234`), server ishga tushirish.

### Muhim nuans (Kali Linux)
`source venv/bin/activate` dan keyin ham `python` **system Python**'ga ko'rsatadi. Har doim to'liq yo'l:
```bash
# ✅ To'g'ri
DJANGO_SETTINGS_MODULE=config.settings.development venv/bin/python manage.py runserver

# ❌ Noto'g'ri (unfold topilmaydi)
python manage.py runserver
```

---

## 11. XAVFSIZLIK XUSUSIYATLARI

- **JWT token** + refresh rotation
- **Admin URL** `.env` orqali yashirin (`ADMIN_URL=17210707admin`)
- **Admin panelga** faqat `is_staff=True` kira oladi (`_staff_required` decorator)
- **Brute-force lockout** (`apps/accounts/lockout.py`)
- **Strong password validator** + common password blacklist
- **SecurityHeadersMiddleware** (`config/security_middleware.py`)
- **AuditLogMiddleware** (`config/audit_middleware.py`) — har bir so'rov loglanadi
- **CORS** — dev da hamma ruxsat, prod da faqat domen
- **Startup checks** (`config/startup_checks.py`) — server ishga tushganda xavfsizlikni tekshiradi

---

## 12. SECTION TURLARI (SiteRenderer)

| Type | Kontent (schema_data) | Ko'rinish |
|------|----------------------|-----------|
| `hero` | title, description, ctaText | Katta sarlavha + tavsif + tugma |
| `features` | title, items: [{title, description}] | 3 ustunli kartalar |
| `services` | title, items | Xizmatlar (features uslubida) |
| `stats` | items: [{value, label}] | Raqamlar grid |
| `pricing` | plans: [{name, price, features}] | Tarif kartalari |
| `contact` | email, phone, address | Kontakt forma |
| `about` | title, description | Kompaniya haqida (hero uslubida) |

---

## 13. HOZIRGI LOYIHA HOLATI

- ✅ Backend: Django 6.0.4 ishlayapti (port 8000)
- ✅ Frontend: Next.js 16.2.4 ishlayapti (port 3000)
- ✅ Migratsiyalar: barchasi qo'llanilgan
- ✅ Admin panel: `admin@admin.com` / `admin1234`
- ⚠️ Gemini API vaqtincha o'chirilgan (`services.py` da comment qilingan)
- ⚠️ Anthropic API kalit yangilanishi kerak bo'lishi mumkin
- ⚠️ Daphne (ASGI) dev'da o'chirilgan (sandboxda segfault beradi)

---

## 14. TEZ-TEZ UCHRAYDIGAN MUAMMOLAR

| Muammo | Yechim |
|--------|--------|
| `No module named 'unfold'` | `venv/bin/python` ishlatish |
| `venv/bin/python3: not found` | venv boshqa kompyuterdan — qayta yaratish: `python3 -m venv venv` |
| `Connection refused` | Backend ishlamayapti — `start-backend.sh` |
| `502 Bad Gateway` `/api/projects/process_prompt/` | AI API ulanishi yo'q (DNS yoki kalit xato) |
| `CORS error` | Dev'da `CORS_ALLOW_ALL_ORIGINS=True` bor, tekshiring |
| `Gemini 429 quota` | Limit tugagan, kuting |
| Frontend `localhost` ulanmaydi | `127.0.0.1` ishlatish kerak |

---

## 15. MUHIM ESLATMA AI UCHUN

Agar siz (AI) bu loyiha ustida ishlayotgan bo'lsangiz, quyidagilarga e'tibor bering:

1. **Til:** UI va AI javoblari **o'zbek tilida** bo'lishi kerak (default).
2. **Sistema promptlari** `apps/ai_generation/services.py`da — ularni o'zgartirishda ehtiyot bo'ling.
3. **Gemini o'chirilgan** — yoqish uchun `services.py`da comment'larni oching va Claude bloklarini yoping.
4. **JSON schema formati** qat'iy — SiteRenderer faqat ma'lum section type'larni biladi.
5. **JWT** — har bir API so'rovga `Authorization: Bearer <token>` kerak.
6. **SQLite dev'da** — prod'ga o'tishda `DATABASE_URL=postgresql://...` qo'yish kerak.
7. **Migratsiyalar** — har qanday model o'zgarishidan so'ng: `venv/bin/python manage.py makemigrations && migrate`.
8. **Fayllarni o'qishda** — loyiha yo'li: `/home/kali/Рабочий стол/sayt yaratish/` (Russian characters!).

---

*Oxirgi yangilanish: 2026-04-22*
*Muallif: Shohruhbek*
