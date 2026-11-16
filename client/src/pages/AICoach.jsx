import { useEffect, useRef, useState } from 'react';
import { Bot, Info, Loader2, MessageSquarePlus, SendHorizontal, Sparkles, Trash2, UserRound } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { MarkdownText } from '../components/ai/MarkdownText.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/toast.js';
import { aiService } from '../services/financeServices.js';
import { cn } from '../utils/cn.js';

const STARTERS = [
  'Where did most of my money go this month?',
  'How can I save ₹5,000 next month?',
  'Am I spending too much on food?',
  'Can I afford a ₹20,000 purchase?',
];

export default function AICoach() {
  const toast = useToast();
  const status = useAsync(() => aiService.status(), []);
  const [listVersion, setListVersion] = useState(0);
  const list = useAsync(() => aiService.conversations(), [listVersion]);

  const [conversation, setConversation] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null); // the question being answered
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation?.messages?.length, pending]);

  async function openConversation(id) {
    setLoadingConversation(true);
    try {
      setConversation(await aiService.conversation(id));
    } catch (error) {
      toast.error('Could not open conversation', error.message);
    } finally {
      setLoadingConversation(false);
    }
  }

  async function send(text) {
    const message = text.trim();
    if (!message || pending) return;
    setPending(message);
    setInput('');
    try {
      const result = await aiService.chat(message, conversation?.id);
      setConversation(result.conversation);
      setListVersion((v) => v + 1);
    } catch (error) {
      setInput(message);
      toast.error('Could not get an answer', error.message);
    } finally {
      setPending(null);
      inputRef.current?.focus();
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await aiService.removeConversation(toDelete.id);
      if (conversation?.id === toDelete.id) setConversation(null);
      setToDelete(null);
      setListVersion((v) => v + 1);
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Could not delete', error.message);
    } finally {
      setDeleting(false);
    }
  }

  const messages = conversation?.messages ?? [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const followUps = lastAssistant?.suggestedQuestions?.length ? lastAssistant.suggestedQuestions : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] [&>*]:min-w-0">
      {/* Conversation list */}
      <aside className="space-y-3">
        <Button className="w-full" onClick={() => setConversation(null)}>
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          New conversation
        </Button>
        <Card className="p-2">
          <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">History</p>
          {list.error ? (
            <p className="px-2 pb-2 text-sm text-danger">Could not load history.</p>
          ) : !list.data ? (
            <p className="px-2 pb-2 text-sm text-muted">Loading…</p>
          ) : list.data.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-muted">No conversations yet.</p>
          ) : (
            <ul className="max-h-48 space-y-0.5 overflow-y-auto lg:max-h-[60vh]">
              {list.data.map((c) => (
                <li key={c.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    aria-current={conversation?.id === c.id ? 'true' : undefined}
                    className={cn(
                      'min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm',
                      conversation?.id === c.id ? 'bg-accent-soft font-medium' : 'text-muted hover:bg-surface-2 hover:text-text',
                    )}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(c)}
                    className="rounded-lg p-2 text-muted opacity-60 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                    aria-label={`Delete conversation "${c.title}"`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4 text-xs text-muted">
          <p className="flex items-center gap-1.5 font-semibold text-text">
            <Info className="size-3.5" aria-hidden="true" /> How the coach works
          </p>
          <p className="mt-1.5">
            SpendFlow calculates your totals itself and shares only a summary of them with Google Gemini — never your password, email or
            individual transaction notes. The coach is not a licensed financial adviser.
          </p>
        </Card>
      </aside>

      {/* Chat */}
      <Card className="flex min-h-[70vh] flex-col p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl brand-gradient text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">SpendFlow Coach</p>
              <p className="text-xs text-muted">Answers grounded in your own numbers</p>
            </div>
          </div>
          {status.data && (
            <Badge tone={status.data.configured ? 'success' : 'warning'}>{status.data.configured ? 'Gemini connected' : 'Offline mode'}</Badge>
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
          {loadingConversation ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="size-6 animate-spin text-accent" aria-label="Loading conversation" />
            </div>
          ) : messages.length === 0 && !pending ? (
            <Welcome configured={status.data?.configured} onPick={send} />
          ) : (
            <>
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
              {pending && (
                <>
                  <Message message={{ role: 'user', content: pending }} />
                  <div className="flex items-center gap-2 text-sm text-muted" role="status">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Looking at your numbers…
                  </div>
                </>
              )}
            </>
          )}
          <div ref={endRef} />
        </div>

        {followUps && !pending && (
          <div className="flex flex-wrap gap-2 px-4 pb-2 sm:px-5">
            {followUps.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-text">
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-end gap-2 border-t border-border p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="coach-input" className="sr-only">
            Ask the coach
          </label>
          <textarea
            id="coach-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={1000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about your spending, budgets or a purchase…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || Boolean(pending)} aria-label="Send">
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </Card>

      {status.error && <ErrorState error={status.error} onRetry={status.reload} />}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this conversation?"
        description={toDelete ? `"${toDelete.title}" will be permanently deleted.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function Welcome({ configured, onPick }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl brand-gradient text-white shadow-[0_10px_30px_-10px_var(--accent-2)]">
        <Bot className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Ask me about your money</h2>
      <p className="mt-1 text-sm text-muted">
        {configured === false
          ? 'Gemini is not connected, so answers are calculated directly from your data — accurate, but less conversational.'
          : 'I can explain your spending, suggest budgets and check whether a purchase fits your plan.'}
      </p>
      <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
        {STARTERS.map((q) => (
          <button key={q} type="button" onClick={() => onPick(q)} className="rounded-xl border border-border p-3 text-left text-sm hover:border-accent hover:bg-accent-soft">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', isUser ? 'bg-surface-2 text-muted' : 'brand-gradient text-white')}>
        {isUser ? <UserRound className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
      </span>
      <div className={cn('max-w-[85%] rounded-2xl px-4 py-3', isUser ? 'bg-accent text-white' : 'border border-border bg-surface-2/50')}>
        <span className="sr-only">{isUser ? 'You said:' : 'Coach replied:'}</span>
        {isUser ? <p className="text-sm whitespace-pre-wrap">{message.content}</p> : <MarkdownText text={message.content} />}
        {message.note && <p className="mt-2 border-t border-border pt-2 text-xs text-muted">{message.note}</p>}
      </div>
    </div>
  );
}
