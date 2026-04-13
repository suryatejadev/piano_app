import { supabase } from './supabase';

export interface SessionRecord {
  section: string;
  correct_count: number;
  wrong_count: number;
  duration_seconds: number;
}

export const saveSession = async (userId: string, record: SessionRecord): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('practice_sessions').insert({
    user_id: userId,
    section: record.section,
    correct_count: record.correct_count,
    wrong_count: record.wrong_count,
    duration_seconds: record.duration_seconds,
  });
  if (error) console.error('Failed to save session:', error.message);
};

export interface DayActivity {
  date: string; // YYYY-MM-DD
  practiced: boolean;
}

export const getPracticeHeatmap = async (userId: string): Promise<DayActivity[]> => {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const sinceStr = since.toISOString().split('T')[0];

  if (!supabase) return [];
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('practiced_at')
    .eq('user_id', userId)
    .gte('practiced_at', sinceStr);

  if (error || !data) return [];

  const days = new Set(data.map(r => r.practiced_at));
  const result: DayActivity[] = [];
  const d = new Date(sinceStr);
  const today = new Date().toISOString().split('T')[0];
  while (d.toISOString().split('T')[0] <= today) {
    const ds = d.toISOString().split('T')[0];
    result.push({ date: ds, practiced: days.has(ds) });
    d.setDate(d.getDate() + 1);
  }
  return result;
};

export interface DailyStats {
  date: string;
  correct: number;
  wrong: number;
}

export const getSectionStats = async (
  userId: string,
  section: string,
  range: 'month' | 'all',
): Promise<DailyStats[]> => {
  if (!supabase) return [];
  let query = supabase
    .from('practice_sessions')
    .select('practiced_at, correct_count, wrong_count')
    .eq('user_id', userId)
    .eq('section', section)
    .order('practiced_at', { ascending: true });

  if (range === 'month') {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    query = query.gte('practiced_at', since.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const byDay = new Map<string, { correct: number; wrong: number }>();
  for (const row of data) {
    const existing = byDay.get(row.practiced_at) ?? { correct: 0, wrong: 0 };
    existing.correct += row.correct_count;
    existing.wrong += row.wrong_count;
    byDay.set(row.practiced_at, existing);
  }

  return Array.from(byDay.entries()).map(([date, { correct, wrong }]) => ({
    date,
    correct,
    wrong,
  }));
};

export const SECTIONS = [
  { value: 'sight-reading', label: 'Sight Reading' },
  { value: 'flash-cards', label: 'Flash Cards' },
  { value: 'chords', label: 'Chords' },
  { value: 'ear-training', label: 'Ear Training' },
  { value: 'scales', label: 'Scales' },
  { value: 'rhythm', label: 'Rhythm' },
];
