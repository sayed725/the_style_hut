import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { todayStr, shortDate, longDate, money, num, pct } from '@/lib/format';
import { PrintControlBar } from '@/components/reports/print-control-bar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    title?: string;
    auto?: string;
  }>;
}

interface CategoryReportRow {
  category: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface SaleRecordRow {
  id: number;
  sold_date: string;
  sold_at: string | Date | null;
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  revenue: number;
  profit: number;
  payment_method: string;
  note?: string;
}

const format12HourTime = (isoString?: string | Date | null) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka',
    });
  } catch {
    return '';
  }
};

export default async function SalesReportPrintPage(props: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tz = process.env.STORE_TZ || 'Asia/Dhaka';
  const today = todayStr(tz);

  const fromRaw = searchParams.from || today;
  const toRaw = searchParams.to || today;
  const from = fromRaw <= toRaw ? fromRaw : toRaw;
  const to = fromRaw <= toRaw ? toRaw : fromRaw;

  const isToday = from === today && to === today;
  const isSingleDay = from === to;

  let reportTitle = searchParams.title;
  if (!reportTitle) {
    if (isToday) {
      reportTitle = 'Daily Sales Report';
    } else if (isSingleDay) {
      reportTitle = `Daily Sales Report (${shortDate(from)})`;
    } else {
      reportTitle = 'Sales Performance Report';
    }
  }

  // 1. Summary Query
  const summarySql = `
    SELECT 
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(s.quantity)::int, 0) AS total_items,
      COALESCE(ROUND(SUM(s.quantity * s.unit_price)::numeric, 2), 0) AS total_revenue,
      COALESCE(ROUND(SUM(s.quantity * s.unit_cost)::numeric, 2), 0) AS total_cost,
      COALESCE(ROUND(SUM(s.quantity * (s.unit_price - s.unit_cost))::numeric, 2), 0) AS total_profit,
      COALESCE(ROUND(SUM(CASE WHEN s.payment_method = 'cash' THEN s.quantity * s.unit_price ELSE 0 END)::numeric, 2), 0) AS cash_total,
      COALESCE(ROUND(SUM(CASE WHEN s.payment_method = 'online' THEN s.quantity * s.unit_price ELSE 0 END)::numeric, 2), 0) AS online_total,
      COALESCE(ROUND(SUM(CASE WHEN s.payment_method = 'due' THEN s.quantity * s.unit_price ELSE 0 END)::numeric, 2), 0) AS due_total
    FROM sales s
    WHERE s.sold_date BETWEEN $1 AND $2
  `;

  // 2. Category Breakdown Query
  const categorySql = `
    SELECT 
      COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized') AS category,
      COALESCE(SUM(s.quantity)::int, 0) AS qty,
      COALESCE(ROUND(SUM(s.quantity * s.unit_price)::numeric, 2), 0) AS revenue,
      COALESCE(ROUND(SUM(s.quantity * s.unit_cost)::numeric, 2), 0) AS cost,
      COALESCE(ROUND(SUM(s.quantity * (s.unit_price - s.unit_cost))::numeric, 2), 0) AS profit
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.sold_date BETWEEN $1 AND $2
    GROUP BY COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized')
    ORDER BY profit DESC, revenue DESC
  `;

  // 3. Transactions / Sales records (up to 500)
  const salesSql = `
    SELECT 
      s.id,
      s.sold_date,
      s.sold_at,
      s.product_name,
      COALESCE(p.category, 'Uncategorized') AS category,
      s.quantity,
      s.unit_price,
      s.unit_cost,
      ROUND((s.quantity * s.unit_price)::numeric, 2) AS revenue,
      ROUND((s.quantity * (s.unit_price - s.unit_cost))::numeric, 2) AS profit,
      s.payment_method,
      COALESCE(s.note, '') AS note
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.sold_date BETWEEN $1 AND $2
    ORDER BY s.sold_date DESC, s.sold_at DESC NULLS LAST, s.id DESC
    LIMIT 500
  `;

  const [summaryRes, categoryRes, salesRes] = await Promise.all([
    query(summarySql, [from, to]),
    query(categorySql, [from, to]),
    query(salesSql, [from, to]),
  ]);

  const summary = summaryRes.rows[0] || {
    total_orders: 0,
    total_items: 0,
    total_revenue: 0,
    total_cost: 0,
    total_profit: 0,
    cash_total: 0,
    online_total: 0,
    due_total: 0,
  };

  const revenue = Number(summary.total_revenue) || 0;
  const cost = Number(summary.total_cost) || 0;
  const profit = Number(summary.total_profit) || 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const cashTotal = Number(summary.cash_total) || 0;
  const onlineTotal = Number(summary.online_total) || 0;
  const dueTotal = Number(summary.due_total) || 0;

  const cashPct = revenue > 0 ? (cashTotal / revenue) * 100 : 0;
  const onlinePct = revenue > 0 ? (onlineTotal / revenue) * 100 : 0;
  const duePct = revenue > 0 ? (dueTotal / revenue) * 100 : 0;

  const categories: CategoryReportRow[] = categoryRes.rows.map((c) => {
    const cRev = Number(c.revenue) || 0;
    const cProf = Number(c.profit) || 0;
    const cMargin = cRev > 0 ? (cProf / cRev) * 100 : 0;
    return {
      category: String(c.category || 'Uncategorized'),
      qty: Number(c.qty) || 0,
      revenue: cRev,
      cost: Number(c.cost) || 0,
      profit: cProf,
      margin: cMargin,
    };
  });

  const salesList = salesRes.rows as SaleRecordRow[];
  const generatedAt = new Date().toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:text-black">
      {/* Top action control bar for screen viewing */}
      <PrintControlBar
        title={reportTitle}
        from={from}
        to={to}
        autoPrint={searchParams.auto === '1' || searchParams.auto === 'true'}
      />

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .report-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* Printable Sheet Wrapper */}
      <div className="py-6 px-3 sm:px-6 print:p-0">
        <div className="report-sheet max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-lg p-6 sm:p-8 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b border-slate-200 pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-6 bg-teal-600 rounded-sm inline-block print:bg-black"></span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 print:text-black uppercase">
                  Cloth Store Manager
                </h1>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
                Official Sales & Profit Statement
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider print:border-black print:text-black print:bg-transparent">
                {reportTitle}
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                {isSingleDay ? longDate(from) : `${longDate(from)} — ${longDate(to)}`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Generated: {generatedAt}
              </p>
            </div>
          </div>

          {/* Key Metric KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 page-break-avoid">
            {/* Total Revenue */}
            <div className="border border-slate-200 bg-slate-50/80 rounded-md p-3 print:bg-transparent print:border-slate-300">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Total Revenue
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 print:text-black mt-0.5">
                {money(revenue)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {num(summary.total_orders)} orders · {num(summary.total_items)} pcs
              </p>
            </div>

            {/* Total Cost */}
            <div className="border border-slate-200 bg-slate-50/80 rounded-md p-3 print:bg-transparent print:border-slate-300">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Purchase Cost
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-700 print:text-black mt-0.5">
                {money(cost)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Cost of sold items
              </p>
            </div>

            {/* Net Profit */}
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-md p-3 print:bg-transparent print:border-slate-300">
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 print:text-black">
                Net Profit
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 print:text-black mt-0.5">
                {money(profit)}
              </p>
              <p className="text-[10px] text-emerald-700/80 print:text-black mt-0.5">
                Revenue minus cost
              </p>
            </div>

            {/* Profit Margin */}
            <div className="border border-teal-200 bg-teal-50/50 rounded-md p-3 print:bg-transparent print:border-slate-300">
              <p className="text-[10px] uppercase font-bold tracking-wider text-teal-800 print:text-black">
                Profit Margin
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-teal-700 print:text-black mt-0.5">
                {pct(margin)}
              </p>
              <p className="text-[10px] text-teal-700/80 print:text-black mt-0.5">
                Margin return rate
              </p>
            </div>
          </div>

          {/* Payment Breakdown Bar */}
          <div className="border border-slate-200 rounded-md p-3.5 mb-6 page-break-avoid bg-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Payment Method Collection Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
              <div className="border-r border-slate-100 last:border-none pr-2">
                <span className="text-[11px] font-semibold text-slate-500 block">Cash</span>
                <span className="text-sm font-bold text-slate-900 print:text-black block">{money(cashTotal)}</span>
                <span className="text-[10px] text-slate-400 font-medium">{pct(cashPct)}</span>
              </div>
              <div className="border-r border-slate-100 last:border-none pr-2">
                <span className="text-[11px] font-semibold text-slate-500 block">Digital / Online</span>
                <span className="text-sm font-bold text-slate-900 print:text-black block">{money(onlineTotal)}</span>
                <span className="text-[10px] text-slate-400 font-medium">{pct(onlinePct)}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Due / Credit</span>
                <span className="text-sm font-bold text-slate-900 print:text-black block">{money(dueTotal)}</span>
                <span className="text-[10px] text-slate-400 font-medium">{pct(duePct)}</span>
              </div>
            </div>
          </div>

          {/* Category Performance Summary */}
          {categories.length > 0 && (
            <div className="mb-6 page-break-avoid">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Performance by Category
                </h3>
                <span className="text-[11px] text-slate-500">
                  {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                </span>
              </div>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] print:bg-slate-200">
                    <tr>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Items Sold</th>
                      <th className="py-2 px-3 text-right">Revenue</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                      <th className="py-2 px-3 text-right">Profit</th>
                      <th className="py-2 px-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {categories.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-3 font-semibold text-slate-900 print:text-black">
                          {c.category}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-600 font-medium">
                          {num(c.qty)}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-900 font-semibold">
                          {money(c.revenue)}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-500">
                          {money(c.cost)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-emerald-700 print:text-black">
                          {money(c.profit)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold text-teal-700 print:text-black">
                          {pct(c.margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-300 print:bg-slate-100 text-[11px]">
                    <tr>
                      <td className="py-2 px-3 text-slate-900">Total</td>
                      <td className="py-2 px-3 text-right text-slate-900">{num(summary.total_items)}</td>
                      <td className="py-2 px-3 text-right text-slate-900">{money(revenue)}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{money(cost)}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 print:text-black">{money(profit)}</td>
                      <td className="py-2 px-3 text-right text-teal-700 print:text-black">{pct(margin)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Transactions List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Itemized Sales Records
              </h3>
              <span className="text-[11px] text-slate-500">
                {salesList.length} {salesList.length === 1 ? 'record' : 'records'}{' '}
                {salesList.length === 500 ? '(Showing first 500)' : ''}
              </span>
            </div>

            {salesList.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-md p-6 text-center text-slate-400 text-xs">
                No sales records found for this selected date period.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] print:bg-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Time / Date</th>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-1.5 text-right">Qty</th>
                      <th className="py-2 px-2 text-right">Cost</th>
                      <th className="py-2 px-2 text-right">Sell</th>
                      <th className="py-2 px-2.5 text-right">Total</th>
                      <th className="py-2 px-2.5 text-right">Profit</th>
                      <th className="py-2 px-2 text-center">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          {format12HourTime(s.sold_at) || s.sold_date}
                          {!isSingleDay && s.sold_at && (
                            <span className="block text-[9px] text-slate-400 font-sans">
                              {shortDate(s.sold_date)}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 font-medium text-slate-900 print:text-black">
                          {s.product_name}
                          {s.note && (
                            <span className="block text-[10px] text-slate-400 italic">
                              Note: {s.note}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500 text-[11px]">
                          {s.category}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-semibold text-slate-800">
                          {num(s.quantity)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-500 font-mono text-[11px]">
                          {money(s.unit_cost)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-700 font-mono text-[11px] font-medium">
                          {money(s.unit_price)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 print:text-black font-mono">
                          {money(s.revenue)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-700 print:text-black font-mono">
                          {money(s.profit)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              s.payment_method === 'cash'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 print:border-none'
                                : s.payment_method === 'online'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200 print:border-none'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 print:border-none'
                            }`}
                          >
                            {s.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
