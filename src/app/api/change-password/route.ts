import { NextResponse } from 'next/server';
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }

    const body = await req.json();
    const current = String(body.current || '').slice(0, 200);
    const next = String(body.next || '');

    if (next.length < 8 || next.length > 72) {
      return NextResponse.json({ error: 'Password must be 8 to 72 characters' }, { status: 400 });
    }

    const { rows } = await query('SELECT * FROM users WHERE id = $1', [session.userId]);
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const okOld = await verifyPassword(current, user.password_hash);
    if (!okOld) {
      return NextResponse.json({ error: 'Current password is wrong' }, { status: 400 });
    }

    const newHash = await hashPassword(next);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    await query('DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2', [user.id, session.hash]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
