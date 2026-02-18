import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import type { ScanSchedule } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('school_id');
    const schoolId = schoolIdParam != null && schoolIdParam !== '' ? Number(schoolIdParam) : NaN;

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return NextResponse.json(
        { schedules: [], error: 'Valid school_id query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('scan_schedule')
      .select('id, name, time_in, time_out, school_id, created_at')
      .eq('school_id', schoolId)
      .order('time_in', { ascending: true });

    if (error) {
      return NextResponse.json(
        { schedules: [], error: error.message },
        { status: 422 }
      );
    }

    return NextResponse.json({
      schedules: (data ?? []) as ScanSchedule[],
      error: null,
    });
  } catch (e) {
    console.error('Scan schedule API error:', e);
    return NextResponse.json(
      {
        schedules: [],
        error: e instanceof Error ? e.message : 'Server error',
      },
      { status: 500 }
    );
  }
}
