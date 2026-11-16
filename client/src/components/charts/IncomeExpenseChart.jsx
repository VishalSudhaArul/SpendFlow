import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartLegend } from './ChartLegend.jsx';
import { ChartTooltip } from './ChartTooltip.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { useChartColors } from '../../hooks/useChartColors.js';
import { useMoney } from '../../hooks/useMoney.js';

/**
 * Grouped income vs expense bars with a table view.
 * `data`: [{ label key, income, expense, net }], `formatLabel` formats the x key.
 */
export function IncomeExpenseChart({ data, xKey, formatLabel, height = 260, ariaLabel = 'Income and expenses over time' }) {
  const colors = useChartColors();
  const money = useMoney();
  const [view, setView] = useState('chart');
  const series = [
    { key: 'income', name: 'Income', color: colors.series[0] },
    { key: 'expense', name: 'Expenses', color: colors.series[1] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChartLegend items={series} />
        <SegmentedControl
          size="sm"
          label="Display as"
          className="ml-auto"
          value={view}
          onChange={setView}
          options={[
            { value: 'chart', label: 'Chart' },
            { value: 'table', label: 'Table' },
          ]}
        />
      </div>
      {view === 'chart' ? (
        <div style={{ height }} className="w-full" role="img" aria-label={`${ariaLabel}. Switch to Table for exact values.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey={xKey} tickFormatter={formatLabel} tickLine={false} axisLine={{ stroke: colors.border }} tick={{ fill: colors.muted, fontSize: 12 }} minTickGap={12} />
              <YAxis width={56} tickLine={false} axisLine={false} tick={{ fill: colors.muted, fontSize: 12 }} tickFormatter={(v) => money(v, { compact: true })} />
              <Tooltip cursor={{ fill: colors.border, opacity: 0.35 }} content={<ChartTooltip formatLabel={formatLabel} formatValue={(v) => money(v)} />} />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{ariaLabel}</caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="py-2 pr-3 font-semibold">Period</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Income</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Expenses</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row[xKey]}>
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{formatLabel(row[xKey])}</th>
                  <td className="tabular px-3 py-2 text-right">{money(row.income)}</td>
                  <td className="tabular px-3 py-2 text-right">{money(row.expense)}</td>
                  <td className={`tabular py-2 pl-3 text-right font-semibold ${row.net < 0 ? 'text-danger' : ''}`}>{money(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
