import { Bot, CheckCircle2, CircleDashed, Database, KeyRound, RotateCw, Server, XCircle } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/toast.js';
import { systemService } from '../services/systemService.js';

const INTEGRATIONS = [
  { key: 'database', label: 'MongoDB Atlas', hint: 'Set MONGODB_URI in server/.env', icon: Database },
  { key: 'auth', label: 'JWT authentication', hint: 'Set JWT_SECRET in server/.env', icon: KeyRound },
  { key: 'ai', label: 'Google Gemini', hint: 'Set GEMINI_API_KEY in server/.env', icon: Bot },
];

const STATE_VIEW = {
  connected: { label: 'Connected', tone: 'success', icon: CheckCircle2 },
  configured: { label: 'Configured', tone: 'success', icon: CheckCircle2 },
  connecting: { label: 'Connecting', tone: 'accent', icon: CircleDashed },
  disconnected: { label: 'Disconnected', tone: 'danger', icon: XCircle },
  disconnecting: { label: 'Disconnecting', tone: 'warning', icon: CircleDashed },
  not_configured: { label: 'Not configured', tone: 'warning', icon: CircleDashed },
  unknown: { label: 'Unknown', tone: 'neutral', icon: CircleDashed },
};

/**
 * Developer-facing page that checks the real API. It reports only whether each
 * integration is configured, never any secret values.
 */
export default function SystemStatus() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => systemService.getHealth(), []);

  async function handleRecheck() {
    const result = await reload();
    if (result) toast.success('API is reachable', `Responded at ${new Date(result.timestamp).toLocaleTimeString()}`);
    else toast.error('API check failed', 'See the error details on the page.');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="API connection"
          description="Live check against the SpendFlow AI backend."
          action={
            <Button variant="secondary" size="sm" onClick={handleRecheck} loading={loading && Boolean(data || error)}>
              {!(loading && (data || error)) && <RotateCw className="size-4" aria-hidden="true" />}
              Re-check
            </Button>
          }
        />

        {loading && !data && !error && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {error && <ErrorState title="Cannot reach the API" error={error} onRetry={reload} />}

        {data && !error && (
          <dl className="grid gap-4 sm:grid-cols-3">
            <Stat icon={Server} label="Status">
              <Badge tone="success">
                <CheckCircle2 className="size-3.5" aria-hidden="true" /> Online
              </Badge>
            </Stat>
            <Stat label="Environment">
              <span className="font-semibold capitalize">{data.environment}</span>
            </Stat>
            <Stat label="Uptime">
              <span className="tabular font-semibold">{formatUptime(data.uptimeSeconds)}</span>
            </Stat>
          </dl>
        )}
      </Card>

      <Card>
        <CardHeader title="Integrations" description="Each one is configured in a later setup phase." />
        <ul className="divide-y divide-border">
          {INTEGRATIONS.map(({ key, label, hint, icon: Icon }) => {
            const state = data?.integrations?.[key];
            const view = STATE_VIEW[state] ?? STATE_VIEW.unknown;
            const configured = state === 'configured' || state === 'connected';
            return (
              <li key={key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{label}</p>
                  {!configured && <p className="truncate text-sm text-muted">{hint}</p>}
                </div>
                {loading && !data ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <Badge tone={view.tone} className="shrink-0">
                    <view.icon className="size-3.5" aria-hidden="true" />
                    {view.label}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-4">
      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
        {Icon && <Icon className="size-3.5" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
