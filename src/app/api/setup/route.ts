import { NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { createSession, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { rows: countRows } = await query('SELECT COUNT(*)::int AS n FROM users');
    if (countRows[0]?.n > 0) {
      return NextResponse.json({ error: 'Setup is already done' }, { status: 403 });
    }

    const body = await req.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'Password must be 8 to 72 characters' }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const client = await getClient();
    let newUserId: number;

    try {
      await client.query('BEGIN');
      const { rows: checkAgain } = await client.query('SELECT COUNT(*)::int AS n FROM users');
      if (checkAgain[0]?.n > 0) {
        throw new Error('Setup is already done');
      }

      const insert = await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
        [username, hash]
      );
      newUserId = insert.rows[0].id;
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: err.message }, { status: 400 });
    } finally {
      client.release();
    }

    await createSession(newUserId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
