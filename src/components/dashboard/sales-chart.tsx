'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { compact, money, shortDate } from '@/lib/format';

interface ChartItem {
  date?: string;
  label?: string;
  revenue: number;
  cost?: number;
  profit: number;
}

interface SalesChartProps {
  data: ChartItem[];
  showCost?: boolean;
}

export function SalesChart({ data, showCost = false }: SalesChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: d.label || (d.date ? shortDate(d.date) : ''),
  }));

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => compact(val)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as ChartItem;
                return (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg text-xs space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">{item.label || item.date}</p>
                    <p className="text-slate-600 dark:text-slate-400 flex items-center justify-between gap-4">
                      <span>Revenue:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{money(item.revenue)}</span>
                    </p>
                    {showCost && item.cost !== undefined && (
                      <p className="text-amber-600 dark:text-amber-400 flex items-center justify-between gap-4">
                        <span>Cost:</span>
                        <span className="font-mono font-bold">{money(item.cost)}</span>
                      </p>
                    )}
                    <p className="text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-4 font-semibold">
                      <span>Profit:</span>
                      <span className="font-mono font-bold">{money(item.profit)}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {showCost ? (
            <>
              <Bar dataKey="revenue" fill="#0284c7" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cost" />
              <Bar dataKey="profit" fill="#0f766e" radius={[4, 4, 0, 0]} name="Profit" />
            </>
          ) : (
            <>
              <Bar dataKey="revenue" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="profit" fill="#0f766e" radius={[4, 4, 0, 0]} name="Profit" />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
