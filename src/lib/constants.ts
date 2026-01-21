// App constants

export const APP_SLUG = 'focus-timer-app';
export const APP_NAME = 'FocusShield';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://focus-timer-app.vercel.app';

// Shared auth Supabase (HARDCODED per requirements)
export const SHARED_SUPABASE_URL = 'https://api.srv936332.hstgr.cloud';
export const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// LocalStorage key
export const LOCAL_STORAGE_KEY = 'focusshield:v1';

// Default timer durations (in seconds)
export const TIMER_DURATIONS = {
  pomodoro: 25 * 60,
  long: 50 * 60,
  custom: 0,
};

// Free tier limits
export const FREE_TIER_REPORT_WEEKS = 2;

// Subscription plans
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Unlimited focus sessions',
      'Ship notes after each session',
      'Manual meeting block tracking',
      'Weekly report (2 weeks history)',
    ],
  },
  pro: {
    name: 'Pro',
    price: 9,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Free',
      'Unlimited report history',
      'Cloud sync across devices',
      'Focus block protection (coming soon)',
      'Slack defense integration (coming soon)',
    ],
  },
  proPlus: {
    name: 'Pro+',
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PLUS_PRICE_ID,
    features: [
      'Everything in Pro',
      'Team analytics dashboard',
      'Calendar integration (coming soon)',
      'GitHub activity tracking (coming soon)',
      'Priority support',
    ],
    comingSoon: true,
  },
};
