import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { useChartColors } from '../../hooks/useChartColors.js';
import { useMoney } from '../../hooks/useMoney.js';
import { formatMonthKey } from '../../utils/format.js';

function BalanceTooltip({ active, payload, money }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-48 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs shadow-card">
      <p className="mb-1.5 font-semibold">{formatMonthKey(row.month)}</p>
      <p className="flex justify-between gap-4 text-muted">Income <span className="tabular text-text">{money(row.income)}</span></p>
      <p className="flex justify-between gap-4 text-muted">Spending <span className="tabular text-text">{money(row.expense)}</span></p>
      <p className="mt-1 flex justify-between gap-4 border-t border-border pt-1 font-semibold">
        Balance <span className="tabular">{money(row.balance)}</span>
      </p>
    </div>
  );
}

/** Projected running balance for the coming months (single series, so no legend). */
export function CashFlowChart({ months }) {
  const colors = useChartColors();
  const money = useMoney();
  const [view, setView] = useState('chart');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
        <div className="h-56 w-full" role="img" aria-label="Projected balance by month. Switch to Table for exact values.">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.series[0]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.series[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="month" tickFormatter={formatMonthKey} tickLine={false} axisLine={{ stroke: colors.border }} tick={{ fill: colors.muted, fontSize: 12 }} />
              <YAxis width={56} tickLine={false} axisLine={false} tick={{ fill: colors.muted, fontSize: 12 }} tickFormatter={(v) => money(v, { compact: true })} />
              <ReferenceLine y={0} stroke={colors.border} />
              <Tooltip cursor={{ stroke: colors.muted, strokeDasharray: '3 3' }} content={<BalanceTooltip money={money} />} />
              <Area
                type="monotone"
                dataKey="balance"
                name="Projected balance"
                stroke={colors.series[0]}
                strokeWidth={2}
                fill="url(#balanceFill)"
                dot={{ r: 4, fill: colors.series[0], stroke: colors.surface, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Projected cash flow</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="py-2 pr-3 font-semibold">Month</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Income</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Spending</th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {months.map((m) => (
              <tr key={m.month}>
                <th scope="row" className="py-2 pr-3 text-left font-medium">{formatMonthKey(m.month)}</th>
                <td className="tabular px-2 py-2 text-right">{money(m.income, { decimals: 0 })}</td>
                <td className="tabular px-2 py-2 text-right">{money(m.expense, { decimals: 0 })}</td>
                <td className="tabular py-2 pl-2 text-right font-semibold">{money(m.balance, { decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
