import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { addDays, monthStart, todayStr, weekStart } from '@/lib/format';

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
  const from = searchParams.get('from') || monthStart(t);
  const to = searchParams.get('to') || t;
  const group = ['day', 'week', 'month'].includes(searchParams.get('group') || '')
    ? (searchParams.get('group') as string)
    : 'day';

  const [daysRes, summaryRes, productsRes] = await Promise.all([
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
              COALESCE(SUM(quantity)::int, 0) AS items,
              COUNT(*)::int AS sales
       FROM sales WHERE sold_date BETWEEN $1 AND $2`,
      [from, to]
    ),
    query(
      `SELECT product_id AS id,
              MAX(product_name) AS name,
              SUM(quantity)::int AS qty,
              ROUND(SUM(quantity * unit_price)::numeric, 2) AS revenue,
              ROUND(SUM(quantity * unit_cost)::numeric, 2)  AS cost,
              ROUND(SUM(quantity * (unit_price - unit_cost))::numeric, 2) AS profit
       FROM sales WHERE sold_date BETWEEN $1 AND $2 GROUP BY product_id ORDER BY profit DESC`,
      [from, to]
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

  return NextResponse.json({
    from,
    to,
    group,
    summary: withProfit(summaryRes.rows[0]),
    series,
    products: productsRes.rows.map((p: any) => ({
      ...p,
      margin: p.revenue > 0 ? r2((p.profit / p.revenue) * 100) : 0,
    })),
  });
}
