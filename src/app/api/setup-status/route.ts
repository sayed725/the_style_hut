import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM users');
    return NextResponse.json({ needsSetup: rows[0]?.n === 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
