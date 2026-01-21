// Core types for FocusShield

export interface FocusSession {
  id: string;
  user_id?: string;
  started_at: string;
  ended_at?: string;
  duration_sec: number;
  task_title: string;
  artifact_url?: string;
  interrupted: boolean;
  synced?: boolean;
  created_at: string;
}

export interface ShipNote {
  id: string;
  session_id: string;
  user_id?: string;
  note: string;
  blocked_reason?: string;
  synced?: boolean;
  created_at: string;
}

export interface MeetingBlock {
  id: string;
  user_id?: string;
  start_at: string;
  end_at: string;
  title?: string;
  synced?: boolean;
  created_at: string;
}

export interface Profile {
  user_id: string;
  timezone?: string;
  created_at: string;
}

export interface Subscription {
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | null;
  price_id?: string;
  current_period_end?: string;
  updated_at: string;
}

export interface LocalStorageData {
  sessions: FocusSession[];
  ship_notes: ShipNote[];
  meeting_blocks: MeetingBlock[];
  lastUpdated: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalFocusMinutes: number;
  completedSessions: number;
  interruptedSessions: number;
  meetingHours: number;
  contextSwitchIndex: number;
  shipNotesCount: number;
}
