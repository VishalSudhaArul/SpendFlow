import { useEffect, useMemo, useRef, useState } from 'react';
import { useMoney } from '../../hooks/useMoney.js';
import { formatDate } from '../../utils/format.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const monthName = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });

// One-hue sequential ramp: series-1 mixed into the card surface, so it reads
// correctly (light → dark = less → more) in both themes.
const LEVELS = [
  'var(--surface-2)',
  'color-mix(in srgb, var(--series-1) 28%, var(--surface-2))',
  'color-mix(in srgb, var(--series-1) 50%, var(--surface-2))',
  'color-mix(in srgb, var(--series-1) 75%, var(--surface-2))',
  'var(--series-1)',
];

function levelFor(total, thresholds) {
  if (!total) return 0;
  if (total <= thresholds[0]) return 1;
  if (total <= thresholds[1]) return 2;
  if (total <= thresholds[2]) return 3;
  return 4;
}

/**
 * Calendar heatmap of daily spending (weeks as columns, Monday first).
 * `data` is the /analytics/heatmap response.
 */
export function SpendingHeatmap({ data }) {
  const money = useMoney();
  const [hovered, setHovered] = useState(null);
  const scrollRef = useRef(null);

  const { weeks, months, stats } = useMemo(() => {
    const totals = new Map(data.days.map((d) => [d.date, d]));
    const from = new Date(`${data.from}T00:00:00.000Z`);
    const to = new Date(`${data.to}T00:00:00.000Z`);
    const start = new Date(from.getTime() - ((from.getUTCDay() + 6) % 7) * DAY_MS); // Monday on/before

    const columns = [];
    const monthLabels = [];
    for (let weekStart = start; weekStart <= to; weekStart = new Date(weekStart.getTime() + 7 * DAY_MS)) {
      const days = [];
      for (let i = 0; i < 7; i += 1) {
        const date = new Date(weekStart.getTime() + i * DAY_MS);
        const key = date.toISOString().slice(0, 10);
        const inRange = date >= from && date <= to;
        const entry = totals.get(key);
        days.push({ key, inRange, total: entry?.total ?? 0, count: entry?.count ?? 0 });
      }
      const firstOfMonth = days.find((d) => d.inRange && d.key.endsWith('-01'));
      if (firstOfMonth || columns.length === 0) {
        monthLabels.push({ index: columns.length, label: monthName.format(new Date(`${(firstOfMonth ?? days[0]).key}T00:00:00Z`)) });
      }
      columns.push(days);
    }

    const busiest = [...data.days].sort((a, b) => b.total - a.total)[0];
    const sum = data.days.reduce((s, d) => s + d.total, 0);
    return {
      weeks: columns,
      months: monthLabels,
      stats: {
        activeDays: data.days.length,
        busiest,
        averagePerActiveDay: data.days.length ? sum / data.days.length : 0,
      },
    };
  }, [data]);

  // Open on the most recent weeks; older months are a scroll away.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const cell = 13;
  const gap = 3;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Days with spending</dt>
          <dd className="tabular font-semibold">{stats.activeDays}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Avg per spending day</dt>
          <dd className="tabular font-semibold">{money(stats.averagePerActiveDay, { decimals: 0 })}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Busiest day</dt>
          <dd className="tabular truncate font-semibold">{stats.busiest ? `${money(stats.busiest.total, { decimals: 0 })}` : '—'}</dd>
        </div>
      </dl>

      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={`Daily spending from ${formatDate(data.from)} to ${formatDate(data.to)}. ${stats.activeDays} days with spending; busiest day ${stats.busiest ? `${formatDate(stats.busiest.date)}, ${money(stats.busiest.total)}` : 'none'}.`}
          className="inline-grid"
          style={{ gridTemplateColumns: `28px repeat(${weeks.length}, ${cell}px)`, columnGap: gap, rowGap: gap }}
        >
          <span />
          {weeks.map((_, i) => {
            const label = months.find((m) => m.index === i);
            return (
              <span key={`m${i}`} className="text-[10px] whitespace-nowrap text-muted" style={{ height: 14 }}>
                {label?.label ?? ''}
              </span>
            );
          })}
          {ROW_LABELS.map((rowLabel, row) => (
            <Row key={row} row={row} rowLabel={rowLabel} weeks={weeks} cell={cell} thresholds={data.thresholds} onHover={setHovered} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p aria-live="polite" className="min-h-4">
          {hovered
            ? `${formatDate(hovered.key)}: ${hovered.total ? `${money(hovered.total)} across ${hovered.count} ${hovered.count === 1 ? 'expense' : 'expenses'}` : 'no spending'}`
            : 'Hover over a day for details.'}
        </p>
        <div className="flex items-center gap-1.5">
          Less
          {LEVELS.map((color, i) => (
            <span key={i} className="inline-block rounded-[3px]" style={{ width: 11, height: 11, background: color }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

function Row({ row, rowLabel, weeks, cell, thresholds, onHover }) {
  return (
    <>
      <span className="text-[10px] leading-[13px] text-muted">{rowLabel}</span>
      {weeks.map((days, i) => {
        const day = days[row];
        if (!day.inRange) return <span key={i} style={{ width: cell, height: cell }} />;
        return (
          <span
            key={i}
            onMouseEnter={() => onHover(day)}
            onMouseLeave={() => onHover(null)}
            className="rounded-[3px]"
            style={{ width: cell, height: cell, background: LEVELS[levelFor(day.total, thresholds)] }}
          />
        );
      })}
    </>
  );
}
