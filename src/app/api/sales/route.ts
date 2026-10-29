import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';
import { addDays, todayStr } from '@/lib/format';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const today = todayStr(tz);
  const from = searchParams.get('from') || addDays(today, -29);
  const to = searchParams.get('to') || today;
  const search = String(searchParams.get('q') || '').trim().slice(0, 60);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '300', 10), 1), 5000);

  const sql = `
    SELECT *,
           ROUND((quantity * unit_price)::numeric, 2) AS revenue,
           ROUND((quantity * (unit_price - unit_cost))::numeric, 2) AS profit
    FROM sales
    WHERE sold_date BETWEEN $1 AND $2
      AND ($3 = '' OR product_name ILIKE '%' || $4 || '%')
    ORDER BY sold_date DESC, id DESC LIMIT $5`;

  const { rows } = await query(sql, [from, to, search, search, limit]);
  return NextResponse.json({ from, to, rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  try {
    const b = await req.json();
    const productId = parseInt(b.product_id, 10);
    const qtySold = parseInt(b.quantity, 10);
    const price = Number(b.unit_price);
    const tz = process.env.STORE_TZ || 'Asia/Dhaka';
    const today = todayStr(tz);
    const date = b.sold_date && b.sold_date <= today ? b.sold_date : today;
    const note = String(b.note || '').trim().slice(0, 200);

    if (!productId || qtySold < 1 || isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid sale details' }, { status: 400 });
    }

    const client = await getClient();
    let saleId: number;
    let stockLeft: number;

    try {
      await client.query('BEGIN');
      const pRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
      const p = pRes.rows[0];
      if (!p || !p.active) throw new Error('Product not found');
      if (p.quantity < qtySold) throw new Error(`Only ${p.quantity} in stock for "${p.name}"`);

      stockLeft = p.quantity - qtySold;
      await client.query('UPDATE products SET quantity = $1 WHERE id = $2', [stockLeft, productId]);

      const prodDisplayName = p.name + (p.size ? ` (${p.size}${p.color ? ', ' + p.color : ''})` : p.color ? ` (${p.color})` : '');
      const insert = await client.query(
        `INSERT INTO sales (product_id, product_name, quantity, unit_cost, unit_price, sold_at, sold_date, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [productId, prodDisplayName, qtySold, p.purchase_price, price, new Date().toISOString(), date, note]
      );
      saleId = insert.rows[0].id;
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query('SELECT * FROM sales WHERE id = $1', [saleId]);
    return NextResponse.json({ ...rows[0], stock_left: stockLeft }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
