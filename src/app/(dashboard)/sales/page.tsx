'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { money, num, shortDate, profitClass, addDays, todayStr, monthStart, weekStart } from '@/lib/format';
import { Download, Search, Undo2, ReceiptText, Calendar, X, Banknote, CreditCard, Clock, ArrowUpDown, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function SalesHistoryPage() {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [preset, setPreset] = React.useState('month');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('all');
  const [sort, setSort] = React.useState<string>('date_desc');
  const [sales, setSales] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const today = todayStr();
    setFrom(monthStart(today));
    setTo(today);
  }, []);

  const setDatePreset = (key: string) => {
    const today = todayStr();
    setPreset(key);
    if (key === 'today') {
      setFrom(today);
      setTo(today);
    } else if (key === 'week') {
      setFrom(weekStart(today));
      setTo(today);
    } else if (key === 'month') {
      setFrom(monthStart(today));
      setTo(today);
    } else if (key === 'd30') {
      setFrom(addDays(today, -29));
      setTo(today);
    } else if (key === 'all') {
      setFrom('2020-01-01');
      setTo(today);
    }
  };

  const fetchSales = React.useCallback(() => {
    if (!from || !to) return;
    setLoading(true);
    const qs = new URLSearchParams({
      from,
      to,
      q: search.trim(),
      payment_method: paymentMethod,
      sort,
    });
    fetch(`/api/sales?${qs}`)
      .then((res) => res.json())
      .then((data) => {
        setSales(Array.isArray(data.rows) ? data.rows : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [from, to, search, paymentMethod, sort]);

  React.useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleUndo = async (id: number, productName: string) => {
    if (!confirm(`Delete this sale for "${productName}"? The pieces will immediately return to your available stock.`)) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to undo sale');
      toast.success(`Sale for "${productName}" deleted. Inventory has been restored.`);
      fetchSales();
    } catch (err: any) {
      toast.error(err.message || 'Failed to undo sale');
    }
  };

  const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
  const totalItems = sales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const cashSalesTotal = sales.filter((s) => (s.payment_method || 'cash') === 'cash').reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const onlineSalesTotal = sales.filter((s) => s.payment_method === 'online').reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);
  const dueSalesTotal = sales.filter((s) => s.payment_method === 'due').reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);

  const renderPaymentBadge = (method?: string) => {
    const m = (method || 'cash').toLowerCase();
    if (m === 'online') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
          <CreditCard className="h-3 w-3" /> Online
        </span>
      );
    }
    if (m === 'due') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
          <Clock className="h-3 w-3" /> Due
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
        <Banknote className="h-3 w-3" /> Cash
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Sales History
            <Badge variant="outline" className="text-xs font-semibold">
              {sales.length} transactions
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Audit recorded customer sales, undo mistaken entries, or export reports.
          </p>
        </div>
        <a
          href={`/api/sales/csv?from=${from}&to=${to}&payment_method=${paymentMethod}&q=${encodeURIComponent(search.trim())}`}
          download
          className="self-start sm:self-auto"
        >
          <Button variant="outline" size="sm" className="font-semibold shadow-xs">
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </a>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="p-4 space-y-3.5 shadow-xs">
        {/* Quick Presets Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Presets:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'd30', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer ${
                preset === p.id
                  ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-3">
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
          <div className="sm:col-span-3">
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
          <div className="sm:col-span-6">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Search Sold Items</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Product name, note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10 text-xs sm:text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sale Type Filters & Sort Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sale Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none select-none">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Sale Type:
            </span>
            <button
              type="button"
              onClick={() => setPaymentMethod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                paymentMethod === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Sales
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <Banknote className="h-3.5 w-3.5" />
              Cash Sales
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                paymentMethod === 'online'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Online Sales
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                paymentMethod === 'due'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Due Sales
            </button>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-8 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="payment_method">Sale Type (Cash / Online / Due)</option>
              <option value="revenue_desc">Revenue: High to Low</option>
              <option value="revenue_asc">Revenue: Low to High</option>
              <option value="profit_desc">Profit: High to Low</option>
              <option value="profit_asc">Profit: Low to High</option>
            </select>
          </div>
        </div>

        {/* Live Period Summary Banner with Cash/Online/Due Breakdown */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div className="flex flex-wrap items-center gap-2.5">
            <span><b>{sales.length}</b> sales</span>
            <span>•</span>
            <span><b>{num(totalItems)}</b> pcs sold</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-2">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Cash: <b>{money(cashSalesTotal)}</b></span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-sky-700 dark:text-sky-400 font-medium">Online: <b>{money(onlineSalesTotal)}</b></span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-amber-700 dark:text-amber-400 font-medium">Due: <b>{money(dueSalesTotal)}</b></span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Total Revenue: <b className="text-slate-900 dark:text-white font-mono">{money(totalRevenue)}</b>
            </span>
            <span>
              Profit: <b className={`font-mono ${profitClass(totalProfit)}`}>{money(totalProfit)}</b>
            </span>
          </div>
        </div>
      </Card>

      {/* Desktop / Tablet Table View (hidden on mobile) */}
      <Card className="hidden md:block overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product Sold</th>
                <th className="py-3 px-4">Sale Type</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Profit / Loss</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length > 0 ? (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                      {shortDate(s.sold_date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.product_name}</div>
                      {s.note && <div className="text-[11px] text-slate-400 mt-0.5">{s.note}</div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderPaymentBadge(s.payment_method)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                      {num(s.quantity)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300 font-mono">
                      {money(s.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">
                      {money(s.revenue)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${profitClass(s.profit)} font-mono`}>
                      {money(s.profit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => handleUndo(s.id, s.product_name)}
                        title="Delete sale and return pieces to inventory"
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1" />
                        Undo
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <ReceiptText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No sales recorded for this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card Stack View (< md screens) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : sales.length > 0 ? (
          sales.map((s) => (
            <Card key={s.id} className="p-4 rounded-xl space-y-3 shadow-xs">
              {/* Header: Date + Sale Type Badge + Undo Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {shortDate(s.sold_date)}
                  </span>
                  {renderPaymentBadge(s.payment_method)}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 font-medium"
                  onClick={() => handleUndo(s.id, s.product_name)}
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                  Undo Sale
                </Button>
              </div>

              {/* Product Info */}
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                  {s.product_name}
                </h3>
                {s.note && (
                  <p className="text-xs text-slate-400 mt-0.5 italic">
                    Note: {s.note}
                  </p>
                )}
              </div>

              {/* 3-Column Stats Row */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Quantity</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                    {num(s.quantity)} × {money(s.unit_price)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Revenue</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {money(s.revenue)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{s.profit < 0 ? 'Loss' : 'Profit'}</span>
                  <span className={`font-bold font-mono ${profitClass(s.profit)}`}>
                    {money(s.profit)}
                  </span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center text-slate-400">
            <ReceiptText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs">No sales recorded for this date range.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

