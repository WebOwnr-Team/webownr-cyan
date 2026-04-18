# WebOwnr Cyan — AI Business Agent

Cyan is the operating intelligence at the heart of WebOwnr. A proactive, context-aware AI agent built for African SMEs. This is the standalone Cyan build — developed before integration into the full WebOwnr platform.

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in .env.local (see setup instructions below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Full Setup Instructions

### Step 1 — Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it `webownr-cyan` → create
3. In the project dashboard, click the **web icon** (`</>`) to add a web app
4. Name it `cyan-web` → click **Register app**
5. Copy the `firebaseConfig` values — you need all 5 for `.env.local`

### Step 2 — Enable Firebase Auth

1. In Firebase Console → **Authentication** → **Get started**
2. Under **Sign-in method**, enable:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → add your project's support email → Save
3. Under **Authorized domains**, your `localhost` is already there. After deploying to Vercel, add your Vercel domain here too.

### Step 3 — Set Up Firestore

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → select region closest to Nigeria: `europe-west1` or `us-central1`
3. Click **Create**

### Step 4 — Deploy Firestore Security Rules

Install the Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your webownr-cyan project
```

Deploy the rules and indexes:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

> **Important:** The app will not work correctly without these rules deployed. The `collectionGroup` query in the auth middleware requires the index.

### Step 5 — Firebase Admin Service Account

1. Firebase Console → **Project Settings** (gear icon) → **Service Accounts** tab
2. Click **"Generate new private key"** → confirm → a JSON file downloads
3. Base64-encode the file:
   - **Mac/Linux:** `base64 -i serviceAccountKey.json | tr -d '\n' | pbcopy`
   - **Windows PowerShell:** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json")) | clip`
4. Paste that long string as `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`
5. **Delete the JSON file** — never commit it

### Step 6 — Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys** → **Create Key** → name it `cyan-dev`
4. Copy the key immediately (you can't see it again)
5. Paste it as `ANTHROPIC_API_KEY` in `.env.local`
6. **Models used:**
   - `claude-haiku-4-5-20251001` — briefings, attendance notes, quick tasks
   - `claude-sonnet-4-5` — strategy chat, weekly reports, anomaly analysis

### Step 7 — Fill in `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=webownr-cyan.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=webownr-cyan
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

FIREBASE_SERVICE_ACCOUNT_KEY=eyJhbGciOiJSUzI1NiIs...  (very long base64 string)

ANTHROPIC_API_KEY=sk-ant-api03-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 8 — Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` → you'll be redirected to `/login` → create an account → complete onboarding → dashboard loads.

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: Cyan AI Business Agent — all 8 phases"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/webownr-cyan.git
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New Project**
2. Import your `webownr-cyan` GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Root directory: leave as `/` (default)
5. **Do not deploy yet** — add environment variables first

### Step 3 — Add Environment Variables on Vercel

In Vercel → Project → **Settings** → **Environment Variables**, add every variable from your `.env.local`:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | your value | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | your value | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your value | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | your value | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | your value | Production, Preview, Development |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | your base64 string | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | your key | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Production |

> **Critical:** `FIREBASE_SERVICE_ACCOUNT_KEY` and `ANTHROPIC_API_KEY` must be set to **all three environments** (Production, Preview, Development).

### Step 4 — Deploy

Click **Deploy**. Vercel will build and deploy in ~2 minutes.

### Step 5 — Add Vercel Domain to Firebase Auth

1. Copy your Vercel deployment URL (e.g. `https://webownr-cyan.vercel.app`)
2. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
3. Click **Add domain** → paste your Vercel URL (without `https://`) → Add

### Step 6 — Deploy Firestore Rules for Production

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## What Happens When You First Open It

1. `/` redirects to `/login`
2. Click **"Create one"** → Register page
3. Sign up with email or Google
4. You're redirected to `/onboarding`
5. Cyan asks 5 questions (business name, what you sell, who your customer is, 90-day goal, work schedule)
6. After the last question, Cyan writes your `businessContext` to Firestore and redirects to `/dashboard`
7. Dashboard loads your first briefing (Cyan generates it on demand — costs ~300 Haiku tokens)
8. All features are live: chat at `/cyan`, alerts at `/alerts`, attendance at `/attendance`, workspace at `/workspace`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom design system |
| Icons | lucide-react |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Email + Google OAuth) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Admin | Firebase Admin SDK |

---

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Create account |
| `/onboarding` | 5-step Cyan setup conversation |
| `/dashboard` | Main dashboard — briefing, metrics, attendance |
| `/cyan` | Full-screen 3-panel Cyan chat |
| `/alerts` | Active anomaly alerts |
| `/attendance` | Team attendance dashboard |
| `/workspace` | Personal workspace — morning card, profile, history |

---

## API Routes

All routes require `Authorization: Bearer <Firebase ID token>`

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cyan/onboarding/complete` | POST | Creates businessContext after onboarding |
| `/api/cyan/context/update` | GET, PATCH | Fetch or update businessContext |
| `/api/cyan/briefing` | GET | Daily/personal/weekly briefings (cache-first) |
| `/api/cyan/chat` | POST | Single-turn Cyan completion |
| `/api/cyan/chat/stream` | POST | Streaming SSE Cyan completion |
| `/api/cyan/conversation` | POST | Conversation with thread persistence + streaming |
| `/api/cyan/conversation/threads` | GET, PATCH | Thread list, messages, pin/archive |
| `/api/cyan/tokens` | GET | Monthly token usage |
| `/api/cyan/baseline` | GET, PATCH | Performance baseline (anomaly detection anchor) |
| `/api/cyan/monitor` | POST | Run anomaly detection cycle |
| `/api/cyan/alerts` | GET, PATCH | Active alerts, acknowledge/resolve |
| `/api/cyan/attendance/checkin` | GET, POST | Record check-in |
| `/api/cyan/attendance/checkout` | POST | Record check-out, generate Cyan note |
| `/api/cyan/attendance/summary` | GET | Today's summary, history, member records |
| `/api/cyan/member` | GET, PATCH | Member profile |
| `/api/cyan/member/wellbeing` | GET, POST | Weekly private wellbeing check-in |

---

## Pricing Plans (hardcoded in token-tracker)

| Plan | Tokens/month | Sonnet sessions | Price |
|------|-------------|----------------|-------|
| Growth | 50,000 | 10 | ₦25,000/mo |
| Business | 200,000 | Unlimited | ₦65,000/mo |
| Enterprise | Custom | Unlimited | Custom |

New accounts default to **Growth** plan. To upgrade a business, update `plan` in their `tokenUsage/{businessId}/{YYYY-MM}` document in Firestore.

---

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `businessContext/{businessId}` | Business identity, goals, team, Cyan memory |
| `teamMembers/{businessId}/members/{uid}` | Team member profiles |
| `attendance/{businessId}/records/{date}_{uid}` | Daily attendance |
| `cyanAlerts/{businessId}/alerts/{alertId}` | Anomaly alerts |
| `cyanBriefings/{businessId}/daily/{date}` | Cached daily briefings |
| `cyanBriefings/{businessId}/weekly/{weekStart}` | Cached weekly reports |
| `cyanBriefings/{businessId}/personal/{date}_{uid}` | Personal briefings |
| `conversations/{businessId}/threads/{threadId}` | Chat threads |
| `conversations/{businessId}/threads/{threadId}/messages/{messageId}` | Messages |
| `tokenUsage/{businessId}/{YYYY-MM}` | Monthly token consumption |
| `wellbeing/{businessId}/entries/{week}_{uid}` | Private wellbeing scores |

---

## Cost Estimates

Running Cyan for one business on the Growth plan:
- Daily briefings: ~300 Haiku tokens × 30 days = ~9,000 tokens/month
- Weekly reports: ~1,500 Sonnet tokens × 4 = 6,000 tokens/month  
- Chat conversations: ~800 tokens per session (Sonnet — capped at 10/month on Growth)
- Total Growth plan usage: well within 50,000 token budget for active daily use

Anthropic pricing (as of April 2026):
- Haiku: ~$0.00025/1K input tokens, ~$0.00125/1K output tokens
- Sonnet: ~$0.003/1K input tokens, ~$0.015/1K output tokens

---

*WebOwnr Cyan — Built by Ayomide Alao (Alphae X) · Confidential*
