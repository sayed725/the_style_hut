import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { id: idStr } = await params;
  const id = Number(idStr);

  try {
    const existingRes = await query('SELECT * FROM products WHERE id = $1', [id]);
    const existing = existingRes.rows[0];
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const b = await req.json();
    const name = String(b.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const sku = String(b.sku ?? existing.sku).trim().slice(0, 40);
    const category = String(b.category ?? existing.category).trim().slice(0, 60);
    const size = String(b.size ?? existing.size).trim().slice(0, 30);
    const color = String(b.color ?? existing.color).trim().slice(0, 30);
    const purchase_price = b.purchase_price !== undefined ? Math.max(0, Number(b.purchase_price) || 0) : existing.purchase_price;
    const selling_price = b.selling_price !== undefined ? Math.max(0, Number(b.selling_price) || 0) : existing.selling_price;
    const quantity = b.quantity !== undefined ? Math.max(0, parseInt(b.quantity, 10) || 0) : existing.quantity;
    const low_stock = b.low_stock !== undefined ? Math.max(0, parseInt(b.low_stock, 10) || 0) : existing.low_stock;

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE products SET sku=$1, name=$2, category=$3, size=$4, color=$5,
         purchase_price=$6, selling_price=$7, quantity=$8, low_stock=$9 WHERE id=$10`,
        [sku, name, category, size, color, purchase_price, selling_price, quantity, low_stock, id]
      );
      if (quantity !== existing.quantity) {
        await client.query(
          'INSERT INTO stock_log (product_id, change, unit_cost, reason) VALUES ($1, $2, $3, $4)',
          [id, quantity - existing.quantity, null, 'manual adjustment']
        );
      }
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { id: idStr } = await params;
  const id = Number(idStr);

  const checkP = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (!checkP.rows[0]) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const countSales = await query('SELECT COUNT(*)::int AS n FROM sales WHERE product_id = $1', [id]);
  if (countSales.rows[0]?.n > 0) {
    await query('UPDATE products SET active = 0 WHERE id = $1', [id]);
    return NextResponse.json({ archived: true });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM stock_log WHERE product_id = $1', [id]);
    await client.query('DELETE FROM products WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return NextResponse.json({ deleted: true });
}
