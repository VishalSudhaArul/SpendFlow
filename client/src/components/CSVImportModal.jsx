import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { Modal, Button, Badge } from './UI';
import apiFetch from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

export const CSVImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const { symbol } = useCurrency();
  const [parsedRows, setParsedRows] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setError('CSV file must have a header and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
        const dateIdx = headers.findIndex((h) => h.includes('date'));
        const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('price') || h.includes('cost'));
        const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('title') || h.includes('name'));
        const merchantIdx = headers.findIndex((h) => h.includes('merchant') || h.includes('vendor') || h.includes('store'));
        const catIdx = headers.findIndex((h) => h.includes('cat'));
        const typeIdx = headers.findIndex((h) => h.includes('type'));

        if (amountIdx === -1) {
          setError("CSV must contain an 'amount' column.");
          return;
        }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/["']/g, ''));
          if (cols.length < 2) continue;

          const amountVal = parseFloat(cols[amountIdx]?.replace(/[^0-9.-]+/g, ''));
          if (isNaN(amountVal) || amountVal <= 0) continue;

          rows.push({
            date: dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0],
            amount: amountVal,
            description: descIdx !== -1 ? cols[descIdx] : 'Imported item',
            merchant: merchantIdx !== -1 ? cols[merchantIdx] : '',
            category: catIdx !== -1 && cols[catIdx] ? cols[catIdx] : 'Other',
            type: typeIdx !== -1 && cols[typeIdx]?.toLowerCase().includes('inc') ? 'income' : 'expense',
          });
        }

        if (rows.length === 0) {
          setError('No valid transaction rows found in CSV.');
          return;
        }

        setParsedRows(rows);
      } catch (err) {
        setError('Failed to parse CSV file. Ensure valid comma-separated format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setError('');

    try {
      const res = await apiFetch('/transactions/csv-import', {
        method: 'POST',
        body: JSON.stringify({ rows: parsedRows, skipDuplicates }),
      });

      if (res.success) {
        onImportComplete?.(res.summary);
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Bank / Statement CSV" maxWidth="max-w-2xl">
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Upload Box */}
        {parsedRows.length === 0 ? (
          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center bg-slate-950/60 hover:border-emerald-500/50 transition">
            <input
              type="file"
              accept=".csv"
              id="csv-file-input"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="font-semibold text-slate-200 text-sm">Click to upload statement CSV</span>
              <span className="text-slate-500 text-xs mt-1">Supports standard CSV with Date, Merchant, Amount, Category</span>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-slate-200">{fileName}</span>
                <Badge variant="success">{parsedRows.length} Rows Parsed</Badge>
              </div>
              <button
                onClick={() => setParsedRows([])}
                className="text-xs text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Duplicate Option */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Automatically detect and skip duplicate transactions (same date, merchant, amount)</span>
            </label>

            {/* Preview Table */}
            <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 sticky top-0 text-slate-400">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Merchant / Desc</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {parsedRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="p-2.5 text-slate-400">{r.date}</td>
                      <td className="p-2.5 font-medium text-slate-200">{r.merchant || r.description}</td>
                      <td className="p-2.5">{r.category}</td>
                      <td className="p-2.5 text-right font-semibold text-emerald-400">
                        {symbol}{r.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <div className="p-2 text-center text-slate-500 text-[11px] bg-slate-900/60">
                  + {parsedRows.length - 10} more rows ready for import
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          {parsedRows.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              loading={isImporting}
              onClick={handleImport}
              icon={Check}
            >
              Confirm & Import {parsedRows.length} Transactions
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CSVImportModal;
