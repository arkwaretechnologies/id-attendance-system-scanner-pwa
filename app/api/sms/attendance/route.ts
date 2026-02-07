import { NextResponse } from 'next/server';
import { sendSmsServer } from '@/lib/semaphoreServer';
import { parseTimestampToDate, formatTimeManilaServer, formatDateManilaServer } from '@/lib/manilaTime';

const DEFAULT_SENDER = 'ARKWARE';
const SMS_BACKEND_URL = process.env.SMS_BACKEND_URL?.trim() || '';

/** Format the exact saved time in Manila (UTC+8) for the SMS body. Uses server-safe formatters so 04:34Z shows as 12:34 PM. */
function createAttendanceMessage(
  studentData: { first_name: string; last_name: string },
  action: 'time_in' | 'time_out',
  savedTime: Date
): string {
  const timeStr = formatTimeManilaServer(savedTime);
  const dateStr = formatDateManilaServer(savedTime);
  const actionText = action === 'time_in' ? 'arrived at' : 'left';
  return `Hello! Your child ${studentData.first_name} ${studentData.last_name} has ${actionText} school at ${timeStr} on ${dateStr}.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentData?: {
        first_name: string;
        last_name: string;
        guardian_contact_number: string | null;
      };
      action?: 'time_in' | 'time_out';
      timestamp?: string;
    };
    const { studentData, action, timestamp: ts } = body;

    if (!studentData?.guardian_contact_number) {
      return NextResponse.json(
        { success: false, error: 'studentData.guardian_contact_number is required' },
        { status: 400 }
      );
    }
    if (!action || (action !== 'time_in' && action !== 'time_out')) {
      return NextResponse.json(
        { success: false, error: 'action must be time_in or time_out' },
        { status: 400 }
      );
    }
    if (!ts || typeof ts !== 'string' || !ts.trim()) {
      return NextResponse.json(
        { success: false, error: 'timestamp is required (use the exact time saved to the database)' },
        { status: 400 }
      );
    }

    if (SMS_BACKEND_URL) {
      const backendUrl = SMS_BACKEND_URL.endsWith('/attendance')
        ? SMS_BACKEND_URL
        : `${SMS_BACKEND_URL.replace(/\/$/, '')}/api/sms/attendance`;
      // console.log('[SMS attendance] proxying to backend:', { url: backendUrl, action, timestamp: ts });
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      // console.log('[SMS attendance] backend response:', res.status, data);
      return NextResponse.json(data, { status: res.status });
    }

    const savedTime = parseTimestampToDate(ts.trim());
    const message = createAttendanceMessage(studentData, action, savedTime);

    // console.log('[SMS attendance] payload:', {
    //   action,
    //   timestamp: ts.trim(),
    //   savedTimeISO: savedTime.toISOString(),
    //   student: `${studentData.first_name} ${studentData.last_name}`,
    //   to: `****${studentData.guardian_contact_number.slice(-4)}`,
    // });
    // console.log('[SMS attendance] message sent:', message);

    const result = await sendSmsServer(
      studentData.guardian_contact_number,
      message,
      DEFAULT_SENDER
    );

    // console.log('[SMS attendance] result:', result.success ? 'ok' : result);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('SMS attendance API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
