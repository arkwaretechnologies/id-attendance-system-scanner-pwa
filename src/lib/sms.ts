export interface SendAttendancePayload {
  studentData: {
    first_name: string;
    last_name: string;
    guardian_contact_number: string | null;
  };
  action: 'time_in' | 'time_out';
  timestamp: string;
}

export async function sendAttendanceSms(payload: SendAttendancePayload): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/sms/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    return { success: res.ok && !!data.success, error: data.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
