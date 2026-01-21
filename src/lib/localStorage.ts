// LocalStorage management for anonymous usage

import { FocusSession, ShipNote, MeetingBlock, LocalStorageData } from '@/types';
import { LOCAL_STORAGE_KEY } from './constants';

const getDefaultData = (): LocalStorageData => ({
  sessions: [],
  ship_notes: [],
  meeting_blocks: [],
  lastUpdated: new Date().toISOString(),
});

export function getLocalData(): LocalStorageData {
  if (typeof window === 'undefined') return getDefaultData();

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return getDefaultData();
    return JSON.parse(stored);
  } catch {
    return getDefaultData();
  }
}

export function saveLocalData(data: LocalStorageData): void {
  if (typeof window === 'undefined') return;

  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save local data:', e);
  }
}

export function addSession(session: FocusSession): void {
  const data = getLocalData();
  data.sessions.push(session);
  saveLocalData(data);
}

export function updateSession(sessionId: string, updates: Partial<FocusSession>): void {
  const data = getLocalData();
  const index = data.sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    data.sessions[index] = { ...data.sessions[index], ...updates };
    saveLocalData(data);
  }
}

export function addShipNote(note: ShipNote): void {
  const data = getLocalData();
  data.ship_notes.push(note);
  saveLocalData(data);
}

export function addMeetingBlock(block: MeetingBlock): void {
  const data = getLocalData();
  data.meeting_blocks.push(block);
  saveLocalData(data);
}

export function removeMeetingBlock(blockId: string): void {
  const data = getLocalData();
  data.meeting_blocks = data.meeting_blocks.filter(b => b.id !== blockId);
  saveLocalData(data);
}

export function hasUnsyncedData(): boolean {
  const data = getLocalData();
  return (
    data.sessions.some(s => !s.synced) ||
    data.ship_notes.some(n => !n.synced) ||
    data.meeting_blocks.some(b => !b.synced)
  );
}

export function markAsSynced(): void {
  const data = getLocalData();
  data.sessions = data.sessions.map(s => ({ ...s, synced: true }));
  data.ship_notes = data.ship_notes.map(n => ({ ...n, synced: true }));
  data.meeting_blocks = data.meeting_blocks.map(b => ({ ...b, synced: true }));
  saveLocalData(data);
}

export function getCompletedSessionsCount(): number {
  const data = getLocalData();
  return data.sessions.filter(s => s.ended_at && !s.interrupted).length;
}

export function getShipNotesCount(): number {
  return getLocalData().ship_notes.length;
}

export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}
