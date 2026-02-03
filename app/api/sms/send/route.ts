import { NextResponse } from 'next/server';
import { sendSmsServer } from '@/lib/semaphoreServer';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phoneNumber?: string;
      message?: string;
      senderName?: string | null;
    };
    const { phoneNumber, message, senderName } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber and message are required' },
        { status: 400 }
      );
    }

    const result = await sendSmsServer(
      phoneNumber,
      message,
      senderName ?? undefined
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('SMS send API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
