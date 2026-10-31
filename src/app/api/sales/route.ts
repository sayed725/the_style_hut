import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';
import { addDays, todayStr } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const today = todayStr(tz);
  const fromRaw = searchParams.get('from') || addDays(today, -29);
  const toRaw = searchParams.get('to') || today;
  // Ensure dates are in chronological order
  const from = fromRaw <= toRaw ? fromRaw : toRaw;
  const to = fromRaw <= toRaw ? toRaw : fromRaw;

  const search = String(searchParams.get('q') || '').trim().slice(0, 80);
  const paymentMethod = String(searchParams.get('payment_method') || 'all').toLowerCase();
  const categoryParam = String(searchParams.get('category') || 'all').trim();
  const category = categoryParam.toLowerCase() === 'all' || !categoryParam ? 'all' : categoryParam;
  const sort = String(searchParams.get('sort') || 'date_desc').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100);
  const offset = (page - 1) * limit;

  const validMethods = ['cash', 'online', 'due'];
  const methodFilter = validMethods.includes(paymentMethod) ? paymentMethod : 'all';

  let orderBy = 's.sold_date DESC, s.sold_at DESC NULLS LAST, s.id DESC';
  if (sort === 'date_asc') {
    orderBy = 's.sold_date ASC, s.sold_at ASC NULLS LAST, s.id ASC';
  } else if (sort === 'revenue_desc') {
    orderBy = '(s.quantity * s.unit_price) DESC, s.sold_date DESC, s.id DESC';
  } else if (sort === 'revenue_asc') {
    orderBy = '(s.quantity * s.unit_price) ASC, s.sold_date DESC, s.id DESC';
  } else if (sort === 'profit_desc') {
    orderBy = '(s.quantity * (s.unit_price - s.unit_cost)) DESC, s.sold_date DESC, s.id DESC';
  } else if (sort === 'profit_asc') {
    orderBy = '(s.quantity * (s.unit_price - s.unit_cost)) ASC, s.sold_date DESC, s.id DESC';
  } else if (sort === 'payment_method') {
    orderBy = 's.payment_method ASC, s.sold_date DESC, s.id DESC';
  }

  const countSql = `
    SELECT 
      COUNT(*)::int AS total,
      COALESCE(SUM(s.quantity)::int, 0) AS total_items,
      COALESCE(ROUND(SUM(s.quantity * s.unit_price)::numeric, 2), 0) AS total_revenue,
      COALESCE(ROUND(SUM(s.quantity * (s.unit_price - s.unit_cost))::numeric, 2), 0) AS total_profit,
      COALESCE(ROUND(SUM(CASE WHEN s.payment_method = 'cash' THEN s.quantity * s.unit_price ELSE 0 END)::numeric, 2), 0) AS cash_total,
      COALESCE(ROUND(SUM(CASE WHEN s.payment_method = 'online' THEN s.quantity * s.unit_price ELSE 0 END)::numeric, 2), 0) AS online_total,
      COALESCE(ROUND(SUM(CASE WHEN s.payment_method = 'due' THEN s.quantity * s.unit_price ELSE 0 END)::numeric, 2), 0) AS due_total
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.sold_date BETWEEN $1 AND $2
      AND (
        $3 = '' 
        OR s.product_name ILIKE '%' || $4 || '%' 
        OR COALESCE(s.note, '') ILIKE '%' || $4 || '%' 
        OR COALESCE(p.category, '') ILIKE '%' || $4 || '%'
      )
      AND ($5 = 'all' OR s.payment_method = $5)
      AND ($6 = 'all' OR LOWER(TRIM(COALESCE(p.category, ''))) = LOWER(TRIM($6)))`;

  const dataSql = `
    SELECT s.*,
           COALESCE(p.category, '') AS category,
           ROUND((s.quantity * s.unit_price)::numeric, 2) AS revenue,
           ROUND((s.quantity * (s.unit_price - s.unit_cost))::numeric, 2) AS profit
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.sold_date BETWEEN $1 AND $2
      AND (
        $3 = '' 
        OR s.product_name ILIKE '%' || $4 || '%' 
        OR COALESCE(s.note, '') ILIKE '%' || $4 || '%' 
        OR COALESCE(p.category, '') ILIKE '%' || $4 || '%'
      )
      AND ($5 = 'all' OR s.payment_method = $5)
      AND ($6 = 'all' OR LOWER(TRIM(COALESCE(p.category, ''))) = LOWER(TRIM($6)))
    ORDER BY ${orderBy} LIMIT $7 OFFSET $8`;

  const [dataRes, countRes, catRes] = await Promise.all([
    query(dataSql, [from, to, search, search, methodFilter, category, limit, offset]),
    query(countSql, [from, to, search, search, methodFilter, category]),
    query(`SELECT DISTINCT TRIM(category) AS category FROM products WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY TRIM(category) ASC`),
  ]);

  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const categories = catRes.rows.map((r: any) => r.category.trim());

  return NextResponse.json({
    from,
    to,
    rows: dataRes.rows,
    categories,
    total,
    totalPages,
    page,
    limit,
    summary: {
      totalSales: total,
      totalItems: countRes.rows[0]?.total_items || 0,
      totalRevenue: countRes.rows[0]?.total_revenue || 0,
      totalProfit: countRes.rows[0]?.total_profit || 0,
      cashTotal: countRes.rows[0]?.cash_total || 0,
      onlineTotal: countRes.rows[0]?.online_total || 0,
      dueTotal: countRes.rows[0]?.due_total || 0,
    },
  });
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
    const rawMethod = String(b.payment_method || '').toLowerCase();
    const paymentMethod = ['cash', 'online', 'due'].includes(rawMethod) ? rawMethod : 'cash';

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
        `INSERT INTO sales (product_id, product_name, quantity, unit_cost, unit_price, sold_at, sold_date, note, payment_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [productId, prodDisplayName, qtySold, p.purchase_price, price, new Date().toISOString(), date, note, paymentMethod]
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
