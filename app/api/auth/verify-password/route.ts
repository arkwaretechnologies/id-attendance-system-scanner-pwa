import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getSupabaseServer } from '@/lib/supabaseServer';

const COOKIE_NAME = 'auth_session';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET or JWT_SECRET');
  }
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ verified: false, error: 'Not authenticated' }, { status: 401 });
    }

    const secret = getSecret();
    let claims: { user_id?: number; username?: string; school_id?: number | null };
    try {
      const { payload } = await jwtVerify(token, secret);
      claims = payload as { user_id?: number; username?: string; school_id?: number | null };
    } catch {
      return NextResponse.json({ verified: false, error: 'Invalid session' }, { status: 401 });
    }

    const body = (await request.json()) as { password?: string };
    const { password } = body;
    if (!password || typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ verified: false, error: 'Password is required' }, { status: 400 });
    }

    if (!claims.user_id || !claims.username || claims.school_id == null) {
      return NextResponse.json({ verified: false, error: 'Invalid session data' }, { status: 401 });
    }

    const supabase = getSupabaseServer();
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('user_id', claims.user_id)
      .eq('username', claims.username)
      .eq('school_id', claims.school_id)
      .maybeSingle();

    if (fetchError || !userRow) {
      return NextResponse.json({ verified: false, error: 'User not found' }, { status: 404 });
    }

    const user = userRow as { password_hash: string };
    const match = await bcrypt.compare(password, user.password_hash);
    return NextResponse.json({ verified: match, error: match ? null : 'Incorrect password' });
  } catch (err) {
    console.error('Verify password error:', err);
    return NextResponse.json(
      { verified: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
