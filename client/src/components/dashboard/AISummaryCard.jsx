import { useState } from 'react';
import { Link } from 'react-router';
import { Lightbulb, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/toast.js';
import { aiService } from '../../services/financeServices.js';
import { todayInputValue } from '../../utils/format.js';

/** AI-written summary of the month (cached once a day on the server). */
export function AISummaryCard() {
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [override, setOverride] = useState(null);
  const summary = useAsync(() => aiService.summary(todayInputValue()), []);
  const data = override ?? summary.data;

  async function refresh() {
    setRefreshing(true);
    try {
      setOverride(await aiService.summary(todayInputValue(), true));
    } catch (error) {
      toast.error('Could not refresh the summary', error.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (summary.error) return null; // the rest of the dashboard still works

  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1 brand-gradient" />
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-accent" aria-hidden="true" />
          {data?.source === 'fallback' ? 'Your month at a glance' : 'AI summary'}
        </p>
        <div className="flex items-center gap-1">
          <Link to="/coach" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            Ask the coach
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || !data}
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-50"
            aria-label="Refresh summary"
            title="Refresh summary"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {!data ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-base font-medium">{data.headline}</p>
          {data.highlights.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {data.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span>{data.tip}</span>
          </p>
          {data.source === 'fallback' && (
            <p className="mt-2 text-xs text-muted">Written from your numbers by SpendFlow (Gemini not connected).</p>
          )}
        </div>
      )}
    </Card>
  );
}
