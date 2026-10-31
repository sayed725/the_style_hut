import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { id: idStr } = await params;
  const id = Number(idStr);

  await query('UPDATE products SET active = 1 WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
