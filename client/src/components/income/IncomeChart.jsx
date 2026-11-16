import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { ChartTooltip } from '../charts/ChartTooltip.jsx';
import { ChartLegend } from '../charts/ChartLegend.jsx';
import { useChartColors } from '../../hooks/useChartColors.js';
import { useMoney } from '../../hooks/useMoney.js';
import { formatMonthKey } from '../../utils/format.js';

const MAX_SERIES = 4;

/**
 * Stacked monthly income by source. Sources keep a fixed color slot (by total,
 * computed once per data set); beyond 4 sources the rest fold into "Other".
 */
export function IncomeChart({ months }) {
  const colors = useChartColors();
  const money = useMoney();
  const [view, setView] = useState('chart');

  const { rows, series } = useMemo(() => {
    const totals = new Map();
    for (const month of months) {
      for (const [name, value] of Object.entries(month.bySource)) totals.set(name, (totals.get(name) ?? 0) + value);
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const kept = ranked.length > MAX_SERIES ? ranked.slice(0, MAX_SERIES - 1) : ranked;
    const folded = ranked.length > MAX_SERIES;
    const names = folded ? [...kept, 'Other'] : kept;

    const data = months.map((month) => {
      const row = { month: month.month, total: month.total };
      for (const name of names) row[name] = 0;
      for (const [name, value] of Object.entries(month.bySource)) {
        const key = kept.includes(name) ? name : 'Other';
        row[key] += value;
      }
      return row;
    });
    return { rows: data, series: names };
  }, [months]);

  const seriesColors = series.map((name, i) => ({ name, color: colors.series[i] }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChartLegend items={seriesColors} />
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
        <div className="h-64 w-full" role="img" aria-label="Monthly income by source. Switch to Table for exact values.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthKey}
                tickLine={false}
                axisLine={{ stroke: colors.border }}
                tick={{ fill: colors.muted, fontSize: 12 }}
              />
              <YAxis
                width={56}
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.muted, fontSize: 12 }}
                tickFormatter={(v) => money(v, { compact: true })}
              />
              <Tooltip
                cursor={{ fill: colors.border, opacity: 0.35 }}
                content={<ChartTooltip formatLabel={formatMonthKey} formatValue={(v) => money(v)} showTotal />}
              />
              {seriesColors.map(({ name, color }, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  name={name}
                  stackId="income"
                  fill={color}
                  // 2px surface gap between stacked segments; only the top segment gets rounded corners.
                  stroke={colors.surface}
                  strokeWidth={2}
                  radius={i === seriesColors.length - 1 ? [4, 4, 0, 0] : 0}
                  maxBarSize={44}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Monthly income by source</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="py-2 pr-3 font-semibold">Month</th>
                {series.map((name) => (
                  <th key={name} scope="col" className="px-3 py-2 text-right font-semibold">{name}</th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.month}>
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{formatMonthKey(row.month)}</th>
                  {series.map((name) => (
                    <td key={name} className="tabular px-3 py-2 text-right text-muted">{row[name] ? money(row[name]) : '—'}</td>
                  ))}
                  <td className="tabular py-2 pl-3 text-right font-semibold">{money(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
