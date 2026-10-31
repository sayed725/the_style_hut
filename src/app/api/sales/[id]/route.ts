import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { id: idStr } = await params;
  const id = Number(idStr);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const sRes = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [id]);
    const s = sRes.rows[0];
    if (!s) throw new Error('Sale not found');

    await client.query('UPDATE products SET quantity = quantity + $1 WHERE id = $2', [s.quantity, s.product_id]);
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}
