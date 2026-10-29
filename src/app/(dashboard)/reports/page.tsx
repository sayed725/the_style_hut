'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { money, num, pct, profitClass, addDays, todayStr, monthStart, weekStart } from '@/lib/format';
import { Calendar, TrendingUp, DollarSign, Package, Percent } from 'lucide-react';

export default function ReportsPage() {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [group, setGroup] = React.useState<'day' | 'week' | 'month'>('day');
  const [preset, setPreset] = React.useState('month');
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const today = todayStr();
    setFrom(monthStart(today));
    setTo(today);
  }, []);

  const setDatePreset = (k: string) => {
    const today = todayStr();
    const ws = weekStart(today);
    const ms = monthStart(today);
    const prevMonthEnd = addDays(ms, -1);
    const prevMonthStart = prevMonthEnd.slice(0, 8) + '01';

    setPreset(k);
    if (k === 'today') { setFrom(today); setTo(today); }
    else if (k === 'week') { setFrom(ws); setTo(today); }
    else if (k === 'month') { setFrom(ms); setTo(today); }
    else if (k === 'last') { setFrom(prevMonthStart); setTo(prevMonthEnd); }
    else if (k === 'd30') { setFrom(addDays(today, -29)); setTo(today); }
    else if (k === 'year') { setFrom(today.slice(0, 4) + '-01-01'); setTo(today); }
  };

  const fetchReport = React.useCallback(() => {
    if (!from || !to) return;
    setLoading(true);
    fetch(`/api/reports?from=${from}&to=${to}&group=${group}`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [from, to, group]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = report?.summary || { revenue: 0, cost: 0, profit: 0, margin: 0, items: 0, sales: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Profit & Sales Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Detailed financial audit with daily, weekly, and monthly performance breakdowns.
        </p>
      </div>

      {/* Preset & Filter Bar */}
      <Card className="p-4 space-y-3.5 shadow-xs">
        {/* Presets (Horizontal touch scroll on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Presets:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'last', label: 'Last Month' },
            { id: 'd30', label: 'Last 30 Days' },
            { id: 'year', label: 'This Year' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-manipulation ${
                preset === p.id
                  ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Grouping */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('');
              }}
              className="h-10 text-xs sm:text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('');
              }}
              className="h-10 text-xs sm:text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Grouping</label>
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1 w-full">
              {(['day', 'week', 'month'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all touch-manipulation ${
                    group === g
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{money(summary.revenue)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{num(summary.items)} pcs sold</span>
        </Card>
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cost of Goods</span>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-700 dark:text-slate-300 mt-1 font-mono">{money(summary.cost)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Purchase expense</span>
        </Card>
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 font-mono ${profitClass(summary.profit)}`}>{money(summary.profit)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{summary.sales} transactions</span>
        </Card>
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Margin</span>
            <Percent className="h-4 w-4 text-teal-600" />
          </div>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 font-mono ${profitClass(summary.margin)}`}>{pct(summary.margin)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Net margin rate</span>
        </Card>
      </div>

      {/* Performance Chart */}
      {report?.series?.length > 0 && (
        <Card className="p-4 sm:p-6 shadow-xs">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Performance Drilldown ({group})</CardTitle>
          </CardHeader>
          <SalesChart data={report.series} />
        </Card>
      )}

      {/* Profit By Product (Dual Desktop Table / Mobile Card View) */}
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Profit by Product</CardTitle>
          {report?.products?.length > 0 && (
            <Badge variant="outline" className="text-xs font-semibold">
              {report.products.length} products sold
            </Badge>
          )}
        </CardHeader>

        {/* Desktop Table View (>= md screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Sold</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">Loading report...</td>
                </tr>
              ) : report?.products?.length > 0 ? (
                report.products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">{num(p.qty)}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300 font-mono">{money(p.revenue)}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300 font-mono">{money(p.cost)}</td>
                    <td className={`py-3 px-4 text-right font-bold font-mono ${profitClass(p.profit)}`}>{money(p.profit)}</td>
                    <td className={`py-3 px-4 text-right font-semibold font-mono ${profitClass(p.margin)}`}>{pct(p.margin)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">No sales recorded in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stack View (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : report?.products?.length > 0 ? (
            report.products.map((p: any) => (
              <div key={p.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {p.name}
                  </h4>
                  <Badge variant="outline" className="text-xs font-semibold shrink-0">
                    {num(p.qty)} pcs
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Revenue</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{money(p.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cost</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300 font-mono">{money(p.cost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Profit (Margin)</span>
                    <span className={`font-bold font-mono ${profitClass(p.profit)}`}>
                      {money(p.profit)}
                    </span>
                    <span className={`block text-[10px] font-semibold ${profitClass(p.margin)}`}>
                      {pct(p.margin)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No sales recorded in this period.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

