import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Catches render errors in a page so one broken screen doesn't blank the
 * whole app. Also handles the common "chunk failed to load" case after a new
 * deploy (the fix is a reload). Reset by changing `resetKey` (the route).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunkError = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(String(error?.message));
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-danger/12 text-danger">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">{chunkError ? 'A new version is available' : 'This page ran into a problem'}</h2>
        <p className="mt-1 text-sm text-muted">
          {chunkError ? 'Reload to get the latest version of SpendFlow.' : 'Your data is safe. Try reloading the page; if it keeps happening, go back to the dashboard.'}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center gap-2 rounded-xl brand-gradient px-4 text-sm font-semibold text-white"
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Reload
          </button>
          {!chunkError && (
            <a href="/" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-2">
              Dashboard
            </a>
          )}
        </div>
      </div>
    );
  }
}
