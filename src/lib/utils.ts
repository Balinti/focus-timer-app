// Utility functions

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function calculateMeetingHours(
  meetingBlocks: { start_at: string; end_at: string }[]
): number {
  let totalMinutes = 0;
  for (const block of meetingBlocks) {
    const start = new Date(block.start_at);
    const end = new Date(block.end_at);
    totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
  }
  return totalMinutes / 60;
}

export function calculateContextSwitches(
  sessions: { started_at: string }[],
  meetingBlocks: { start_at: string }[]
): number {
  // Simple heuristic: count the number of meetings + sessions per day
  const dayMap = new Map<string, number>();

  for (const session of sessions) {
    const day = new Date(session.started_at).toDateString();
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  for (const block of meetingBlocks) {
    const day = new Date(block.start_at).toDateString();
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  // Average switches per day
  if (dayMap.size === 0) return 0;
  let total = 0;
  dayMap.forEach((count) => {
    total += count;
  });
  return Math.round((total / dayMap.size) * 10) / 10;
}
