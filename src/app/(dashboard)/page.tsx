'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { RestockModal } from '@/components/stock/restock-modal';
import { money, num, pct, longDate, shortDate, profitClass, variant } from '@/lib/format';
import { ShoppingCart, Plus, AlertCircle, TrendingUp, Package, ArrowUpRight } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [restockProduct, setRestockProduct] = React.useState<any>(null);

  const fetchDashboard = () => {
    fetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const inv = data.inventory || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{longDate(data.today)}</p>
        </div>
        <Link href="/sell">
          <Button variant="primary" className="w-full sm:w-auto font-bold shadow-md">
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Top 3 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today */}
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit Today</span>
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 ${profitClass(data.periods.today.profit)}`}>
              {money(data.periods.today.profit)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Sales <b className="text-slate-900 dark:text-white">{money(data.periods.today.revenue)}</b></span>
              <span>•</span>
              <span><b className="text-slate-900 dark:text-white">{num(data.periods.today.items)}</b> pcs</span>
              <span>•</span>
              <span><b className="text-slate-900 dark:text-white">{pct(data.periods.today.margin)}</b> margin</span>
            </div>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit This Week</span>
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 ${profitClass(data.periods.week.profit)}`}>
              {money(data.periods.week.profit)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Sales <b className="text-slate-900 dark:text-white">{money(data.periods.week.revenue)}</b></span>
              <span>•</span>
              <span><b className="text-slate-900 dark:text-white">{num(data.periods.week.items)}</b> pcs</span>
              <span>•</span>
              <span><b className="text-slate-900 dark:text-white">{pct(data.periods.week.margin)}</b> margin</span>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit This Month</span>
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 ${profitClass(data.periods.month.profit)}`}>
              {money(data.periods.month.profit)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Sales <b className="text-slate-900 dark:text-white">{money(data.periods.month.revenue)}</b></span>
              <span>•</span>
              <span><b className="text-slate-900 dark:text-white">{num(data.periods.month.items)}</b> pcs</span>
              <span>•</span>
              <span><b className="text-slate-900 dark:text-white">{pct(data.periods.month.margin)}</b> margin</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Sales & Profit Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Sales & Profit Overview</CardTitle>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Last 30 days daily performance</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-700" /> Revenue</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-teal-700 dark:bg-teal-500" /> Profit</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <SalesChart data={data.series} />
        </CardContent>
      </Card>

      {/* 2-Column Section: Best Sellers & Running Low */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Best Sellers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Top Sellers this Month</span>
              <span className="text-xs text-slate-400 font-normal">by profit</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts?.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.topProducts.map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{num(p.qty)} sold • {money(p.revenue)}</p>
                    </div>
                    <span className={`font-bold whitespace-nowrap ${profitClass(p.profit)}`}>{money(p.profit)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet this month.</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Running Low</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStock?.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.lowStock.map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{variant(p) || 'Standard'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.quantity === 0 ? 'destructive' : 'warning'}>
                        {p.quantity === 0 ? 'Out' : `${p.quantity} left`}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setRestockProduct(p)}>
                        Restock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">All inventory is well-stocked.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Section: Inventory Valuation & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Value */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock Valuation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Products / Pieces in Stock</span>
              <span className="font-bold text-slate-900 dark:text-white">{num(inv.products)} / {num(inv.units)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Money Tied Up (Cost Value)</span>
              <span className="font-bold text-slate-900 dark:text-white">{money(inv.cost_value)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Retail Worth (List Price)</span>
              <span className="font-bold text-slate-900 dark:text-white">{money(inv.retail_value)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Potential Profit in Inventory</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{money((inv.retail_value || 0) - (inv.cost_value || 0))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Latest Sales */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Sales</CardTitle>
            <Link href="/sales" className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recent?.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recent.map((r: any) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {r.quantity} × {r.product_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{shortDate(r.sold_date)} • {money(r.unit_price)} each</p>
                    </div>
                    <span className={`font-bold whitespace-nowrap ${profitClass(r.profit)}`}>
                      {money(r.profit)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Restock Modal */}
      <RestockModal
        product={restockProduct}
        open={!!restockProduct}
        onOpenChange={(open) => !open && setRestockProduct(null)}
        onSuccess={fetchDashboard}
      />
    </div>
  );
}
