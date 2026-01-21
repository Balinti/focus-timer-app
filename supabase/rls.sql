-- FocusShield Row Level Security Policies
-- Run this after schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Focus sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON focus_sessions;
CREATE POLICY "Users can view their own sessions"
  ON focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON focus_sessions;
CREATE POLICY "Users can insert their own sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON focus_sessions;
CREATE POLICY "Users can update their own sessions"
  ON focus_sessions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON focus_sessions;
CREATE POLICY "Users can delete their own sessions"
  ON focus_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Ship notes policies
DROP POLICY IF EXISTS "Users can view their own notes" ON ship_notes;
CREATE POLICY "Users can view their own notes"
  ON ship_notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON ship_notes;
CREATE POLICY "Users can insert their own notes"
  ON ship_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON ship_notes;
CREATE POLICY "Users can update their own notes"
  ON ship_notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON ship_notes;
CREATE POLICY "Users can delete their own notes"
  ON ship_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Meeting blocks policies
DROP POLICY IF EXISTS "Users can view their own meeting blocks" ON meeting_blocks;
CREATE POLICY "Users can view their own meeting blocks"
  ON meeting_blocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own meeting blocks" ON meeting_blocks;
CREATE POLICY "Users can insert their own meeting blocks"
  ON meeting_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own meeting blocks" ON meeting_blocks;
CREATE POLICY "Users can update their own meeting blocks"
  ON meeting_blocks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own meeting blocks" ON meeting_blocks;
CREATE POLICY "Users can delete their own meeting blocks"
  ON meeting_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Subscriptions are managed by webhooks, so only allow service role to insert/update
-- This is handled by the server-side admin client which bypasses RLS
