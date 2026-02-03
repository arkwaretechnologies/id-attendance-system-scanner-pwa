import * as db from './db';
import * as supabase from './supabase';
import { sendAttendanceSms } from './sms';

const REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY_MS = 1500;

export async function refreshStudentCache(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= REFRESH_RETRIES; attempt++) {
    try {
      const profiles = await supabase.fetchAllStudentsWithRfid();
      await db.putStudents(profiles);
      return;
    } catch (e) {
      lastError = e;
      if (attempt < REFRESH_RETRIES) {
        await new Promise((r) => setTimeout(r, REFRESH_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

export async function flushQueue(): Promise<{ processed: number; failed: number }> {
  const items = await db.getUnsyncedQueue();
  let processed = 0;
  let failed = 0;
  for (const item of items) {
    const profile = await db.getStudentByRfId(item.rfid_tag);
    if (!profile) {
      failed += 1;
      continue;
    }
    try {
      if (item.action === 'time_in') {
        const { error } = await supabase.recordTimeIn({
          learner_ref_number: profile.learner_reference_number ?? null,
          rfid_tag: profile.rfid_tag ?? null,
          grade_level: profile.grade_level ?? null,
          school_year: profile.school_year ?? '2024-2025',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.recordTimeOut({
          learner_ref_number: profile.learner_reference_number ?? null,
        });
        if (error) throw error;
      }
      await sendAttendanceSms({
        studentData: {
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          guardian_contact_number: profile.guardian_contact_number ?? null,
        },
        action: item.action,
        timestamp: item.timestamp_iso,
      });
      await db.deleteQueueItem(item.id);
      processed += 1;
    } catch {
      failed += 1;
    }
  }
  return { processed, failed };
}

export async function onOnline(): Promise<void> {
  try {
    await refreshStudentCache();
  } catch (e) {
    console.error('Sync on online (cache refresh failed):', e);
  }
  try {
    await flushQueue();
  } catch (e) {
    console.error('Sync on online (queue flush failed):', e);
  }
}
