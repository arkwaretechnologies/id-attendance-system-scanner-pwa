import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { schoolId?: number | string };
    const raw = body.schoolId != null ? String(body.schoolId).trim() : '';
    const id = raw ? Number(raw) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid school ID (positive number).' },
        { status: 400 }
      );
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('school')
      .select('school_id, school_name')
      .eq('school_id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Unable to verify school.' },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: 'School ID not found. Please check the ID and try again.' },
        { status: 404 }
      );
    }
    const row = data as { school_id?: number; school_name?: string | null };
    return NextResponse.json({
      school_id: row.school_id,
      school_name: row.school_name ?? null,
    });
  } catch (e) {
    console.error('School validate error:', e);
    return NextResponse.json(
      { error: 'An error occurred.' },
      { status: 500 }
    );
  }
}
