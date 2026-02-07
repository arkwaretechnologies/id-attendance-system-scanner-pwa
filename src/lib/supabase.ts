import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StudentProfile } from '../types/database';
import { getTodayManilaRange } from './manilaTime';

let client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    client = createClient(url, anonKey);
  }
  return client;
}

export async function getStudentByRfId(
  rfId: string,
  schoolId: string
): Promise<{ data: StudentProfile | null; error: unknown }> {
  const sid = schoolId.trim();
  if (!sid) return { data: null, error: new Error('schoolId is required') };
  const { data, error } = await getSupabase()
    .from('student_profile')
    .select('id, school_id, rfid_tag, learner_reference_number, first_name, last_name, grade_level, school_year, guardian_contact_number')
    .eq('rfid_tag', rfId.trim())
    .eq('school_id', sid)
    .single();
  return { data: data as StudentProfile | null, error };
}

export async function recordTimeIn(args: {
  learner_ref_number: string | null;
  rfid_tag: string | null;
  grade_level: string | null;
  school_year: string;
  /** ISO timestamp from scanner (local machine time); when provided, saved as time_in. */
  timestamp?: string | null;
}): Promise<{ data: unknown; error: unknown }> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'time_in',
      learner_reference_number: args.learner_ref_number,
      rfid_tag: args.rfid_tag,
      grade_level: args.grade_level,
      school_year: args.school_year,
      ...(args.timestamp != null && args.timestamp !== '' && { timestamp: args.timestamp }),
    }),
  });
  const json = (await res.json()) as { data?: unknown; error?: string | null };
  return { data: json.data ?? null, error: json.error ?? (res.ok ? null : 'Request failed') };
}

export async function recordTimeOut(args: {
  learner_ref_number: string | null;
  /** ISO timestamp from scanner (local machine time); when provided, saved as time_out. */
  timestamp?: string | null;
}): Promise<{ data: unknown; error: unknown }> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'time_out',
      learner_reference_number: args.learner_ref_number,
      ...(args.timestamp != null && args.timestamp !== '' && { timestamp: args.timestamp }),
    }),
  });
  const json = (await res.json()) as { data?: unknown; error?: string | null };
  return { data: json.data ?? null, error: json.error ?? (res.ok ? null : 'Request failed') };
}

export async function fetchAllStudentsWithRfid(schoolId: string): Promise<StudentProfile[]> {
  const sid = schoolId.trim();
  if (!sid) return [];
  const { data, error } = await getSupabase()
    .from('student_profile')
    .select('id, school_id, rfid_tag, learner_reference_number, first_name, last_name, grade_level, school_year, guardian_contact_number')
    .eq('school_id', sid)
    .not('rfid_tag', 'is', null);
  if (error) throw error;
  return (data ?? []) as StudentProfile[];
}

export interface TodayAttendanceRow {
  id?: string;
  learner_reference_number?: string | null;
  time_in?: string | null;
  time_out?: string | null;
  session_number?: number | null;
  grade_level?: string | null;
  rfid_tag?: string | null;
  student_profile?: StudentProfile | null;
}

export async function getTodayAttendance(schoolId: string): Promise<TodayAttendanceRow[]> {
  const { start, end } = getTodayManilaRange();
  const sid = schoolId.trim();
  if (!sid) return [];
  const { data, error } = await getSupabase()
    .from('attendance')
    .select(
      'id, learner_reference_number, time_in, time_out, session_number, grade_level, rfid_tag, student_profile!inner (first_name, last_name, rfid_tag, grade_level, school_id)'
    )
    .gte('created_at', start)
    .lt('created_at', end)
    .eq('student_profile.school_id', sid)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as TodayAttendanceRow[];
}
