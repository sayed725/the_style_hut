import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const active = searchParams.get('archived') === '1' ? 0 : 1;

  const { rows } = await query(
    'SELECT * FROM products WHERE active = $1 ORDER BY name ASC, size, color',
    [active]
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  try {
    const b = await req.json();
    const name = String(b.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const sku = String(b.sku || '').trim().slice(0, 40);
    const category = String(b.category || '').trim().slice(0, 60);
    const size = String(b.size || '').trim().slice(0, 30);
    const color = String(b.color || '').trim().slice(0, 30);
    const purchase_price = Math.max(0, Number(b.purchase_price) || 0);
    const selling_price = Math.max(0, Number(b.selling_price) || 0);
    const quantity = Math.max(0, parseInt(b.quantity, 10) || 0);
    const low_stock = Math.max(0, parseInt(b.low_stock, 10) || 3);

    const client = await getClient();
    let newId: number;

    try {
      await client.query('BEGIN');
      const insert = await client.query(
        `INSERT INTO products (sku, name, category, size, color, purchase_price, selling_price, quantity, low_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [sku, name, category, size, color, purchase_price, selling_price, quantity, low_stock]
      );
      newId = insert.rows[0].id;

      if (quantity > 0) {
        await client.query(
          'INSERT INTO stock_log (product_id, change, unit_cost, reason) VALUES ($1, $2, $3, $4)',
          [newId, quantity, purchase_price, 'initial stock']
        );
      }
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query('SELECT * FROM products WHERE id = $1', [newId]);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
