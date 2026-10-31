'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { money, num, pct, profitClass, addDays, todayStr, monthStart, weekStart } from '@/lib/format';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  SlidersHorizontal,
  RotateCcw,
  Layers,
} from 'lucide-react';

export default function ReportsPage() {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [group, setGroup] = React.useState<'day' | 'week' | 'month'>('day');
  const [preset, setPreset] = React.useState('month');
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [dateDrawerOpen, setDateDrawerOpen] = React.useState(false);

  // Profit by Category search, sort, expand & pagination state
  const [categorySearch, setCategorySearch] = React.useState('');
  const [debouncedCategorySearch, setDebouncedCategorySearch] = React.useState('');
  const [categorySort, setCategorySort] = React.useState('profit_desc');
  const [categoryPage, setCategoryPage] = React.useState(1);
  const [totalCategories, setTotalCategories] = React.useState(0);
  const [totalCategoryPages, setTotalCategoryPages] = React.useState(1);
  const [expandedCards, setExpandedCards] = React.useState<Record<string, boolean>>({});

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const toggleExpand = (catName: string) => {
    setExpandedCards((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  React.useEffect(() => {
    const today = todayStr();
    setFrom(monthStart(today));
    setTo(today);
  }, []);

  // Debounce category search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch);
      setCategoryPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  const setDatePreset = (k: string) => {
    const today = todayStr();
    const ws = weekStart(today);
    const ms = monthStart(today);
    const prevMonthEnd = addDays(ms, -1);
    const prevMonthStart = prevMonthEnd.slice(0, 8) + '01';

    setPreset(k);
    setCategoryPage(1);
    if (k === 'today') {
      setFrom(today);
      setTo(today);
    } else if (k === 'week') {
      setFrom(ws);
      setTo(today);
    } else if (k === 'month') {
      setFrom(ms);
      setTo(today);
    } else if (k === 'last') {
      setFrom(prevMonthStart);
      setTo(prevMonthEnd);
    } else if (k === 'd30') {
      setFrom(addDays(today, -29));
      setTo(today);
    } else if (k === 'year') {
      setFrom(today.slice(0, 4) + '-01-01');
      setTo(today);
    }
  };

  const resetFilters = () => {
    const today = todayStr();
    setPreset('month');
    setFrom(monthStart(today));
    setTo(today);
    setGroup('day');
    setCategorySearch('');
    setDebouncedCategorySearch('');
    setCategorySort('profit_desc');
    setCategoryPage(1);
  };

  const fetchReport = React.useCallback(() => {
    if (!from || !to) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    const qs = new URLSearchParams({
      from,
      to,
      group,
      q: debouncedCategorySearch.trim(),
      sort: categorySort,
      page: String(categoryPage),
      limit: '10',
    });

    fetch(`/api/reports?${qs.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        if (data?.pagination) {
          setTotalCategories(data.pagination.total || 0);
          setTotalCategoryPages(data.pagination.totalPages || 1);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setLoading(false);
        }
      });
  }, [from, to, group, debouncedCategorySearch, categorySort, categoryPage]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const paginationItems = React.useMemo(() => {
    if (totalCategoryPages <= 7) {
      return Array.from({ length: totalCategoryPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (categoryPage > 3) {
      pages.push('dots-1');
    }
    const start = Math.max(2, categoryPage - 1);
    const end = Math.min(totalCategoryPages - 1, categoryPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (categoryPage < totalCategoryPages - 2) {
      pages.push('dots-2');
    }
    pages.push(totalCategoryPages);
    return pages;
  }, [categoryPage, totalCategoryPages]);

  const summary = report?.summary || {
    revenue: 0,
    cost: 0,
    profit: 0,
    margin: 0,
    items: 0,
    sales: 0,
    cash_total: 0,
    online_total: 0,
    due_total: 0,
  };

  const getPresetLabel = () => {
    switch (preset) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'last':
        return 'Last Month';
      case 'd30':
        return 'Last 30 Days';
      case 'year':
        return 'This Year';
      default:
        return 'Custom Date Range';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            Profit & Sales Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
            Financial audit with daily, weekly, and monthly performance drilldowns.
          </p>
        </div>
      </div>

      {/* Desktop Filter Bar (>= sm) */}
      <Card className="hidden sm:block p-4 space-y-3 shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {/* Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none select-none">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer ${
                preset === p.id
                  ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Grouping */}
        <div className="grid grid-cols-12 gap-3 pt-0.5">
          <div className="col-span-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('');
                setCategoryPage(1);
              }}
              className="h-9.5 text-xs sm:text-sm rounded-xl"
            />
          </div>
          <div className="col-span-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('');
                setCategoryPage(1);
              }}
              className="h-9.5 text-xs sm:text-sm rounded-xl"
            />
          </div>
          <div className="col-span-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Grouping</label>
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 w-full h-9.5 items-center">
              {(['day', 'week', 'month'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`flex-1 h-8 rounded-lg text-xs font-semibold capitalize transition-all touch-manipulation cursor-pointer ${
                    group === g
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Mobile Compact Filter Trigger (< sm) */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                {getPresetLabel()}
              </span>
              <span className="text-[10px] text-slate-400 block truncate font-medium">
                {from} to {to} • Group by {group}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDateDrawerOpen(true)}
            className="h-8.5 px-3 rounded-xl text-xs font-semibold gap-1.5 shrink-0 cursor-pointer border-teal-600/60 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* Mobile Filter Drawer (Bottom Sheet) */}
      <Dialog open={dateDrawerOpen} onOpenChange={setDateDrawerOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Report Date & Grouping
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select a preset period or specify custom audit dates.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-3">
          {/* Preset Buttons Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Presets
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'last', label: 'Last Month' },
                { id: 'd30', label: '30 Days' },
                { id: 'year', label: 'This Year' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                    preset === p.id
                      ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset('');
                  setCategoryPage(1);
                }}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset('');
                  setCategoryPage(1);
                }}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Grouping Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Group Performance By
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['day', 'week', 'month'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border capitalize text-center transition-all cursor-pointer ${
                    group === g
                      ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="flex-1 text-xs rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setDateDrawerOpen(false)}
            className="flex-1 text-xs font-bold rounded-xl"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Summary KPI Cards (Responsive & Overflow-proof with loading Skeletons) */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {[...Array(4)].map((_, i) => (
              <Card
                key={i}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse space-y-2"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded mt-1" />
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* Total Sales Card */}
            <Card className="p-3.5 sm:p-4 shadow-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Sales
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="min-w-0">
                <p
                  className="text-base sm:text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white font-mono truncate"
                  title={money(summary.revenue)}
                >
                  {money(summary.revenue)}
                </p>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5 block truncate">
                  <b className="text-teal-600 dark:text-teal-400 font-bold mr-0.5">{num(summary.items)}</b> pcs sold
                </span>
              </div>
            </Card>

            {/* Cost of Goods Card */}
            <Card className="p-3.5 sm:p-4 shadow-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Cost of Goods
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="min-w-0">
                <p
                  className="text-base sm:text-xl lg:text-2xl font-extrabold text-slate-700 dark:text-slate-300 font-mono truncate"
                  title={money(summary.cost)}
                >
                  {money(summary.cost)}
                </p>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5 block truncate">
                  Purchase cost
                </span>
              </div>
            </Card>

            {/* Net Profit Card */}
            <Card className="p-3.5 sm:p-4 shadow-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Net Profit
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="min-w-0">
                <p
                  className={`text-base sm:text-xl lg:text-2xl font-extrabold font-mono truncate ${profitClass(summary.profit)}`}
                  title={money(summary.profit)}
                >
                  {money(summary.profit)}
                </p>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5 block truncate">
                  <b className="text-teal-600 dark:text-teal-400 font-bold mr-0.5">{num(summary.sales)}</b> transactions
                </span>
              </div>
            </Card>

            {/* Overall Margin Card */}
            <Card className="p-3.5 sm:p-4 shadow-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Profit Margin
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="min-w-0">
                <p className={`text-base sm:text-xl lg:text-2xl font-extrabold font-mono truncate ${profitClass(summary.margin)}`}>
                  {pct(summary.margin)}
                </p>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5 block truncate">
                  Margin on sales
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Payment Breakdown Pills (3-column responsive grid) */}
        {loading ? (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate">
                Cash: <b className="font-mono font-bold">{money(summary.cash_total || 0)}</b>
              </span>
            </div>
            <div className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
              <span className="text-[10px] sm:text-xs text-sky-800 dark:text-sky-300 font-medium truncate">
                Online: <b className="font-mono font-bold">{money(summary.online_total || 0)}</b>
              </span>
            </div>
            <div className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-300 font-medium truncate">
                Due: <b className="font-mono font-bold">{money(summary.due_total || 0)}</b>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Performance Drilldown Chart (Revenue, Cost, and Profit) */}
      {loading ? (
        <Card className="p-4 sm:p-5 shadow-xs rounded-2xl animate-pulse space-y-3">
          <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-52 sm:h-64 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
        </Card>
      ) : report?.series?.length > 0 ? (
        <Card className="p-4 sm:p-5 shadow-xs rounded-2xl">
          <CardHeader className="p-0 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold">
                Performance Drilldown ({group})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Timeline comparing revenue, cost, and net profit.
              </p>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-semibold text-slate-500 self-start sm:self-auto flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Cost
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> Profit
              </span>
            </div>
          </CardHeader>
          <SalesChart data={report.series} showCost />
        </Card>
      ) : null}

      {/* Profit By Category Card with Backend Search, Sort & Pagination */}
      <Card className="overflow-hidden shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Profit by Category
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of product categories ranked by earnings, sales, and profit margins.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto shrink-0">
            <span className="text-teal-600 dark:text-teal-400 font-bold mr-1">{totalCategories}</span>
            {totalCategories === 1 ? 'category' : 'categories'}
          </Badge>
        </CardHeader>

        {/* Toolbar: Category Search & Sort */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Category Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="search"
                placeholder="Search category name..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-8.5 pr-8 h-9 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900"
              />
              {categorySearch && (
                <button
                  onClick={() => {
                    setCategorySearch('');
                    setDebouncedCategorySearch('');
                    setCategoryPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={categorySort}
                onChange={(e) => {
                  setCategorySort(e.target.value);
                  setCategoryPage(1);
                }}
                className="h-9 pl-7 pr-7 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none shadow-xs"
              >
                <option value="profit_desc">Profit: High to Low</option>
                <option value="profit_asc">Profit: Low to High</option>
                <option value="revenue_desc">Revenue: High to Low</option>
                <option value="revenue_asc">Revenue: Low to High</option>
                <option value="qty_desc">Units Sold: High to Low</option>
                <option value="qty_asc">Units Sold: Low to High</option>
                <option value="margin_desc">Margin: High to Low</option>
                <option value="margin_asc">Margin: Low to High</option>
                <option value="name_asc">Category: A to Z</option>
                <option value="name_desc">Category: Z to A</option>
              </select>
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Desktop Table View (>= md screens) with Skeleton */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Sold</th>
                <th className="py-3 px-4 text-right">Sale Revenue</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-10 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : report?.categories?.length > 0 ? (
                report.categories.map((c: any) => (
                  <tr key={c.category} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white capitalize break-words">
                        {c.category}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {c.products_count} {c.products_count === 1 ? 'product' : 'products'} sold
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                      {num(c.qty)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">
                      {money(c.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">
                      {money(c.cost)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold font-mono ${profitClass(c.profit)}`}>
                      {money(c.profit)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold font-mono ${profitClass(c.margin)}`}>
                      {pct(c.margin)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    <ReceiptText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No categories found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stack View (< md screens) with Expandable Details and Skeletons */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-3 space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-4 w-14 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : report?.categories?.length > 0 ? (
            report.categories.map((c: any) => {
              const isExpanded = !!expandedCards[c.category];
              return (
                <div key={c.category} className="transition-colors">
                  {/* Collapsed Card Header */}
                  <div
                    onClick={() => toggleExpand(c.category)}
                    className="p-3 sm:p-3.5 space-y-1.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 active:bg-slate-100/60 dark:active:bg-slate-800/40 select-none"
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    {/* Top Row: Category Name + Net Profit */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug capitalize break-words">
                          {c.category}
                        </h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Net Profit
                        </span>
                        <span className={`font-mono font-extrabold text-sm ${profitClass(c.profit)}`}>
                          {money(c.profit)}
                        </span>
                      </div>
                    </div>

                    {/* Sub-row: Qty chip, Margin pill, chevron */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                          {num(c.qty)} pcs
                        </span>
                        <span
                          className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                            c.margin >= 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {pct(c.margin)} margin
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          ({c.products_count} {c.products_count === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                      <div className="flex items-center text-slate-400 shrink-0">
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown Drawer */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/60 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Sale Revenue
                          </span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white text-xs">
                            {money(c.revenue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Purchase Cost
                          </span>
                          <span className="font-mono font-medium text-slate-600 dark:text-slate-300 text-xs">
                            {money(c.cost)}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Distinct Products
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                            {c.products_count} {c.products_count === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Net Margin
                          </span>
                          <span className={`font-mono font-bold text-xs ${profitClass(c.margin)}`}>
                            {pct(c.margin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ReceiptText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              No categories found matching this filter.
            </div>
          )}
        </div>

        {/* Centered Responsive Pagination */}
        {totalCategoryPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
            <Button
              size="sm"
              variant="outline"
              disabled={categoryPage <= 1 || loading}
              onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1 shrink-0 rounded-xl cursor-pointer"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </Button>

            {/* Page pills */}
            <div className="flex items-center gap-1">
              {paginationItems.map((p, idx) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCategoryPage(p)}
                    disabled={loading}
                    className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      categoryPage === p
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={categoryPage >= totalCategoryPages || loading}
              onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1 shrink-0 rounded-xl cursor-pointer"
              title="Next page"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
