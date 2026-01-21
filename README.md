# FocusShield

FocusShield is a calendar- and Slack-aware focus protection app that helps remote engineers schedule and defend deep-work blocks, run task-bound focus sessions, and capture "ship notes" with weekly ROI reporting.

## Features

- **Focus Sessions**: Run timed focus sessions (25/50 min or custom) with task titles and optional artifact URLs
- **Ship Notes**: Capture quick notes about what you accomplished after each session
- **Fragmentation Snapshot**: Track meeting blocks to visualize how meetings fragment your workday
- **Weekly Reports**: View focus time, completed sessions, meeting hours, and context switches
- **Cloud Sync**: Sign in with Google to sync data across devices (optional)
- **Pricing Plans**: Free tier with Pro upgrade for unlimited history

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL
- **Payments**: Stripe

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── stripe/
│   │       ├── create-checkout-session/route.ts
│   │       └── webhook/route.ts
│   ├── app/page.tsx          # Focus session page
│   ├── auth/callback/route.ts
│   ├── history/page.tsx      # Session history
│   ├── pricing/page.tsx      # Pricing plans
│   ├── report/page.tsx       # Weekly reports
│   ├── layout.tsx
│   ├── page.tsx              # Landing page
│   └── globals.css
├── components/
│   ├── GoogleAuth.tsx        # Google Sign-In button
│   └── Navbar.tsx
├── context/
│   └── AuthContext.tsx       # Auth state management
├── lib/
│   ├── constants.ts          # App constants
│   ├── localStorage.ts       # Local storage management
│   ├── supabaseAdmin.ts      # Server-side Supabase client
│   ├── supabaseClient.ts     # Client-side Supabase client
│   └── utils.ts              # Utility functions
└── types/
    └── index.ts              # TypeScript types

supabase/
├── schema.sql                # Database schema
└── rls.sql                   # Row Level Security policies
```

## Database Schema

```sql
-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus sessions table
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER NOT NULL,
  task_title TEXT NOT NULL,
  artifact_url TEXT,
  interrupted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ship notes table
CREATE TABLE ship_notes (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES focus_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  note TEXT NOT NULL,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting blocks table
CREATE TABLE meeting_blocks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/create-checkout-session` | POST | Creates a Stripe checkout session for subscription |
| `/api/stripe/webhook` | POST | Handles Stripe webhook events |
| `/auth/callback` | GET | OAuth callback handler |

## UI Pages

| Page | Path | Description |
|------|------|-------------|
| Landing | `/` | Hero section with "Try it now" CTA |
| Focus Session | `/app` | Timer, task input, ship notes, meeting blocks |
| History | `/history` | List of past sessions and notes |
| Report | `/report` | Weekly statistics and ROI metrics |
| Pricing | `/pricing` | Subscription plans and checkout |

## Environment Variables

### Required for Full Functionality

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | App Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | App Supabase service role key (server-side) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Stripe Pro plan price ID |
| `NEXT_PUBLIC_STRIPE_PRO_PLUS_PRICE_ID` | Stripe Pro+ plan price ID |
| `NEXT_PUBLIC_APP_URL` | App URL (for redirects) |

### Hardcoded (Shared Auth)

The shared authentication Supabase instance credentials are hardcoded as per requirements:
- SUPABASE_URL: `https://api.srv936332.hstgr.cloud`
- SUPABASE_ANON_KEY: (see `src/lib/constants.ts`)

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` with required environment variables
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## Database Setup

1. Run `supabase/schema.sql` against your Supabase database
2. Run `supabase/rls.sql` to enable Row Level Security

## Deployment

The app is configured for deployment on Vercel:

```bash
npx vercel --prod
```

## Services Status

### ACTIVE
- Next.js 14 (App Router)
- Supabase Auth (shared instance - Google OAuth)
- Supabase Database (app-specific - requires configuration)
- Stripe (requires configuration)
- localStorage (for anonymous usage)

### INACTIVE (Needs Setup)
- **App Supabase DB**: Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - enables cloud sync, history persistence
- **Stripe Payments**: Requires `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs - enables Pro subscriptions
- **Google Calendar**: Coming soon - would enable automatic meeting block import
- **Slack Integration**: Coming soon - would enable focus mode status updates
- **GitHub Integration**: Coming soon - would enable commit activity tracking

## License

MIT
