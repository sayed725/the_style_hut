import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { todayStr } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const today = todayStr(tz);

  const [products, sales, stockLog, users] = await Promise.all([
    query('SELECT * FROM products ORDER BY id ASC'),
    query('SELECT * FROM sales ORDER BY id ASC'),
    query('SELECT * FROM stock_log ORDER BY id ASC'),
    query('SELECT id, username, created_at FROM users ORDER BY id ASC'),
  ]);

  const backupData = {
    exported_at: new Date().toISOString(),
    store_tz: tz,
    users: users.rows,
    products: products.rows,
    sales: sales.rows,
    stock_log: stockLog.rows,
  };

  return new NextResponse(JSON.stringify(backupData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="store-backup-${today}.json"`,
    },
  });
}
