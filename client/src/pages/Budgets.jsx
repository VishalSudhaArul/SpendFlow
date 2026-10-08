import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Card, Button, Badge, Modal } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

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

export const Budgets = () => {
  const { formatCurrency, symbol } = useCurrency();
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set Budget Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [limitAmount, setLimitAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [isSaving, setIsSaving] = useState(false);

  // AI Recommendation Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/budgets');
      if (res.success) {
        setBudgetData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!limitAmount || Number(limitAmount) <= 0) return;
    setIsSaving(true);
    try {
      const res = await apiFetch('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category: selectedCategory,
          limit: Number(limitAmount),
          alertThreshold: Number(alertThreshold),
        }),
      });
      if (res.success) {
        setIsModalOpen(false);
        setLimitAmount('');
        fetchBudgets();
      }
    } catch (err) {
      alert(err.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget limit?')) return;
    try {
      await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
      fetchBudgets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateAIBudget = async () => {
    setIsGeneratingAI(true);
    setIsAIModalOpen(true);
    try {
      const res = await apiFetch('/budgets/ai-recommend', { method: 'POST' });
      if (res.success) {
        setAiRecommendation(res.recommendation);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApplyAllAIRecommendations = async () => {
    if (!aiRecommendation?.recommendedCategories) return;
    try {
      for (const rec of aiRecommendation.recommendedCategories) {
        await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify({
            category: rec.category,
            limit: rec.limit,
            alertThreshold: 80,
          }),
        });
      }
      setIsAIModalOpen(false);
      fetchBudgets();
    } catch (err) {
      alert('Failed to apply some recommendations');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'Approaching Limit':
        return <Badge variant="warning">Approaching Limit</Badge>;
      case 'Almost Exceeded':
        return <Badge variant="warning">Almost Exceeded</Badge>;
      case 'Exceeded':
        return <Badge variant="danger">Exceeded</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Monthly Budget Planner</h2>
          <p className="text-xs text-slate-400">
            Set discipline caps per category and let AI optimize your 50/30/20 allocation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAIBudget}
            icon={Sparkles}
            className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          >
            Generate My Budget
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
            Set Category Cap
          </Button>
        </div>
      </div>

      {/* Overall Budget Progress Overview */}
      {budgetData && (
        <Card className="glass-panel">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                Total Allocated Monthly Budget
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-100 font-heading">
                  {formatCurrency(budgetData.totalSpentInBudget)}
                </span>
                <span className="text-slate-400 text-sm font-medium">
                  / {formatCurrency(budgetData.totalBudget)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block mb-1">Overall Usage</span>
              <span
                className={`text-xl font-bold font-heading ${
                  budgetData.overallPercentage >= 100
                    ? 'text-rose-400'
                    : budgetData.overallPercentage >= 80
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {budgetData.overallPercentage}%
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetData.overallPercentage >= 100
                  ? 'bg-rose-500'
                  : budgetData.overallPercentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetData.overallPercentage)}%` }}
            />
          </div>
        </Card>
      )}

      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))
        ) : !budgetData?.categories?.length ? (
          <div className="col-span-full">
            <Card className="glass-panel text-center py-12">
              <PiggyBank className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-slate-200">No monthly budgets configured</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Set category limits to prevent overspending and receive smart threshold alerts.
              </p>
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                Add Category Limit
              </Button>
            </Card>
          </div>
        ) : (
          budgetData.categories.map((b) => (
            <Card key={b._id} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-100 text-sm">{b.category}</span>
                  {getStatusBadge(b.status)}
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-lg font-bold text-slate-100 font-heading">
                      {formatCurrency(b.spent)}
                    </span>
                    <span className="text-slate-500 text-xs ml-1">/ {formatCurrency(b.limit)}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-300">{b.percentage}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/80 mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.percentage >= 100
                        ? 'bg-rose-500'
                        : b.percentage >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                <span>
                  {b.remaining > 0
                    ? `${formatCurrency(b.remaining)} remaining`
                    : `${formatCurrency(b.spent - b.limit)} over budget`}
                </span>
                <button
                  onClick={() => handleDeleteBudget(b._id)}
                  className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1"
                  title="Remove limit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Set Category Budget Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Set Category Budget Limit">
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Select Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-slate-200">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Monthly Spending Cap ({symbol})</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">{symbol}</span>
              <input
                type="number"
                required
                min="1"
                placeholder="5000"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-100 font-heading font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Warning Alert Threshold ({alertThreshold}%)
            </label>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Receive a smart notification when spending reaches {alertThreshold}% of this limit.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isSaving}>
              Save Budget Limit
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Budget Recommendation Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title="AI Optimized 50/30/20 Budget Generator"
        maxWidth="max-w-xl"
      >
        {isGeneratingAI ? (
          <div className="py-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Analyzing income & historical spending patterns...</p>
            <p className="text-xs text-slate-500">Creating balanced Needs (50%), Wants (30%), and Savings (20%) plan.</p>
          </div>
        ) : aiRecommendation ? (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-slate-200 text-xs leading-relaxed">
              <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Financial Assessment
              </p>
              {aiRecommendation.rationale}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Needs (50%)</span>
                <span className="font-bold text-slate-100">{formatCurrency(aiRecommendation.needsTotal)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Wants (30%)</span>
                <span className="font-bold text-slate-100">{formatCurrency(aiRecommendation.wantsTotal)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Savings (20%)</span>
                <span className="font-bold text-emerald-400">{formatCurrency(aiRecommendation.savingsTotal)}</span>
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950">
              {aiRecommendation.recommendedCategories?.map((rec, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{rec.category}</span>
                    <Badge variant={rec.type === 'Needs' ? 'info' : rec.type === 'Wants' ? 'purple' : 'success'}>
                      {rec.type}
                    </Badge>
                  </div>
                  <span className="font-bold font-heading text-slate-100">{formatCurrency(rec.limit)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsAIModalOpen(false)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyAllAIRecommendations}
                icon={CheckCircle2}
              >
                Apply All Recommendations
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Budgets;
