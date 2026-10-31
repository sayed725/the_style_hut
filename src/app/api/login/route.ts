import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createSession, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DUMMY_HASH = '$2a$11$e8w.K2gEwE/8W/f4w7vMneKxQcWvC5o.Vb05h8xU6q5IbgzH9494q';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').slice(0, 200);

    const { rows } = username
      ? await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username])
      : { rows: [] };

    const user = rows[0];
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !ok) {
      return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
