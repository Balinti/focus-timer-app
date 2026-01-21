'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FocusSession, MeetingBlock, WeeklyReport } from '@/types';
import { getLocalData } from '@/lib/localStorage';
import { getSupabaseClient, isAppSupabaseConfigured } from '@/lib/supabaseClient';
import {
  formatDateRange,
  getWeekStart,
  getWeekEnd,
  calculateMeetingHours,
  calculateContextSwitches,
} from '@/lib/utils';
import { FREE_TIER_REPORT_WEEKS } from '@/lib/constants';

export default function ReportPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [meetingBlocks, setMeetingBlocks] = useState<MeetingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load local data
      const localData = getLocalData();
      let allSessions = [...localData.sessions];
      let allMeetingBlocks = [...localData.meeting_blocks];

      // If logged in and app Supabase configured, load cloud data
      if (user && isAppSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const [sessionsRes, blocksRes, subRes] = await Promise.all([
              supabase.from('focus_sessions').select('*').eq('user_id', user.id),
              supabase.from('meeting_blocks').select('*').eq('user_id', user.id),
              supabase.from('subscriptions').select('status').eq('user_id', user.id).single(),
            ]);

            if (sessionsRes.data) {
              const cloudIds = new Set(sessionsRes.data.map((s: FocusSession) => s.id));
              const localOnly = allSessions.filter(s => !cloudIds.has(s.id));
              allSessions = [...sessionsRes.data, ...localOnly];
            }

            if (blocksRes.data) {
              const cloudIds = new Set(blocksRes.data.map((b: MeetingBlock) => b.id));
              const localOnly = allMeetingBlocks.filter(b => !cloudIds.has(b.id));
              allMeetingBlocks = [...blocksRes.data, ...localOnly];
            }

            if (subRes.data?.status === 'active') {
              setIsPro(true);
            }
          } catch (e) {
            console.error('Failed to load cloud data:', e);
          }
        }
      }

      setSessions(allSessions);
      setMeetingBlocks(allMeetingBlocks);
      setLoading(false);
    };

    loadData();
  }, [user]);

  const weeklyReports = useMemo(() => {
    const reports: WeeklyReport[] = [];
    const now = new Date();

    // Generate reports for the past several weeks
    for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
      const weekStart = getWeekStart(now);
      weekStart.setDate(weekStart.getDate() - weekOffset * 7);
      const weekEnd = getWeekEnd(weekStart);

      const weekSessions = sessions.filter(s => {
        const date = new Date(s.started_at);
        return date >= weekStart && date <= weekEnd;
      });

      const weekMeetings = meetingBlocks.filter(b => {
        const date = new Date(b.start_at);
        return date >= weekStart && date <= weekEnd;
      });

      const totalFocusMinutes = weekSessions.reduce((acc, s) => acc + Math.floor(s.duration_sec / 60), 0);
      const completedSessions = weekSessions.filter(s => s.ended_at && !s.interrupted).length;
      const interruptedSessions = weekSessions.filter(s => s.interrupted).length;

      reports.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        totalFocusMinutes,
        completedSessions,
        interruptedSessions,
        meetingHours: calculateMeetingHours(weekMeetings),
        contextSwitchIndex: calculateContextSwitches(weekSessions, weekMeetings),
        shipNotesCount: weekSessions.length, // Approximate
      });
    }

    return reports;
  }, [sessions, meetingBlocks]);

  const selectedReport = weeklyReports[selectedWeekOffset];
  const isWeekLocked = !isPro && selectedWeekOffset >= FREE_TIER_REPORT_WEEKS;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Weekly Report
        </h1>

        {/* Week Selector */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setSelectedWeekOffset(prev => Math.min(prev + 1, 11))}
            disabled={selectedWeekOffset >= 11}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <p className="font-semibold text-gray-900 dark:text-white">
              {selectedWeekOffset === 0 ? 'This Week' : selectedWeekOffset === 1 ? 'Last Week' : `${selectedWeekOffset} weeks ago`}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDateRange(selectedReport.weekStart, selectedReport.weekEnd)}
            </p>
          </div>

          <button
            onClick={() => setSelectedWeekOffset(prev => Math.max(prev - 1, 0))}
            disabled={selectedWeekOffset <= 0}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Locked Week Overlay */}
        {isWeekLocked ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Unlock Full History
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Free accounts can view the last {FREE_TIER_REPORT_WEEKS} weeks.
              <br />
              Upgrade to Pro for unlimited report history.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Focus Time"
                value={`${Math.floor(selectedReport.totalFocusMinutes / 60)}h ${selectedReport.totalFocusMinutes % 60}m`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="blue"
              />
              <StatCard
                label="Sessions"
                value={selectedReport.completedSessions.toString()}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="green"
              />
              <StatCard
                label="Meeting Hours"
                value={`${selectedReport.meetingHours.toFixed(1)}h`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                color="orange"
              />
              <StatCard
                label="Context Switches"
                value={selectedReport.contextSwitchIndex.toString()}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
                color="purple"
              />
            </div>

            {/* Detailed Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Focus vs Meetings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Focus vs Meetings
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Focus Time</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.floor(selectedReport.totalFocusMinutes / 60)}h {selectedReport.totalFocusMinutes % 60}m
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${Math.min(100, (selectedReport.totalFocusMinutes / 60 / 40) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Meeting Time</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedReport.meetingHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (selectedReport.meetingHours / 40) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Session Breakdown
                </h3>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {selectedReport.completedSessions}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                  </div>
                  <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {selectedReport.interruptedSessions}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Interrupted</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ROI Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mt-6 text-white">
              <h3 className="font-semibold text-lg mb-4">
                Weekly ROI Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-100 text-sm">Deep Work Ratio</p>
                  <p className="text-2xl font-bold">
                    {selectedReport.meetingHours > 0
                      ? ((selectedReport.totalFocusMinutes / 60 / selectedReport.meetingHours) * 100).toFixed(0)
                      : 100}%
                  </p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Avg Focus/Day</p>
                  <p className="text-2xl font-bold">
                    {(selectedReport.totalFocusMinutes / 5).toFixed(0)}m
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Upgrade Banner for Free Users */}
        {!isPro && selectedWeekOffset < FREE_TIER_REPORT_WEEKS && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Unlock Full Report History
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">
                  Upgrade to Pro for unlimited report history, advanced analytics, and more.
                </p>
                <Link
                  href="/pricing"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className={`p-2 rounded-lg ${colorClasses[color]} w-fit mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
