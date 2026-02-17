import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { getSupabaseServer } from '@/lib/supabaseServer';

const COOKIE_NAME = 'auth_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET or JWT_SECRET');
  }
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      schoolId?: number;
      username?: string;
      password?: string;
    };
    const { schoolId, username, password } = body;

    if (
      schoolId == null ||
      typeof username !== 'string' ||
      !username.trim() ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      return NextResponse.json(
        { error: 'School ID, username, and password are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('user_id, username, password_hash, fullname, role, school_id, email_address, contact_no')
      .eq('username', username.trim())
      .eq('school_id', schoolId)
      .maybeSingle();

    if (fetchError) {
      console.error('Login fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Unable to verify credentials.' },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json(
        { error: 'Invalid school ID, username, or password.' },
        { status: 401 }
      );
    }

    const user = userRow as {
      user_id: number;
      username: string;
      password_hash: string;
      fullname?: string | null;
      role?: string | null;
      school_id?: number | null;
      email_address?: string | null;
      contact_no?: string | null;
    };
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid school ID, username, or password.' },
        { status: 401 }
      );
    }

    const secret = getSecret();
    const token = await new SignJWT({
      user_id: user.user_id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      school_id: user.school_id,
      email_address: user.email_address ?? undefined,
      contact_no: user.contact_no ?? undefined,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.user_id))
      .setIssuedAt()
      .setExpirationTime(`${MAX_AGE}s`)
      .sign(secret);

    let schoolName: string | null = null;
    const sid = user.school_id ?? schoolId;
    if (sid != null) {
      const { data: school } = await supabase
        .from('school')
        .select('school_name')
        .eq('school_id', sid)
        .maybeSingle();
      schoolName = (school as { school_name?: string | null } | null)?.school_name ?? null;
    }

    const res = NextResponse.json({
      user: {
        id: String(user.user_id),
        user_id: user.user_id,
        username: user.username,
        fullname: user.fullname ?? '',
        role: user.role ?? 'user',
        school_id: user.school_id ?? schoolId,
        email: user.email_address ?? user.username,
        email_address: user.email_address ?? null,
        contact_no: user.contact_no ?? null,
      },
      schoolId: user.school_id ?? schoolId,
      schoolName,
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'An error occurred during sign in.' },
      { status: 500 }
    );
  }
}
