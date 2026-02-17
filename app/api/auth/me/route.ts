import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabaseServer } from '@/lib/supabaseServer';

const COOKIE_NAME = 'auth_session';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET or JWT_SECRET');
  }
  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const claims = payload as {
      user_id?: number;
      username?: string;
      fullname?: string;
      role?: string;
      school_id?: number | null;
      email_address?: string;
      contact_no?: string | null;
    };

    if (!claims.user_id || !claims.username) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const supabase = getSupabaseServer();
    let schoolName: string | null = null;
    if (claims.school_id != null) {
      const { data: school } = await supabase
        .from('school')
        .select('school_name')
        .eq('school_id', claims.school_id)
        .maybeSingle();
      schoolName = (school as { school_name?: string | null } | null)?.school_name ?? null;
    }

    return NextResponse.json({
      user: {
        id: String(claims.user_id),
        user_id: claims.user_id,
        username: claims.username,
        fullname: claims.fullname ?? '',
        role: claims.role ?? 'user',
        school_id: claims.school_id ?? null,
        email: claims.email_address ?? claims.username,
        email_address: claims.email_address ?? null,
        contact_no: claims.contact_no ?? null,
      },
      schoolId: claims.school_id ?? null,
      schoolName,
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
