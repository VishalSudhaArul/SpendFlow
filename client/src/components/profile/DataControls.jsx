import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Alert } from '../ui/Alert.jsx';
import { FormField } from '../ui/FormField.jsx';
import { PasswordInput } from '../ui/PasswordInput.jsx';
import { useAuth } from '../../context/auth.js';
import { useToast } from '../../context/toast.js';
import { authService } from '../../services/authService.js';

/** Export all data, or permanently delete the account. */
export function DataControls() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      await authService.exportData();
      toast.success('Export downloaded', 'A JSON file with all your SpendFlow data.');
    } catch (error) {
      toast.error('Export failed', error.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Your data" description="You own your data. Take a copy or remove it completely." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={exportData} loading={exporting}>
          {!exporting && <Download className="size-4" aria-hidden="true" />}
          Export all data (JSON)
        </Button>
        <Button variant="ghost" className="text-danger hover:bg-danger/8 hover:text-danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete account
        </Button>
      </div>
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <DeleteForm onCancel={() => setDeleteOpen(false)} />
      </Modal>
    </Card>
  );
}

function DeleteForm({ onCancel }) {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password); // reloads onto /welcome
    } catch (err) {
      setError(err.details?.[0]?.message ?? err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>
        This permanently deletes your account and every transaction, budget, goal, bill, subscription and AI conversation. It cannot be
        undone — export your data first if you want a copy.
      </Alert>
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      <FormField label="Your password">
        {(field) => <PasswordInput {...field} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
      </FormField>
      <FormField label='Type "DELETE" to confirm'>
        {(field) => <input {...field} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />}
      </FormField>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Keep my account
        </Button>
        <Button type="submit" variant="danger" loading={busy} disabled={!password || confirm !== 'DELETE'}>
          Delete permanently
        </Button>
      </div>
    </form>
  );
}
