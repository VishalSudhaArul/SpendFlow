import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal, Button, Badge } from './UI';
import apiFetch from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

export const QuickNLAddModal = ({ isOpen, onClose, onTransactionCreated }) => {
  const { formatCurrency } = useCurrency();
  const [promptText, setPromptText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const samplePrompts = [
    'Spent 450 on dinner with friends at Swiggy',
    'Paid 280 for Uber to client meeting',
    'Bought 3200 sneakers from Nike on credit card',
    '1500 monthly electricity bill paid via net banking',
    '649 Netflix premium subscription renew today',
  ];

  const handleExtract = async (textToExtract = promptText) => {
    if (!textToExtract.trim()) return;
    setError('');
    setIsExtracting(true);
    setExtractedData(null);

    try {
      const res = await apiFetch('/transactions/quick-nl-extract', {
        method: 'POST',
        body: JSON.stringify({ text: textToExtract }),
      });

      if (res.success && res.extraction?.data) {
        setExtractedData(res.extraction.data);
      } else {
        setError('Could not parse expense details. Please try rephrasing.');
      }
    } catch (e) {
      setError(e.message || 'AI extraction failed. Please enter details manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!extractedData || !extractedData.amount) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify(extractedData),
      });

      if (res.success) {
        onTransactionCreated?.(res.data);
        handleClose();
      }
    } catch (e) {
      setError(e.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPromptText('');
    setExtractedData(null);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI Natural Language Expense Entry" maxWidth="max-w-xl">
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">
            Speak or type naturally (e.g. "Spent 350 on dinner with friends")
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Swiggy food delivery 450 yesterday using UPI..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          {/* Prompt chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] text-slate-500 self-center">Try:</span>
            {samplePrompts.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPromptText(prompt);
                  handleExtract(prompt);
                }}
                className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/50 transition cursor-pointer"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Extraction Button */}
        {!extractedData && (
          <Button
            variant="primary"
            className="w-full"
            loading={isExtracting}
            onClick={() => handleExtract()}
            disabled={!promptText.trim()}
            icon={Sparkles}
          >
            Extract Details with AI
          </Button>
        )}

        {/* Live Extracted Confirmation Card */}
        {extractedData && (
          <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-4 animate-fade-in shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Badge variant="success">AI Extracted Data</Badge>
                <span className="text-xs text-slate-400">Review before confirming</span>
              </div>
              <button
                onClick={() => setExtractedData(null)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Re-parse
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Amount</span>
                <span className="text-base font-bold text-emerald-400 font-heading">
                  {formatCurrency(extractedData.amount)}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Category</span>
                <span className="font-semibold text-slate-200">{extractedData.category}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Merchant / Place</span>
                <span className="text-slate-200 font-medium">{extractedData.merchant || 'None specified'}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Payment Method</span>
                <span className="text-slate-200">{extractedData.paymentMethod || 'UPI'}</span>
              </div>

              <div className="col-span-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Description</span>
                <span className="text-slate-200">{extractedData.description || promptText}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-1/2"
                onClick={() => setExtractedData(null)}
              >
                Edit / Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="w-1/2"
                loading={isSubmitting}
                onClick={handleConfirmAndSave}
                icon={Check}
              >
                Confirm & Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuickNLAddModal;
