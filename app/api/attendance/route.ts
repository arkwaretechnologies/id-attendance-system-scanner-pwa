import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getTodayManilaRange, parseTimestampToDate } from '@/lib/manilaTime';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: 'time_in' | 'time_out';
      learner_reference_number?: string | null;
      rfid_tag?: string | null;
      grade_level?: string | null;
      school_year?: string | null;
      /** ISO timestamp from client (scanner device) for time_in/time_out; uses local machine time when provided. */
      timestamp?: string | null;
    };
    const { action, learner_reference_number, rfid_tag, grade_level, school_year, timestamp: clientTimestamp } = body;

    if (!action || (action !== 'time_in' && action !== 'time_out')) {
      return NextResponse.json(
        { data: null, error: 'action must be time_in or time_out' },
        { status: 400 }
      );
    }
    if (!learner_reference_number?.trim()) {
      return NextResponse.json(
        { data: null, error: 'learner_reference_number is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const timeValue =
      clientTimestamp?.trim() ? parseTimestampToDate(clientTimestamp.trim()).toISOString() : new Date().toISOString();
    const { start, end } = getTodayManilaRange();

    if (action === 'time_in') {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          learner_reference_number: learner_reference_number.trim(),
          rfid_tag: rfid_tag?.trim() ?? null,
          grade_level: grade_level?.trim() ?? null,
          school_year: (school_year?.trim() || '2024-2025') as string,
          time_in: timeValue,
        })
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ data: null, error: error.message }, { status: 422 });
      }
      return NextResponse.json({ data, error: null });
    }

    // time_out: update today's attendance row for this learner
    const { data: rows, error: findError } = await supabase
      .from('attendance')
      .select('id')
      .eq('learner_reference_number', learner_reference_number.trim())
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError) {
      return NextResponse.json({ data: null, error: findError.message }, { status: 422 });
    }
    const row = rows?.[0];
    if (!row?.id) {
      return NextResponse.json(
        { data: null, error: 'No time_in record found for today to update with time_out' },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from('attendance')
      .update({ time_out: timeValue })
      .eq('id', row.id);

    if (updateError) {
      return NextResponse.json({ data: null, error: updateError.message }, { status: 422 });
    }
    return NextResponse.json({ data: { id: row.id }, error: null });
  } catch (e) {
    console.error('Attendance API error:', e);
    return NextResponse.json(
      { data: null, error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
