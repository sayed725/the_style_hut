import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { addDays, monthStart, todayStr, weekStart } from '@/lib/format';

export const dynamic = 'force-dynamic';

const r2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const withProfit = (s: any) => {
  const rev = Number(s?.revenue) || 0;
  const cost = Number(s?.cost) || 0;
  const profit = r2(rev - cost);
  const margin = rev > 0 ? r2((profit / rev) * 100) : 0;
  return {
    ...s,
    revenue: rev,
    cost,
    profit,
    margin,
  };
};

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const t = todayStr(tz);
  const fromRaw = searchParams.get('from') || monthStart(t);
  const toRaw = searchParams.get('to') || t;
  const from = fromRaw <= toRaw ? fromRaw : toRaw;
  const to = fromRaw <= toRaw ? toRaw : fromRaw;

  const group = ['day', 'week', 'month'].includes(searchParams.get('group') || '')
    ? (searchParams.get('group') as string)
    : 'day';

  // Category search, sort and pagination parameters
  const categorySearch = String(searchParams.get('q') || '').trim().slice(0, 80);
  const sort = String(searchParams.get('sort') || 'profit_desc').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100);
  const offset = (page - 1) * limit;

  let categoryOrderBy = 'profit DESC, category ASC';
  if (sort === 'profit_asc') {
    categoryOrderBy = 'profit ASC, category ASC';
  } else if (sort === 'revenue_desc') {
    categoryOrderBy = 'revenue DESC, category ASC';
  } else if (sort === 'revenue_asc') {
    categoryOrderBy = 'revenue ASC, category ASC';
  } else if (sort === 'qty_desc') {
    categoryOrderBy = 'qty DESC, category ASC';
  } else if (sort === 'qty_asc') {
    categoryOrderBy = 'qty ASC, category ASC';
  } else if (sort === 'margin_desc') {
    categoryOrderBy = 'margin DESC, profit DESC';
  } else if (sort === 'margin_asc') {
    categoryOrderBy = 'margin ASC, profit ASC';
  } else if (sort === 'name_asc') {
    categoryOrderBy = 'category ASC';
  } else if (sort === 'name_desc') {
    categoryOrderBy = 'category DESC';
  }

  const [daysRes, summaryRes, categoriesRes, countRes] = await Promise.all([
    query(
      `SELECT sold_date AS date,
              ROUND(SUM(quantity * unit_price)::numeric, 2) AS revenue,
              ROUND(SUM(quantity * unit_cost)::numeric, 2)  AS cost,
              SUM(quantity)::int AS items,
              COUNT(*)::int AS sales
       FROM sales WHERE sold_date BETWEEN $1 AND $2 GROUP BY sold_date`,
      [from, to]
    ),
    query(
      `SELECT COALESCE(ROUND(SUM(quantity * unit_price)::numeric, 2), 0) AS revenue,
              COALESCE(ROUND(SUM(quantity * unit_cost)::numeric, 2), 0)  AS cost,
              COALESCE(ROUND(SUM(quantity * (unit_price - unit_cost))::numeric, 2), 0) AS profit,
              COALESCE(SUM(quantity)::int, 0) AS items,
              COUNT(*)::int AS sales,
              COALESCE(ROUND(SUM(CASE WHEN payment_method = 'cash' THEN quantity * unit_price ELSE 0 END)::numeric, 2), 0) AS cash_total,
              COALESCE(ROUND(SUM(CASE WHEN payment_method = 'online' THEN quantity * unit_price ELSE 0 END)::numeric, 2), 0) AS online_total,
              COALESCE(ROUND(SUM(CASE WHEN payment_method = 'due' THEN quantity * unit_price ELSE 0 END)::numeric, 2), 0) AS due_total
       FROM sales WHERE sold_date BETWEEN $1 AND $2`,
      [from, to]
    ),
    query(
      `SELECT COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized') AS category,
              COUNT(DISTINCT s.product_id)::int AS products_count,
              SUM(s.quantity)::int AS qty,
              ROUND(SUM(s.quantity * s.unit_price)::numeric, 2) AS revenue,
              ROUND(SUM(s.quantity * s.unit_cost)::numeric, 2)  AS cost,
              ROUND(SUM(s.quantity * (s.unit_price - s.unit_cost))::numeric, 2) AS profit,
              CASE 
                WHEN SUM(s.quantity * s.unit_price) > 0 
                THEN ROUND(((SUM(s.quantity * (s.unit_price - s.unit_cost)) / SUM(s.quantity * s.unit_price)) * 100)::numeric, 2)
                ELSE 0 
              END AS margin
       FROM sales s
       LEFT JOIN products p ON s.product_id = p.id
       WHERE s.sold_date BETWEEN $1 AND $2
         AND ($3 = '' OR COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized') ILIKE '%' || $4 || '%')
       GROUP BY COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized')
       ORDER BY ${categoryOrderBy}
       LIMIT $5 OFFSET $6`,
      [from, to, categorySearch, categorySearch, limit, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM (
         SELECT 1
         FROM sales s
         LEFT JOIN products p ON s.product_id = p.id
         WHERE s.sold_date BETWEEN $1 AND $2
           AND ($3 = '' OR COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized') ILIKE '%' || $4 || '%')
         GROUP BY COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized')
       ) t`,
      [from, to, categorySearch, categorySearch]
    ),
  ]);

  const buckets = new Map<string, any>();
  const weekStartDay = process.env.WEEK_START !== undefined ? Number(process.env.WEEK_START) : 6;
  const keyOf = (d: string) => (group === 'day' ? d : group === 'week' ? weekStart(d, weekStartDay) : d.slice(0, 7));

  for (const r of daysRes.rows) {
    const k = keyOf(r.date);
    const b = buckets.get(k) || { label: k, revenue: 0, cost: 0, items: 0, sales: 0 };
    b.revenue += Number(r.revenue);
    b.cost += Number(r.cost);
    b.items += Number(r.items);
    b.sales += Number(r.sales);
    buckets.set(k, b);
  }

  // Fill empty days if group is day and range is small
  const dayCount = Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1;
  if (group === 'day' && dayCount <= 400) {
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (!buckets.has(d)) buckets.set(d, { label: d, revenue: 0, cost: 0, items: 0, sales: 0 });
    }
  }

  const series = [...buckets.values()]
    .sort((a, b) => (a.label < b.label ? -1 : 1))
    .map((b) => withProfit({ ...b, revenue: r2(b.revenue), cost: r2(b.cost) }));

  const totalCategories = countRes.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCategories / limit));

  return NextResponse.json({
    from,
    to,
    group,
    summary: withProfit(summaryRes.rows[0]),
    series,
    categories: categoriesRes.rows,
    pagination: {
      total: totalCategories,
      totalPages,
      page,
      limit,
    },
  });
}
