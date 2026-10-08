import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Sparkles,
  Upload,
  Download,
  Trash2,
  Edit2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Card, Button, Badge, EmptyState } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

const CATEGORIES = [
  'All',
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

export const Transactions = ({ onOpenQuickNL, onOpenAddTxn, onOpenCSVModal, onEditTxn }) => {
  const { formatCurrency, symbol } = useCurrency();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalItems: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);
      if (type) params.append('type', type);

      const res = await apiFetch(`/transactions?${params.toString()}`);
      if (res.success) {
        setTransactions(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchTransactions(1);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, category, type, sortBy, sortOrder]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      fetchTransactions(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Type', 'Category', 'Merchant', 'Description', 'Amount', 'Payment Method'];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.category,
      `"${t.merchant || ''}"`,
      `"${t.description || ''}"`,
      t.amount,
      t.paymentMethod || 'UPI',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spendflow_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Transactions Ledger</h2>
          <p className="text-xs text-slate-400">Search, filter, categorize, and manage all your cash flows</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onOpenCSVModal} icon={Upload}>
            Import CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCSV} icon={Download}>
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenQuickNL} icon={Sparkles} className="bg-emerald-500/10">
            AI Quick Add
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenAddTxn} icon={Plus}>
            New Entry
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="glass-panel p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search merchant, description, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-slate-200">
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="" className="bg-slate-900 text-slate-200">All Types (Income & Expenses)</option>
            <option value="expense" className="bg-slate-900 text-slate-200">Expenses Only</option>
            <option value="income" className="bg-slate-900 text-slate-200">Income Only</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="date" className="bg-slate-900 text-slate-200">Sort by Date</option>
              <option value="amount" className="bg-slate-900 text-slate-200">Sort by Amount</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="glass-panel p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No entries match your search filters. Try clearing filters or adding an expense."
            actionLabel="Add Expense"
            onAction={onOpenAddTxn}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-6">Date</th>
                  <th className="p-3.5">Merchant / Description</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 pr-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3.5 pl-6 text-slate-400 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        {t.merchant || t.description || t.category}
                        {t.isAnomaly && (
                          <span title={t.anomalyReason || 'Unusual amount'} className="cursor-help">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                      </div>
                      {t.description && t.merchant && (
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                          {t.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="neutral">{t.category}</Badge>
                    </td>
                    <td className="p-3.5 text-slate-400">{t.paymentMethod || 'UPI'}</td>
                    <td className="p-3.5 text-right font-heading font-bold text-sm whitespace-nowrap">
                      <span className={t.type === 'income' ? 'text-emerald-400' : 'text-slate-100'}>
                        {t.type === 'income' ? '+' : '–'}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditTxn?.(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {transactions.length} of {pagination.totalItems} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-900 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Transactions;
