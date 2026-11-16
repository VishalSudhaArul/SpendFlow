/** Shared Recharts tooltip body: values in text ink, a colored swatch carries identity. */
export function ChartTooltip({ active, payload, label, formatLabel, formatValue, showTotal = false }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((entry) => entry.value);
  const total = rows.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  return (
    <div className="min-w-44 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs shadow-card">
      <p className="mb-1.5 font-semibold text-text">{formatLabel ? formatLabel(label) : label}</p>
      {rows.length === 0 && <p className="text-muted">No data</p>}
      <ul className="space-y-1">
        {rows.map((entry) => (
          <li key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="size-2.5 rounded-sm" style={{ background: entry.color }} aria-hidden="true" />
              {entry.name}
            </span>
            <span className="tabular font-semibold text-text">{formatValue(entry.value)}</span>
          </li>
        ))}
      </ul>
      {showTotal && rows.length > 1 && (
        <p className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 font-semibold text-text">
          <span>Total</span>
          <span className="tabular">{formatValue(total)}</span>
        </p>
      )}
    </div>
  );
}
