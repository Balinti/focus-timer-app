'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FocusSession, ShipNote, MeetingBlock } from '@/types';
import {
  addSession,
  updateSession,
  addShipNote,
  addMeetingBlock,
  removeMeetingBlock,
  getLocalData,
  generateId,
  getCompletedSessionsCount,
  getShipNotesCount,
} from '@/lib/localStorage';
import { formatTime, calculateMeetingHours, calculateContextSwitches, getWeekStart, getWeekEnd } from '@/lib/utils';
import { TIMER_DURATIONS } from '@/lib/constants';

type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export default function FocusSessionPage() {
  const { user, signInWithGoogle } = useAuth();

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATIONS.pomodoro);
  const [selectedDuration, setSelectedDuration] = useState<'pomodoro' | 'long' | 'custom'>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState(25);
  const [taskTitle, setTaskTitle] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');

  // Session state
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [showShipNoteModal, setShowShipNoteModal] = useState(false);
  const [shipNote, setShipNote] = useState('');
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Meeting blocks state
  const [meetingBlocks, setMeetingBlocks] = useState<MeetingBlock[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingStart, setMeetingStart] = useState('');
  const [meetingEnd, setMeetingEnd] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Load meeting blocks on mount
  useEffect(() => {
    const data = getLocalData();
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Filter to current week
    const thisWeekBlocks = data.meeting_blocks.filter(block => {
      const blockDate = new Date(block.start_at);
      return blockDate >= weekStart && blockDate <= weekEnd;
    });

    setMeetingBlocks(thisWeekBlocks);
  }, []);

  // Timer effect
  useEffect(() => {
    if (timerState === 'running' && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerState('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState]);

  // Handle timer completion
  useEffect(() => {
    if (timerState === 'completed' && currentSession) {
      handleSessionEnd(false);
    }
  }, [timerState]);

  const getDuration = useCallback(() => {
    if (selectedDuration === 'custom') {
      return customMinutes * 60;
    }
    return TIMER_DURATIONS[selectedDuration];
  }, [selectedDuration, customMinutes]);

  const startSession = useCallback(() => {
    if (!taskTitle.trim()) {
      alert('Please enter a task title');
      return;
    }

    const duration = getDuration();
    const now = new Date();
    sessionStartTimeRef.current = now;

    const session: FocusSession = {
      id: generateId(),
      started_at: now.toISOString(),
      duration_sec: duration,
      task_title: taskTitle.trim(),
      artifact_url: artifactUrl.trim() || undefined,
      interrupted: false,
      created_at: now.toISOString(),
    };

    addSession(session);
    setCurrentSession(session);
    setTimeRemaining(duration);
    setTimerState('running');
  }, [taskTitle, artifactUrl, getDuration]);

  const pauseSession = useCallback(() => {
    setTimerState('paused');
  }, []);

  const resumeSession = useCallback(() => {
    setTimerState('running');
  }, []);

  const stopSession = useCallback(() => {
    if (currentSession) {
      handleSessionEnd(true);
    }
  }, [currentSession]);

  const handleSessionEnd = useCallback((interrupted: boolean) => {
    if (!currentSession || !sessionStartTimeRef.current) return;

    const now = new Date();
    const actualDuration = Math.floor((now.getTime() - sessionStartTimeRef.current.getTime()) / 1000);

    updateSession(currentSession.id, {
      ended_at: now.toISOString(),
      duration_sec: actualDuration,
      interrupted,
    });

    setCurrentSession({
      ...currentSession,
      ended_at: now.toISOString(),
      duration_sec: actualDuration,
      interrupted,
    });

    setTimerState('idle');
    setShowShipNoteModal(true);
  }, [currentSession]);

  const saveShipNote = useCallback(() => {
    if (shipNote.trim().length < 10) {
      alert('Ship note must be at least 10 characters');
      return;
    }

    if (!currentSession) return;

    const note: ShipNote = {
      id: generateId(),
      session_id: currentSession.id,
      note: shipNote.trim(),
      created_at: new Date().toISOString(),
    };

    addShipNote(note);
    setShipNote('');
    setShowShipNoteModal(false);
    setCurrentSession(null);
    setTaskTitle('');
    setArtifactUrl('');
    setTimeRemaining(getDuration());

    // Check if we should show sign-in prompt
    const completedSessions = getCompletedSessionsCount();
    const shipNotesCount = getShipNotesCount();

    if (!user && completedSessions >= 1 && shipNotesCount >= 1) {
      setShowSignInPrompt(true);
    }
  }, [shipNote, currentSession, user, getDuration]);

  const skipShipNote = useCallback(() => {
    setShipNote('');
    setShowShipNoteModal(false);
    setCurrentSession(null);
    setTaskTitle('');
    setArtifactUrl('');
    setTimeRemaining(getDuration());
  }, [getDuration]);

  const handleAddMeetingBlock = useCallback(() => {
    if (!meetingStart || !meetingEnd) {
      alert('Please select start and end times');
      return;
    }

    const start = new Date(meetingStart);
    const end = new Date(meetingEnd);

    if (end <= start) {
      alert('End time must be after start time');
      return;
    }

    const block: MeetingBlock = {
      id: generateId(),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      title: meetingTitle.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    addMeetingBlock(block);
    setMeetingBlocks(prev => [...prev, block]);
    setMeetingTitle('');
    setMeetingStart('');
    setMeetingEnd('');
    setShowMeetingForm(false);
  }, [meetingTitle, meetingStart, meetingEnd]);

  const handleRemoveMeetingBlock = useCallback((blockId: string) => {
    removeMeetingBlock(blockId);
    setMeetingBlocks(prev => prev.filter(b => b.id !== blockId));
  }, []);

  // Calculate fragmentation stats
  const meetingHours = calculateMeetingHours(meetingBlocks);
  const data = getLocalData();
  const contextSwitches = calculateContextSwitches(data.sessions, meetingBlocks);

  const progress = currentSession
    ? ((currentSession.duration_sec - timeRemaining) / currentSession.duration_sec) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Sign In Prompt Banner */}
        {showSignInPrompt && !user && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Save your progress
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Sign in to sync your sessions across devices
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={signInWithGoogle}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Sign in with Google
              </button>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Timer Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Focus Session
            </h2>

            {/* Timer Display */}
            <div className="relative w-64 h-64 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                  className={`text-blue-600 transition-all duration-1000 ${timerState === 'running' ? 'animate-pulse-ring' : ''}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-gray-900 dark:text-white font-mono">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {timerState === 'idle' ? 'Ready' : timerState}
                </span>
              </div>
            </div>

            {/* Timer Controls */}
            {timerState === 'idle' && (
              <>
                {/* Duration Selection */}
                <div className="flex justify-center gap-2 mb-6">
                  <button
                    onClick={() => {
                      setSelectedDuration('pomodoro');
                      setTimeRemaining(TIMER_DURATIONS.pomodoro);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedDuration === 'pomodoro'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    25 min
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDuration('long');
                      setTimeRemaining(TIMER_DURATIONS.long);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedDuration === 'long'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    50 min
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customMinutes}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 25;
                        setCustomMinutes(val);
                        if (selectedDuration === 'custom') {
                          setTimeRemaining(val * 60);
                        }
                      }}
                      onFocus={() => {
                        setSelectedDuration('custom');
                        setTimeRemaining(customMinutes * 60);
                      }}
                      className="w-16 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center"
                    />
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                </div>

                {/* Task Input */}
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="What are you working on?"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="url"
                    placeholder="Artifact URL (optional)"
                    value={artifactUrl}
                    onChange={e => setArtifactUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={startSession}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-lg"
                >
                  Start Focus Session
                </button>
              </>
            )}

            {(timerState === 'running' || timerState === 'paused') && (
              <div className="space-y-4">
                <p className="text-center text-gray-700 dark:text-gray-300 font-medium">
                  {taskTitle}
                </p>

                <div className="flex gap-4">
                  {timerState === 'running' ? (
                    <button
                      onClick={pauseSession}
                      className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeSession}
                      className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={stopSession}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fragmentation Snapshot */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Fragmentation Snapshot
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {meetingHours.toFixed(1)}h
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Hours</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {contextSwitches}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Context Switches/Day</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Meeting Blocks This Week
                </h3>
                <button
                  onClick={() => setShowMeetingForm(!showMeetingForm)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showMeetingForm ? 'Cancel' : '+ Add Meeting'}
                </button>
              </div>

              {showMeetingForm && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Meeting title (optional)"
                    value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={meetingStart}
                      onChange={e => setMeetingStart(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={meetingEnd}
                      onChange={e => setMeetingEnd(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddMeetingBlock}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Add Meeting Block
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {meetingBlocks.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No meeting blocks added yet.
                    <br />
                    Add your meetings to see fragmentation.
                  </p>
                ) : (
                  meetingBlocks.map(block => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {block.title || 'Meeting'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(block.start_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })} - {new Date(block.end_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveMeetingBlock(block.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Coming Soon Features */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Integrations
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Google Calendar - Coming soon</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                  <span className="text-sm">Slack Defense - Coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ship Note Modal */}
      {showShipNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Ship Note
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              What did you accomplish? (30 seconds max)
            </p>

            {currentSession && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentSession.task_title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.floor(currentSession.duration_sec / 60)} minutes
                  {currentSession.interrupted && ' (interrupted)'}
                </p>
              </div>
            )}

            <textarea
              value={shipNote}
              onChange={e => setShipNote(e.target.value)}
              placeholder="I shipped..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={skipShipNote}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={saveShipNote}
                disabled={shipNote.trim().length < 10}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
