import React, { useState, useEffect } from 'react';
import { Modal, Button } from './UI';
import apiFetch from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Rent',
  'Education',
  'Health',
  'Entertainment',
  'Travel',
  'Subscriptions',
  'Personal',
  'Investments',
  'Other',
];

const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Wallet', 'Other'];

export const AddTransactionModal = ({ isOpen, onClose, onTransactionSaved, editTransaction = null }) => {
  const { symbol } = useCurrency();
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Food',
    subcategory: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    description: '',
    paymentMethod: 'UPI',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTransaction) {
      setFormData({
        amount: editTransaction.amount || '',
        type: editTransaction.type || 'expense',
        category: editTransaction.category || 'Food',
        subcategory: editTransaction.subcategory || '',
        date: editTransaction.date ? new Date(editTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        merchant: editTransaction.merchant || '',
        description: editTransaction.description || '',
        paymentMethod: editTransaction.paymentMethod || 'UPI',
        notes: editTransaction.notes || '',
      });
    } else {
      setFormData({
        amount: '',
        type: 'expense',
        category: 'Food',
        subcategory: '',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        description: '',
        paymentMethod: 'UPI',
        notes: '',
      });
    }
  }, [editTransaction, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let res;
      if (editTransaction) {
        res = await apiFetch(`/transactions/${editTransaction._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        res = await apiFetch('/transactions', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      if (res.success) {
        onTransactionSaved?.(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTransaction ? 'Edit Transaction' : 'Record Transaction'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Type Toggle */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'expense' })}
            className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              formData.type === 'expense'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'income' })}
            className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              formData.type === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Income
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Amount ({symbol})</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">{symbol}</span>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-slate-100 font-heading font-semibold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-slate-200">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Merchant & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Merchant / Store</label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Uber, Zara"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Description / Note</label>
          <input
            type="text"
            placeholder="e.g. Team dinner, Grocery restocking"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            {editTransaction ? 'Update Record' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTransactionModal;
