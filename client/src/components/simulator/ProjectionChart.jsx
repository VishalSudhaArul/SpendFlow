import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartLegend } from '../charts/ChartLegend.jsx';
import { ChartTooltip } from '../charts/ChartTooltip.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { useChartColors } from '../../hooks/useChartColors.js';
import { useMoney } from '../../hooks/useMoney.js';
import { formatMonthKey } from '../../utils/format.js';

/**
 * Projected balance: "with changes" (accent) vs "if nothing changes" (neutral,
 * dashed — it's the reference, not a competing series).
 */
export function ProjectionChart({ projection }) {
  const colors = useChartColors();
  const money = useMoney();
  const [view, setView] = useState('chart');
  const data = projection.map((p) => ({ month: p.month, simulated: p.simulated.balance, baseline: p.baseline.balance, oneTime: p.simulated.oneTime }));
  const legend = [
    { name: 'With changes', color: colors.series[0] },
    { name: 'If nothing changes', color: colors.muted },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChartLegend items={legend} />
        <SegmentedControl
          size="sm"
          label="Display as"
          value={view}
          onChange={setView}
          options={[
            { value: 'chart', label: 'Chart' },
            { value: 'table', label: 'Table' },
          ]}
        />
      </div>
      {view === 'chart' ? (
        <div className="h-64 w-full" role="img" aria-label="Projected balance with and without the changes. Switch to Table for exact values.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="month" tickFormatter={formatMonthKey} tickLine={false} axisLine={{ stroke: colors.border }} tick={{ fill: colors.muted, fontSize: 12 }} minTickGap={16} />
              <YAxis width={60} tickLine={false} axisLine={false} tick={{ fill: colors.muted, fontSize: 12 }} tickFormatter={(v) => money(v, { compact: true })} />
              <ReferenceLine y={0} stroke={colors.danger} strokeDasharray="4 4" />
              <Tooltip
                cursor={{ stroke: colors.muted, strokeDasharray: '3 3' }}
                content={<ChartTooltip formatLabel={formatMonthKey} formatValue={(v) => money(v, { decimals: 0 })} />}
              />
              <Line type="monotone" dataKey="baseline" name="If nothing changes" stroke={colors.muted} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line
                type="monotone"
                dataKey="simulated"
                name="With changes"
                stroke={colors.series[0]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: colors.series[0], stroke: colors.surface, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Projected balance by month</caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="py-2 pr-3 font-semibold">Month</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">One-time</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">With changes</th>
                <th scope="col" className="py-2 pl-2 text-right font-semibold">No changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row.month}>
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{formatMonthKey(row.month)}</th>
                  <td className="tabular px-2 py-2 text-right text-muted">{row.oneTime ? money(row.oneTime, { decimals: 0 }) : '—'}</td>
                  <td className={`tabular px-2 py-2 text-right font-semibold ${row.simulated < 0 ? 'text-danger' : ''}`}>{money(row.simulated, { decimals: 0 })}</td>
                  <td className="tabular py-2 pl-2 text-right text-muted">{money(row.baseline, { decimals: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
