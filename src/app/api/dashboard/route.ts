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
    revenue: rev,
    cost,
    items: Number(s?.items) || 0,
    sales: Number(s?.sales) || 0,
    profit,
    margin,
  };
};

async function getSummary(from: string, to: string) {
  const sql = `
    SELECT COALESCE(ROUND(SUM(quantity * unit_price)::numeric, 2), 0) AS revenue,
           COALESCE(ROUND(SUM(quantity * unit_cost)::numeric, 2), 0)  AS cost,
           COALESCE(SUM(quantity)::int, 0) AS items,
           COUNT(*)::int AS sales
    FROM sales WHERE sold_date BETWEEN $1 AND $2`;
  const { rows } = await query(sql, [from, to]);
  return rows[0];
}

async function getDaily(from: string, to: string) {
  const sql = `
    SELECT sold_date AS date,
           ROUND(SUM(quantity * unit_price)::numeric, 2) AS revenue,
           ROUND(SUM(quantity * unit_cost)::numeric, 2)  AS cost,
           SUM(quantity)::int AS items,
           COUNT(*)::int AS sales
    FROM sales WHERE sold_date BETWEEN $1 AND $2 GROUP BY sold_date`;
  const { rows } = await query(sql, [from, to]);
  return rows;
}

async function getByProduct(from: string, to: string) {
  const sql = `
    SELECT product_id AS id,
           MAX(product_name) AS name,
           SUM(quantity)::int AS qty,
           ROUND(SUM(quantity * unit_price)::numeric, 2) AS revenue,
           ROUND(SUM(quantity * unit_cost)::numeric, 2)  AS cost,
           ROUND(SUM(quantity * (unit_price - unit_cost))::numeric, 2) AS profit
    FROM sales WHERE sold_date BETWEEN $1 AND $2 GROUP BY product_id ORDER BY profit DESC`;
  const { rows } = await query(sql, [from, to]);
  return rows;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const t = todayStr(tz);
  const weekStartDay = process.env.WEEK_START !== undefined ? Number(process.env.WEEK_START) : 6;
  const ws = weekStart(t, weekStartDay);
  const ms = monthStart(t);
  const from30 = addDays(t, -29);

  const [
    dailyRows,
    summaryToday,
    summaryWeek,
    summaryMonth,
    summaryAll,
    topProducts,
    lowStockRes,
    inventoryRes,
    recentRes,
  ] = await Promise.all([
    getDaily(from30, t),
    getSummary(t, t),
    getSummary(ws, t),
    getSummary(ms, t),
    getSummary('0000-01-01', t),
    getByProduct(ms, t),
    query('SELECT id, name, size, color, quantity, low_stock FROM products WHERE active = 1 AND quantity <= low_stock ORDER BY quantity ASC, name LIMIT 12'),
    query(`SELECT COUNT(*)::int AS products,
                   COALESCE(SUM(quantity)::int, 0) AS units,
                   COALESCE(ROUND(SUM(quantity * purchase_price)::numeric, 2), 0) AS cost_value,
                   COALESCE(ROUND(SUM(quantity * selling_price)::numeric, 2), 0)  AS retail_value
            FROM products WHERE active = 1`),
    query(`SELECT id, product_name, quantity, unit_price, sold_date,
                   ROUND((quantity * (unit_price - unit_cost))::numeric, 2) AS profit
            FROM sales ORDER BY id DESC LIMIT 8`),
  ]);

  const byDate = new Map(dailyRows.map((r: any) => [r.date, r]));
  const series: { date: string; revenue: number; profit: number }[] = [];
  for (let d = from30; d <= t; d = addDays(d, 1)) {
    const r: any = byDate.get(d);
    series.push({
      date: d,
      revenue: r ? Number(r.revenue) : 0,
      profit: r ? r2(Number(r.revenue) - Number(r.cost)) : 0,
    });
  }

  return NextResponse.json({
    today: t,
    weekStart: ws,
    monthStart: ms,
    periods: {
      today: withProfit(summaryToday),
      week: withProfit(summaryWeek),
      month: withProfit(summaryMonth),
      all: withProfit(summaryAll),
    },
    series,
    topProducts: topProducts.slice(0, 5),
    lowStock: lowStockRes.rows,
    inventory: inventoryRes.rows[0],
    recent: recentRes.rows,
  });
}
