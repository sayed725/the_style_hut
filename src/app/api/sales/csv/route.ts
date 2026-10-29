import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
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

  const sql = `
    SELECT *,
           ROUND((quantity * unit_price)::numeric, 2) AS revenue,
           ROUND((quantity * (unit_price - unit_cost))::numeric, 2) AS profit
    FROM sales
    WHERE sold_date BETWEEN $1 AND $2
      AND ($3 = '' OR product_name ILIKE '%' || $4 || '%')
    ORDER BY sold_date DESC, id DESC LIMIT 5000`;

  const { rows } = await query(sql, [from, to, search, search]);

  const cell = (v: any) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const lines = [['Date', 'Product', 'Qty', 'Cost each', 'Price each', 'Revenue', 'Profit', 'Note'].join(',')];
  for (const r of rows) {
    lines.push([r.sold_date, r.product_name, r.quantity, r.unit_cost, r.unit_price, r.revenue, r.profit, r.note].map(cell).join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales_${from}_to_${to}.csv"`,
    },
  });
}
