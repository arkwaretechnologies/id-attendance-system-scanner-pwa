import { NextResponse } from 'next/server';
import { sendSmsServer } from '@/lib/semaphoreServer';

const DEFAULT_SENDER = 'ARKWARE';

function createAttendanceMessage(
  studentData: { first_name: string; last_name: string },
  action: 'time_in' | 'time_out',
  timestamp: Date
): string {
  const timeStr = timestamp.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = timestamp.toLocaleDateString('en-PH');
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

    const timestamp = ts ? new Date(ts) : new Date();
    const message = createAttendanceMessage(studentData, action, timestamp);
    const result = await sendSmsServer(
      studentData.guardian_contact_number,
      message,
      DEFAULT_SENDER
    );

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
