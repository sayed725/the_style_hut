const nf = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 });

export const money = (n: number | string | null | undefined): string => {
  const num = Number(n) || 0;
  return (num < 0 ? '-৳' : '৳') + nf.format(Math.abs(num));
};

export const num = (n: number | string | null | undefined): string => {
  return nf.format(Number(n) || 0);
};

export const pct = (n: number | string | null | undefined): string => {
  return `${nf.format(Number(n) || 0)}%`;
};

export const compact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e7) return +(n / 1e7).toFixed(1) + 'Cr';
  if (a >= 1e5) return +(n / 1e5).toFixed(1) + 'L';
  if (a >= 1e3) return +(n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
};

export const shortDate = (d: string): string => {
  if (!d) return '';
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export const longDate = (d: string): string => {
  if (!d) return '';
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const monthLabel = (m: string): string => {
  if (!m) return '';
  return new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const profitClass = (n: number): string => {
  return n < 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : n > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : '';
};

export const variant = (p: { size?: string | null; color?: string | null }): string => {
  return [p.size, p.color].filter(Boolean).join(' · ');
};

export const addDays = (d: string, n: number): string => {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export const weekStart = (s: string, weekStartDay = 6): string => {
  const dow = new Date(s + 'T00:00:00Z').getUTCDay();
  return addDays(s, -((dow - weekStartDay + 7) % 7));
};

export const monthStart = (s: string): string => {
  return s.slice(0, 8) + '01';
};

export const todayStr = (timeZone = 'Asia/Dhaka'): string => {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
};
