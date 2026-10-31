'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { money, num, shortDate, profitClass, addDays, todayStr, monthStart, weekStart } from '@/lib/format';
import {
  Search,
  Undo2,
  ReceiptText,
  Calendar,
  X,
  Banknote,
  CreditCard,
  Clock,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const formatTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

const formatProfitPct = (profit: number | string, revenue: number | string) => {
  const rev = Number(revenue) || 0;
  const prof = Number(profit) || 0;
  if (!rev || rev === 0) return '0%';
  const p = (prof / rev) * 100;
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}%`;
};

export default function SalesHistoryPage() {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [preset, setPreset] = React.useState('month');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('all');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [categories, setCategories] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<string>('date_desc');
  const [sales, setSales] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [expandedCards, setExpandedCards] = React.useState<Record<number, boolean>>({});

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Backend pagination state (10 items per page)
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [summary, setSummary] = React.useState({
    totalSales: 0,
    totalItems: 0,
    totalRevenue: 0,
    totalProfit: 0,
    cashTotal: 0,
    onlineTotal: 0,
    dueTotal: 0,
  });

  const toggleExpand = (id: number) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  React.useEffect(() => {
    const today = todayStr();
    setFrom(monthStart(today));
    setTo(today);
  }, []);

  // Debounce search input so backend isn't spammed on every keystroke
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const setDatePreset = (key: string) => {
    const today = todayStr();
    setPreset(key);
    setPage(1);
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
    } else if (key === 'custom') {
      // Retain current dates
    }
  };

  const updatePaymentMethod = (val: string) => {
    setPaymentMethod(val);
    setPage(1);
  };

  const updateCategory = (val: string) => {
    setSelectedCategory(val);
    setPage(1);
  };

  const updateSort = (val: string) => {
    setSort(val);
    setPage(1);
  };

  const updateSearch = (val: string) => {
    setSearch(val);
    if (!val) {
      setDebouncedSearch('');
      setPage(1);
    }
  };

  const updateFrom = (val: string) => {
    setFrom(val);
    setPage(1);
  };

  const updateTo = (val: string) => {
    setTo(val);
    setPage(1);
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (preset !== 'month') count++;
    if (paymentMethod !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (sort !== 'date_desc') count++;
    return count;
  }, [preset, paymentMethod, selectedCategory, sort]);

  const resetFilters = () => {
    const today = todayStr();
    setPreset('month');
    setFrom(monthStart(today));
    setTo(today);
    setPaymentMethod('all');
    setSelectedCategory('all');
    setSort('date_desc');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const fetchSales = React.useCallback(() => {
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
      q: debouncedSearch.trim(),
      payment_method: paymentMethod,
      category: selectedCategory,
      sort,
      page: String(page),
      limit: '10',
    });
    fetch(`/api/sales?${qs}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setSales(Array.isArray(data.rows) ? data.rows : []);
        if (Array.isArray(data.categories)) {
          setCategories(['all', ...data.categories]);
        }
        if (typeof data.total === 'number') {
          setTotal(data.total);
        }
        if (typeof data.totalPages === 'number') {
          setTotalPages(data.totalPages);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setLoading(false);
        }
      });
  }, [from, to, debouncedSearch, paymentMethod, selectedCategory, sort, page]);

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

  const paginationItems = React.useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (page > 3) {
      pages.push('dots-1');
    }
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) {
      pages.push('dots-2');
    }
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

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
      <div className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Sales History
        </h1>
        <div>
          <Badge variant="outline" className="text-xs font-semibold">
            <span className="text-teal-600 dark:text-teal-400 font-bold mr-1">{total}</span>
            {total === 1 ? 'sale' : 'sales'}
          </Badge>
        </div>
      </div>

      {/* Desktop / Tablet Filter Toolbar (>= sm) */}
      <div className="hidden sm:block space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search product name, note..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 pr-8 h-9.5 text-xs sm:text-sm rounded-xl"
            />
            {search && (
              <button
                onClick={() => updateSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Date Presets Dropdown */}
          <div className="relative shrink-0">
            <select
              value={preset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="h-9.5 pl-8 pr-7 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="d30">Last 30 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Sale Type Dropdown */}
          <div className="relative shrink-0">
            <select
              value={paymentMethod}
              onChange={(e) => updatePaymentMethod(e.target.value)}
              className="h-9.5 pl-8 pr-7 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
            >
              <option value="all">All Sale Types</option>
              <option value="cash">Cash Sales</option>
              <option value="online">Online Sales</option>
              <option value="due">Due Sales</option>
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value)}
              className="h-9.5 pl-8 pr-7 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="revenue_desc">Revenue: High to Low</option>
              <option value="revenue_asc">Revenue: Low to High</option>
              <option value="profit_desc">Profit: High to Low</option>
              <option value="profit_asc">Profit: Low to High</option>
              <option value="payment_method">Sale Type</option>
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Filters button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="h-9.5 px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Custom Date Pickers for Desktop if preset === 'custom' */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400 animate-in fade-in duration-150">
            <span className="font-semibold text-slate-500">Date Range:</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={from}
                onChange={(e) => updateFrom(e.target.value)}
                className="h-8.5 text-xs w-36 rounded-lg"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => updateTo(e.target.value)}
                className="h-8.5 text-xs w-36 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Pills (Horizontal scrolling like inventory page) */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => updateCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-manipulation capitalize cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat === 'all' ? 'All Items' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Mobile Search & Drawer Trigger Bar (< sm) */}
      <div className="flex sm:hidden items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search sold items..."
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className="pl-9 pr-8 h-10 text-xs rounded-xl"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setDrawerOpen(true)}
          className={`h-10 px-3 rounded-xl gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
            activeFiltersCount > 0 ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20' : ''
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold leading-none">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile Filters Drawer (Bottom Sheet) */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Filter & Sort Sales
          </DialogTitle>
          <DialogDescription className="text-xs">
            Refine sales by date preset, payment method, or sorting.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-3">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Date Presets
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'd30', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
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

          {/* Custom Date Pickers */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  updateFrom(e.target.value);
                  setPreset('custom');
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
                  updateTo(e.target.value);
                  setPreset('custom');
                }}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Sale Type */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sale Type
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'all', label: 'All Sales', icon: Filter, color: 'text-slate-600 dark:text-slate-300' },
                { id: 'cash', label: 'Cash Only', icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400' },
                { id: 'online', label: 'Online Only', icon: CreditCard, color: 'text-sky-600 dark:text-sky-400' },
                { id: 'due', label: 'Due Only', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = paymentMethod === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updatePaymentMethod(item.id)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => updateCategory(cat)}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-xl border capitalize transition-all cursor-pointer ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat === 'all' ? 'All Items' : cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort By */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sort By
            </label>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => updateSort(e.target.value)}
                className="w-full h-10 pl-8 pr-7 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
              >
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="revenue_desc">Revenue: High to Low</option>
                <option value="revenue_asc">Revenue: Low to High</option>
                <option value="profit_desc">Profit: High to Low</option>
                <option value="profit_asc">Profit: Low to High</option>
                <option value="payment_method">Sale Type</option>
              </select>
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
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
            onClick={() => setDrawerOpen(false)}
            className="flex-1 text-xs font-bold rounded-xl"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Payment Breakdown */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-[95px] px-2.5 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center sm:justify-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate">
            Cash: <b className="font-mono font-bold">{money(summary.cashTotal)}</b>
          </span>
        </div>
        <div className="flex-1 min-w-[95px] px-2.5 py-1.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-center sm:justify-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span className="text-[11px] sm:text-xs text-sky-800 dark:text-sky-300 font-medium truncate">
            Online: <b className="font-mono font-bold">{money(summary.onlineTotal)}</b>
          </span>
        </div>
        <div className="flex-1 min-w-[95px] px-2.5 py-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center sm:justify-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 font-medium truncate">
            Due: <b className="font-mono font-bold">{money(summary.dueTotal)}</b>
          </span>
        </div>
      </div>

      {/* Desktop / Tablet Table View (hidden on mobile) */}
      <Card className="hidden md:block overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product Sold</th>
                <th className="py-3 px-4">Sale Type</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Sale Price</th>
                <th className="py-3 px-4 text-right">Profit / Margin (%)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                      <div className="h-2.5 w-14 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto mb-1" />
                      <div className="h-2.5 w-10 bg-slate-100 dark:bg-slate-800/60 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 w-14 bg-slate-100 dark:bg-slate-800/60 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : sales.length > 0 ? (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      <div className="font-medium">{shortDate(s.sold_date)}</div>
                      {s.sold_at && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatTime(s.sold_at)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[220px] lg:max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white break-words" title={s.product_name}>
                        {s.product_name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {s.category && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider shrink-0 max-w-[120px] truncate" title={s.category}>
                            {s.category}
                          </span>
                        )}
                        {s.note && <span className="break-words line-clamp-1" title={s.note}>{s.note}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderPaymentBadge(s.payment_method)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                      {num(s.quantity)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {money(s.unit_cost)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                      {money(s.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className={`font-bold font-mono ${profitClass(s.profit)}`}>
                        {money(s.profit)}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${s.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatProfitPct(s.profit, s.revenue)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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
                    No sales recorded matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card Stack View (< md screens) */}
      <div className="block md:hidden space-y-2.5">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <Card
                key={i}
                className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <div className="h-2.5 w-12 bg-slate-100 dark:bg-slate-800/60 rounded ml-auto" />
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="h-5 w-10 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
        ) : sales.length > 0 ? (
          sales.map((s) => {
            const isExpanded = !!expandedCards[s.id];
            return (
              <Card
                key={s.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Collapsed Card Header (Always visible - Clickable toggle) */}
                <div
                  onClick={() => toggleExpand(s.id)}
                  className="p-3 sm:p-3.5 flex flex-col gap-1.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 active:bg-slate-100/60 dark:active:bg-slate-800/40 transition-colors select-none"
                  role="button"
                  aria-expanded={isExpanded}
                >
                  {/* Top Row: Product Name + Sale Price Amount */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug break-words">
                        {s.product_name}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Sale Price
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono block">
                        {money(s.revenue)}
                      </span>
                    </div>
                  </div>

                  {/* Summary Sub-Row: Qty, Payment Badge, Profit Pill, Chevron */}
                  <div className="flex items-center justify-between gap-1.5 pt-0.5 min-w-0 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {renderPaymentBadge(s.payment_method)}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        {num(s.quantity)} {s.quantity === 1 ? 'pc' : 'pcs'}
                      </span>
                      <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                        s.profit >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {money(s.profit)} ({formatProfitPct(s.profit, s.revenue)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 shrink-0">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer (Shows more info on click) */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-2 space-y-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-xs animate-in fade-in duration-150">
                    {/* Date, Time & Category */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-slate-500">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {shortDate(s.sold_date)}
                          {s.sold_at && (
                            <span className="text-slate-400 ml-1">at {formatTime(s.sold_at)}</span>
                          )}
                        </span>
                      </div>
                      {s.category && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider shrink-0 max-w-[140px] truncate" title={s.category}>
                          {s.category}
                        </span>
                      )}
                    </div>

                    {/* Note if present */}
                    {s.note && (
                      <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-[11px] break-words">
                        <span className="font-semibold">Note:</span> {s.note}
                      </div>
                    )}

                    {/* Pricing & Profit Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Purchase Price
                        </span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">
                          {money(s.unit_cost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sale Price
                        </span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">
                          {money(s.unit_price)}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Profit / pc
                        </span>
                        <span className={`font-mono font-bold text-xs ${profitClass(Number(s.unit_price) - Number(s.unit_cost))}`}>
                          {money(Number(s.unit_price) - Number(s.unit_cost))}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Margin
                        </span>
                        <span className={`font-mono font-bold text-xs ${profitClass(s.profit)}`}>
                          {money(s.profit)} <span className={`text-[10px] ${s.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>({formatProfitPct(s.profit, s.revenue)})</span>
                        </span>
                      </div>
                    </div>

                    {/* Undo Action Button */}
                    <div className="pt-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 font-semibold cursor-pointer rounded-xl justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUndo(s.id, s.product_name);
                        }}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                        Undo Sale (Restore Stock)
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="p-8 text-center text-slate-400">
            <ReceiptText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs">No sales recorded matching this filter.</p>
          </Card>
        )}
      </div>

      {/* Responsive Pagination (works for both Desktop Table and Mobile Cards) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-3 pb-2 text-xs text-slate-500 font-medium">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage(p)}
                  disabled={loading}
                  className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    page === p
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
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1 shrink-0 rounded-xl cursor-pointer"
            title="Next page"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

