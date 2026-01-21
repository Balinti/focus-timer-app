-- FocusShield Database Schema
-- Run this against your app-specific Supabase database (NOT the shared auth DB)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER NOT NULL,
  task_title TEXT NOT NULL,
  artifact_url TEXT,
  interrupted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ship notes table
CREATE TABLE IF NOT EXISTS ship_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES focus_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting blocks table (for fragmentation tracking)
CREATE TABLE IF NOT EXISTS meeting_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table (for Stripe integration)
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ship_notes_session_id ON ship_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_ship_notes_user_id ON ship_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_blocks_user_id ON meeting_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_blocks_start_at ON meeting_blocks(start_at);

-- Create a trigger to automatically create profile on first data sync
CREATE OR REPLACE FUNCTION create_profile_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to focus_sessions
DROP TRIGGER IF EXISTS create_profile_on_session ON focus_sessions;
CREATE TRIGGER create_profile_on_session
  AFTER INSERT ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_if_not_exists();
