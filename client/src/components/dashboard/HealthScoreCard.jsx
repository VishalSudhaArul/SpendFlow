import { useState } from 'react';
import { ChevronDown, HeartPulse } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { cn } from '../../utils/cn.js';

const GRADES = {
  excellent: { label: 'Excellent', tone: 'text-success', stroke: 'var(--success)' },
  good: { label: 'Good', tone: 'text-success', stroke: 'var(--success)' },
  fair: { label: 'Fair', tone: 'text-warning', stroke: 'var(--warning)' },
  needs_attention: { label: 'Needs attention', tone: 'text-danger', stroke: 'var(--danger)' },
  insufficient_data: { label: 'Not enough data yet', tone: 'text-muted', stroke: 'var(--muted)' },
};

/** Semi-circular gauge. The score is also written out, so the arc is never the only signal. */
function Gauge({ score, stroke }) {
  const radius = 52;
  const circumference = Math.PI * radius;
  const progress = score === null ? 0 : (score / 100) * circumference;
  return (
    <svg viewBox="0 0 128 72" className="w-44" aria-hidden="true">
      <path d="M 12 66 A 52 52 0 0 1 116 66" fill="none" stroke="var(--surface-2)" strokeWidth="10" strokeLinecap="round" />
      <path
        d="M 12 66 A 52 52 0 0 1 116 66"
        fill="none"
        stroke={stroke}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

export function HealthScoreCard({ health }) {
  const [open, setOpen] = useState(false);
  const grade = GRADES[health.grade] ?? GRADES.insufficient_data;
  const tips = health.factors.filter((f) => f.tip && f.points !== null && f.points < f.maxPoints);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <HeartPulse className="size-4 text-accent-ink" aria-hidden="true" />
        Financial health score
      </div>

      <div className="mt-2 flex flex-col items-center">
        <div className="relative">
          <Gauge score={health.score} stroke={grade.stroke} />
          <div className="absolute inset-x-0 bottom-0 text-center">
            <p className="tabular text-4xl leading-none font-extrabold">{health.score ?? '—'}</p>
          </div>
        </div>
        <p className={cn('mt-2 text-sm font-semibold', grade.tone)}>
          {grade.label}
          {health.score !== null && <span className="font-normal text-muted"> · out of 100</span>}
        </p>
      </div>

      {tips[0] && <p className="mt-3 rounded-xl bg-surface-2/70 px-3 py-2 text-xs text-muted">💡 {tips[0].tip}</p>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-accent-ink hover:underline"
      >
        How is this scored?
        <ChevronDown className={cn('size-3.5 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <ul className="mt-3 space-y-3 border-t border-border pt-3">
          {health.factors.map((f) => (
            <li key={f.key} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-text">{f.label}</span>
                <span className="tabular text-muted">{f.points === null ? 'skipped' : `${f.points} / ${f.maxPoints}`}</span>
              </div>
              {f.points !== null && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(f.points / f.maxPoints) * 100}%` }} />
                </div>
              )}
              <p className="mt-1 text-muted">{f.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
