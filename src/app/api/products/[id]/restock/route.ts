import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { id: idStr } = await params;
  const id = Number(idStr);

  try {
    const b = await req.json();
    const add = parseInt(b.quantity, 10);
    if (!add || add < 1) return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });

    const hasCost = b.unit_cost !== undefined && b.unit_cost !== '';
    const cost = hasCost ? Number(b.unit_cost) : null;

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const pRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
      const p = pRes.rows[0];
      if (!p) throw new Error('Product not found');

      const newQty = p.quantity + add;
      if (cost !== null) {
        // Weighted average purchase price
        const avg = Math.round(((p.quantity * p.purchase_price + add * cost) / newQty + Number.EPSILON) * 100) / 100;
        await client.query('UPDATE products SET quantity = $1, purchase_price = $2 WHERE id = $3', [newQty, avg, id]);
      } else {
        await client.query('UPDATE products SET quantity = $1 WHERE id = $2', [newQty, id]);
      }

      await client.query(
        'INSERT INTO stock_log (product_id, change, unit_cost, reason) VALUES ($1, $2, $3, $4)',
        [id, add, cost, 'restock']
      );
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
