import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { aiService } from '../../services/financeServices.js';
import { todayInputValue } from '../../utils/format.js';

const EXAMPLES = ['I spent ₹450 on dinner using UPI yesterday', 'Uber to office 230 by credit card', 'Received salary 85000 today'];

/**
 * Step 1 of natural-language entry: the user describes a transaction, the
 * server returns a DRAFT (nothing is saved). `onParsed(draft, source)` hands it
 * to the regular transaction form for review and explicit confirmation.
 */
export function QuickAddModal({ open, onClose, onParsed }) {
  return (
    <Modal open={open} onClose={onClose} title="Quick add with AI" description="Describe it in your own words — you'll review it before anything is saved.">
      <QuickAddForm onClose={onClose} onParsed={onParsed} />
    </Modal>
  );
}

function QuickAddForm({ onClose, onParsed }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (text.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.parseTransaction(text.trim(), todayInputValue());
      onParsed(result.draft, result.source);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="space-y-1.5">
        <label htmlFor="quick-add-text" className="text-sm font-medium">
          What happened?
        </label>
        <textarea
          id="quick-add-text"
          rows={3}
          maxLength={300}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. I spent ₹450 on dinner using UPI yesterday"
          className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" onClick={() => setText(example)} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-text">
            {example}
          </button>
        ))}
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={text.trim().length < 3 || loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
          {loading ? 'Reading…' : 'Preview transaction'}
        </Button>
      </div>
    </form>
  );
}
