import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isAll = searchParams.get('all') === '1';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = isAll ? 1000 : Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
  const offset = (page - 1) * limit;
  const search = String(searchParams.get('q') || searchParams.get('search') || '').trim();
  const categoryRaw = String(searchParams.get('category') || '').trim();
  const category = categoryRaw.toLowerCase() === 'all' || !categoryRaw ? 'all' : categoryRaw;
  const onlyInStock = searchParams.get('in_stock') === '1';
  const sort = String(searchParams.get('sort') || 'newest').toLowerCase();

  let orderBy = 'id DESC';
  if (sort === 'name_asc') {
    orderBy = 'name ASC, id DESC';
  } else if (sort === 'name_desc') {
    orderBy = 'name DESC, id DESC';
  } else if (sort === 'stock_desc') {
    orderBy = 'quantity DESC, id DESC';
  } else if (sort === 'stock_asc') {
    orderBy = 'quantity ASC, id DESC';
  } else if (sort === 'price_desc') {
    orderBy = 'selling_price DESC, id DESC';
  } else if (sort === 'price_asc') {
    orderBy = 'selling_price ASC, id DESC';
  } else if (sort === 'oldest') {
    orderBy = 'id ASC';
  }

  let countSql = `SELECT COUNT(*)::int AS total, COALESCE(SUM(quantity)::int, 0) AS total_pieces FROM products WHERE active = 1`;
  let dataSql = `SELECT * FROM products WHERE active = 1`;
  const filterParams: any[] = [];

  if (onlyInStock) {
    countSql += ` AND quantity > 0`;
    dataSql += ` AND quantity > 0`;
  }

  if (search) {
    filterParams.push(`%${search}%`);
    const filter = ` AND (name ILIKE $${filterParams.length} OR sku ILIKE $${filterParams.length} OR category ILIKE $${filterParams.length} OR size ILIKE $${filterParams.length} OR color ILIKE $${filterParams.length})`;
    countSql += filter;
    dataSql += filter;
  }

  if (category !== 'all') {
    filterParams.push(category);
    const filter = ` AND LOWER(TRIM(COALESCE(category, ''))) = LOWER(TRIM($${filterParams.length}))`;
    countSql += filter;
    dataSql += filter;
  }

  const countParams = [...filterParams];

  dataSql += ` ORDER BY ${orderBy}`;

  const dataParams = [...filterParams];
  if (!isAll) {
    dataSql += ` LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
    dataParams.push(limit, offset);
  }

  const [countRes, dataRes, categoriesRes, overallRes] = await Promise.all([
    query(countSql, countParams),
    query(dataSql, dataParams),
    query(`SELECT DISTINCT TRIM(category) AS category FROM products WHERE active = 1 AND category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC`),
    query(`SELECT COUNT(DISTINCT TRIM(category))::int AS overall_categories, COALESCE(SUM(quantity)::int, 0) AS overall_pieces FROM products WHERE active = 1`),
  ]);

  const total = countRes.rows[0]?.total || 0;
  const totalPieces = countRes.rows[0]?.total_pieces || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const categories = categoriesRes.rows.map((r: any) => r.category.trim());

  return NextResponse.json({
    products: dataRes.rows,
    categories,
    total,
    totalPieces,
    overallCategoriesCount: overallRes.rows[0]?.overall_categories || 0,
    overallTotalPieces: overallRes.rows[0]?.overall_pieces || 0,
    page,
    totalPages,
    limit,
  });
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
