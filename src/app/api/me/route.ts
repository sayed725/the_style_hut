import { NextResponse } from 'next/server';
import { clearSession, getSessionUser } from '@/lib/auth';
import { todayStr, weekStart, monthStart } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
  }

  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const t = todayStr(tz);
  const weekStartDay = process.env.WEEK_START !== undefined ? Number(process.env.WEEK_START) : 6;

  return NextResponse.json({
    username: user.username,
    timezone: tz,
    today: t,
    weekStart: weekStart(t, weekStartDay),
    monthStart: monthStart(t),
  });
}
