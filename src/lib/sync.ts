import * as db from './db';
import * as supabase from './supabase';
import { sendAttendanceSms } from './sms';
import type { QueuedScan } from '../types/database';

const REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY_MS = 1500;

export async function refreshStudentCache(schoolId: string): Promise<void> {
  const sid = schoolId.trim();
  if (!sid) return;
  let lastError: unknown;
  for (let attempt = 1; attempt <= REFRESH_RETRIES; attempt++) {
    try {
      const profiles = await supabase.fetchAllStudentsWithRfid(sid);
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

const FLUSH_RETRY_DELAY_MS = 2000;

async function processOneItem(item: QueuedScan): Promise<boolean> {
  const profile = await db.getStudentByRfId(item.rfid_tag);
  if (!profile) return false;
  const scanTime = item.timestamp_iso;
  if (item.action === 'time_in') {
    const { error } = await supabase.recordTimeIn({
      learner_ref_number: profile.learner_reference_number ?? null,
      rfid_tag: profile.rfid_tag ?? null,
      grade_level: profile.grade_level ?? null,
      school_year: profile.school_year ?? '2024-2025',
      timestamp: scanTime,
    });
    if (error) throw new Error(String(error));
  } else {
    const { error } = await supabase.recordTimeOut({
      learner_ref_number: profile.learner_reference_number ?? null,
      timestamp: scanTime,
    });
    if (error) throw new Error(String(error));
  }
  await sendAttendanceSms({
    studentData: {
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      guardian_contact_number: profile.guardian_contact_number ?? null,
    },
    action: item.action,
    timestamp: scanTime,
  });
  await db.deleteQueueItem(item.id);
  return true;
}

export async function flushQueue(): Promise<{ processed: number; failed: number }> {
  const items = await db.getUnsyncedQueue();
  items.sort((a, b) => new Date(a.timestamp_iso).getTime() - new Date(b.timestamp_iso).getTime());
  let processed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const ok = await processOneItem(item);
      if (ok) processed += 1;
      else failed += 1;
    } catch {
      await new Promise((r) => setTimeout(r, FLUSH_RETRY_DELAY_MS));
      try {
        const ok = await processOneItem(item);
        if (ok) processed += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
  }
  return { processed, failed };
}

export async function onOnline(schoolId: string): Promise<void> {
  try {
    await refreshStudentCache(schoolId);
  } catch (e) {
    console.error('Sync on online (cache refresh failed):', e);
  }
  try {
    await flushQueue();
  } catch (e) {
    console.error('Sync on online (queue flush failed):', e);
  }
}
