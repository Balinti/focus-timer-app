'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FocusSession, ShipNote } from '@/types';
import { getLocalData, markAsSynced, hasUnsyncedData } from '@/lib/localStorage';
import { getSupabaseClient, isAppSupabaseConfigured } from '@/lib/supabaseClient';
import { formatDate, formatDuration } from '@/lib/utils';

interface SessionWithNote extends FocusSession {
  ship_note?: ShipNote;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasUnsynced, setHasUnsynced] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'interrupted'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load local data
    const localData = getLocalData();
    const localSessions = localData.sessions.map(session => {
      const note = localData.ship_notes.find(n => n.session_id === session.id);
      return { ...session, ship_note: note };
    });

    // Sort by start time descending
    localSessions.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    // If logged in and app Supabase is configured, try to load cloud data
    if (user && isAppSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: cloudSessions } = await supabase
            .from('focus_sessions')
            .select('*, ship_notes(*)')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false });

          if (cloudSessions) {
            // Merge cloud and local, prefer cloud for duplicates
            const cloudIds = new Set(cloudSessions.map((s: FocusSession) => s.id));
            const localOnly = localSessions.filter(s => !cloudIds.has(s.id));

            const mergedSessions = [
              ...cloudSessions.map((s: { ship_notes?: ShipNote[] } & FocusSession) => ({
                ...s,
                ship_note: s.ship_notes?.[0],
              })),
              ...localOnly,
            ];

            mergedSessions.sort((a, b) =>
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            );

            setSessions(mergedSessions);
            setLoading(false);
            setHasUnsynced(localOnly.length > 0);
            return;
          }
        } catch (e) {
          console.error('Failed to load cloud data:', e);
        }
      }
    }

    setSessions(localSessions);
    setHasUnsynced(hasUnsyncedData());
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const syncToCloud = useCallback(async () => {
    if (!user || !isAppSupabaseConfigured()) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSyncing(true);

    try {
      const localData = getLocalData();

      // Sync sessions
      const unsyncedSessions = localData.sessions.filter(s => !s.synced);
      if (unsyncedSessions.length > 0) {
        const sessionsToInsert = unsyncedSessions.map(s => ({
          id: s.id,
          user_id: user.id,
          started_at: s.started_at,
          ended_at: s.ended_at,
          duration_sec: s.duration_sec,
          task_title: s.task_title,
          artifact_url: s.artifact_url,
          interrupted: s.interrupted,
          created_at: s.created_at,
        }));

        await supabase
          .from('focus_sessions')
          .upsert(sessionsToInsert, { onConflict: 'id' });
      }

      // Sync ship notes
      const unsyncedNotes = localData.ship_notes.filter(n => !n.synced);
      if (unsyncedNotes.length > 0) {
        const notesToInsert = unsyncedNotes.map(n => ({
          id: n.id,
          session_id: n.session_id,
          user_id: user.id,
          note: n.note,
          blocked_reason: n.blocked_reason,
          created_at: n.created_at,
        }));

        await supabase
          .from('ship_notes')
          .upsert(notesToInsert, { onConflict: 'id' });
      }

      // Sync meeting blocks
      const unsyncedBlocks = localData.meeting_blocks.filter(b => !b.synced);
      if (unsyncedBlocks.length > 0) {
        const blocksToInsert = unsyncedBlocks.map(b => ({
          id: b.id,
          user_id: user.id,
          start_at: b.start_at,
          end_at: b.end_at,
          title: b.title,
          created_at: b.created_at,
        }));

        await supabase
          .from('meeting_blocks')
          .upsert(blocksToInsert, { onConflict: 'id' });
      }

      markAsSynced();
      setHasUnsynced(false);
      await loadData();
    } catch (e) {
      console.error('Sync failed:', e);
      alert('Failed to sync data. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, [user, loadData]);

  const filteredSessions = sessions.filter(session => {
    if (filter === 'completed') return !session.interrupted && session.ended_at;
    if (filter === 'interrupted') return session.interrupted;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Session History
          </h1>

          {user && hasUnsynced && isAppSupabaseConfigured() && (
            <button
              onClick={syncToCloud}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync to Cloud
                </>
              )}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'completed', 'interrupted'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No sessions yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              Start a focus session to see your history here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {session.task_title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(session.started_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.interrupted ? (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                        Interrupted
                      </span>
                    ) : session.ended_at ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        Completed
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                        In Progress
                      </span>
                    )}
                    {!session.synced && session.user_id && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        Pending Sync
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDuration(session.duration_sec)}
                  </div>
                  {session.artifact_url && (
                    <a
                      href={session.artifact_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Artifact
                    </a>
                  )}
                </div>

                {session.ship_note && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ship Note
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {session.ship_note.note}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
