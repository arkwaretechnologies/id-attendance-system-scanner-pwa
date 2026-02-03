import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StudentProfile } from '../types/database';

let client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    client = createClient(url, anonKey);
  }
  return client;
}

export async function getStudentByRfId(rfId: string): Promise<{ data: StudentProfile | null; error: unknown }> {
  const { data, error } = await getSupabase()
    .from('student_profile')
    .select('id, rfid_tag, learner_reference_number, first_name, last_name, grade_level, school_year, guardian_contact_number')
    .eq('rfid_tag', rfId.trim())
    .single();
  return { data: data as StudentProfile | null, error };
}

export async function recordTimeIn(args: {
  learner_ref_number: string | null;
  rfid_tag: string | null;
  grade_level: string | null;
  school_year: string;
}): Promise<{ data: unknown; error: unknown }> {
  return getSupabase().rpc('record_time_in', args as never);
}

export async function recordTimeOut(args: { learner_ref_number: string | null }): Promise<{ data: unknown; error: unknown }> {
  return getSupabase().rpc('record_time_out', args as never);
}

export async function fetchAllStudentsWithRfid(): Promise<StudentProfile[]> {
  const { data, error } = await getSupabase()
    .from('student_profile')
    .select('id, rfid_tag, learner_reference_number, first_name, last_name, grade_level, school_year, guardian_contact_number')
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

export async function getTodayAttendance(): Promise<TodayAttendanceRow[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await getSupabase()
    .from('attendance')
    .select('id, learner_reference_number, time_in, time_out, session_number, grade_level, rfid_tag, student_profile (first_name, last_name, rfid_tag, grade_level)')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999Z`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as TodayAttendanceRow[];
}
